# Gherkin behaviour spec — Stage 1 (Google prefill)
# Pair this file with Vitest tests in `tests/api/`, `tests/components/`, `tests/lib/`.
# Each Scenario maps to one or more Vitest tests; the test's `describe` / `it` text
# should mirror "Given … When … Then …" so the link is traceable by grep.

Feature: Google prefill on the waitlist signup form
  As a visitor who already has a Google account
  I want a one-click button that fills in my email and name on the waitlist form
  So that I spend less time typing and Hulubul can identify me uniquely if I return

  Background:
    Given the kill-switch NEXT_PUBLIC_AUTH_ENABLED is "true"
    And ZITADEL_IDP_GOOGLE is configured with a valid IdP id
    And the user has accepted the GDPR cookie consent

  # ─── Happy paths ───────────────────────────────────────────────────────────

  Scenario: First-time Google sign-in prefills the waitlist form
    Given the user has never visited the site before
    And the user is on "/#signup"
    When the user clicks "Continuă cu Google"
    And the user consents at Google's screen
    And Zitadel issues an ID token with email_verified=true, email="alice@example.com", name="Alice Doe"
    Then the user is redirected back to "/#signup"
    And the email field is prefilled with "alice@example.com" and is read-only
    And the name field is prefilled with "Alice Doe" and is editable
    And the tag "verificat prin Google" is visible next to the email field
    And the role picker is empty
    And the submit button is disabled until a role is selected

  Scenario: After successful submit, remember-me captures the identity
    Given the user just completed Google prefill with email="bob@example.com" and name="Bob Roe"
    When the user picks role "expeditor"
    And the user clicks Submit
    Then the waitlist POST contains email="bob@example.com", name="Bob Roe", role="expeditor"
    And no Zitadel sub is sent to the waitlist endpoint
    And the remember-me cookie is updated with the new identity
    And the next visit to "/#signup" without re-doing Google flow prefills name and email from remember-me

  Scenario: Returning user without fresh Google flow falls back to remember-me
    Given the remember-me cookie contains email="alice@example.com" and name="Alice Doe"
    And the prefill cookie is absent
    When the user visits "/#signup"
    Then the email and name fields are prefilled from remember-me
    And no "verificat prin" tag is shown

  Scenario: Prefill cookie wins over remember-me on the same visit
    Given the remember-me cookie contains email="old@example.com" and name="Old Name"
    And the user has just completed Google sign-in with email="new@example.com" and name="New Name"
    When the user lands on "/#signup"
    Then the email field shows "new@example.com"
    And the name field shows "New Name"

  Scenario: Prefill cookie is consumed once and cleared
    Given a valid prefill cookie is set in the user's browser
    When the user visits "/#signup"
    Then the response includes a Set-Cookie header that clears the prefill cookie
    And a subsequent reload of "/#signup" without a new Google flow falls back to remember-me or empty fields

  # ─── Negative paths — user-initiated ──────────────────────────────────────

  Scenario: User cancels at Google's consent screen
    Given the user is on "/#signup" and clicked "Continuă cu Google"
    When the user clicks "Cancel" at Google's consent screen
    Then Zitadel redirects to "/api/auth/callback?error=access_denied"
    And the callback redirects to "/#signup?auth_status=cancelled"
    And the form is rendered empty (or with remember-me values if present)
    And the user-notification bubble shows the cancelled message
    And no prefill cookie is set

  Scenario: User reloads "/#signup?auth_status=cancelled" after dismissing the bubble
    Given the user previously cancelled and the bubble was shown
    When the user reloads "/#signup"
    Then the bubble is not shown again
    And the URL no longer contains "auth_status=cancelled"

  # ─── Negative paths — system-initiated ────────────────────────────────────

  Scenario: Zitadel is unreachable when starting auth
    Given Zitadel's discovery endpoint is unreachable
    When the user clicks "Continuă cu Google"
    Then "/api/auth/start" responds with 503
    And the user is redirected to "/#signup?auth_status=unreachable"
    And the bubble shows the unreachable message
    And no flow cookie is set

  Scenario Outline: Callback fails with a security or protocol error
    Given the user just returned from Zitadel with <condition>
    When "/api/auth/callback" processes the request
    Then the response is a 302 to "/#signup?auth_status=<status>"
    And the structured log emits event "auth.callback.failed" with code "<status>"
    And no PII (email, name, sub) appears in the log
    And no prefill cookie is set

    Examples:
      | condition                                                | status                  |
      | a state value that does not match the flow cookie        | invalid_state           |
      | a missing or expired flow cookie                          | invalid_state           |
      | Zitadel returning an error from /oauth/v2/token           | token_exchange_failed   |
      | an ID token whose signature does not verify against JWKS  | token_invalid           |
      | an ID token whose nonce does not match the flow cookie    | token_invalid           |
      | an ID token whose iss claim does not equal the issuer     | token_invalid           |
      | an ID token whose aud does not include the client_id      | token_invalid           |
      | an ID token whose exp is in the past (beyond 2s skew)     | token_invalid           |

  Scenario: ID token returns email_verified=false
    Given the user completed Google sign-in
    And the ID token has email_verified=false
    When the user returns to "/#signup"
    Then the email field is prefilled
    But the "verificat prin Google" tag is not shown
    And the structured log emits event "auth.callback.success.unverified"

  # ─── Negative paths — tampering / abuse ───────────────────────────────────

  Scenario: Tampered prefill cookie is silently ignored
    Given the prefill cookie's signature does not verify against AUTH_COOKIE_SECRET
    When the user visits "/#signup"
    Then the cookie is treated as absent
    And the form falls back to remember-me or empty
    And the structured log emits event "auth.prefill.invalid"
    And no error is shown to the user

  Scenario: Expired prefill cookie is silently ignored
    Given the prefill cookie's iat is older than 10 minutes
    When the user visits "/#signup"
    Then the cookie is treated as absent
    And the form falls back to remember-me or empty

  Scenario: Open-redirect attempt via return_to is rejected
    Given an attacker constructs "/api/auth/start?provider=google&return_to=https://evil.example.com"
    When "/api/auth/start" processes the request
    Then the return_to parameter is ignored
    And the flow proceeds with the hardcoded "/#signup" target

  # ─── Kill-switch (INV-8) ───────────────────────────────────────────────────

  Scenario: Kill-switch off — buttons hidden, routes 404
    Given NEXT_PUBLIC_AUTH_ENABLED is "false"
    When the user visits "/#signup"
    Then "Continuă cu Google" is not rendered
    And a GET to "/api/auth/start?provider=google" returns 404
    And a GET to "/api/auth/callback" returns 404
    And the manual waitlist submission flow still works end-to-end

  # ─── Provider gating ──────────────────────────────────────────────────────

  Scenario: Facebook button is hidden in Stage 1
    Given ZITADEL_IDP_FACEBOOK is unset
    When the user visits "/#signup"
    Then "Continuă cu Facebook" is not rendered

  # ─── Regression guards for existing behaviour ─────────────────────────────

  Scenario: Manual signup flow remains unchanged
    Given the user does not click any Google button
    When the user types name, email, role and submits
    Then the waitlist POST has the same body shape as before this epic
    And no Zitadel-related fields are present in the payload

  Scenario: WhatsApp field is preserved and never prefilled by Google
    Given a Google prefill has just occurred
    When the form renders
    Then the WhatsApp field is empty and editable
    And the field's label, placeholder, and validation rules match the existing UX

  # ─── Observability ────────────────────────────────────────────────────────

  Scenario Outline: Structured logging emits per phase without PII
    When the auth flow reaches phase "<phase>"
    Then a structured log entry is emitted with event "<event>"
    And the entry contains keys "provider", "request_id", "latency_ms"
    And the entry contains no keys whose value is the user's email, name, sub, code, state, or any token

    Examples:
      | phase           | event                   |
      | start           | auth.start.requested    |
      | callback ok     | auth.callback.success   |
      | callback fail   | auth.callback.failed    |
      | prefill consume | auth.prefill.consumed   |
      | prefill invalid | auth.prefill.invalid    |
