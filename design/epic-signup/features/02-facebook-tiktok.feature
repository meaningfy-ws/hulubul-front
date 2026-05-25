# Gherkin behaviour spec — Stage 2 (Facebook + TikTok)

Feature: Add more upstream identity providers without changing auth machinery
  As a visitor with a Facebook or TikTok account
  I want the same one-click prefill experience as Google users
  So that I am not forced to type my email and name

  Background:
    Given Stage 1 (Google) is deployed and operational
    And the kill-switch NEXT_PUBLIC_AUTH_ENABLED is "true"

  # ─── Facebook ──────────────────────────────────────────────────────────────

  Scenario: Facebook button appears when its IdP env is set
    Given ZITADEL_IDP_FACEBOOK is set to a valid IdP id
    When the user visits "/#signup"
    Then "Continuă cu Facebook" is rendered

  Scenario: Facebook prefill happy path
    Given the user clicks "Continuă cu Facebook"
    And the user consents at Facebook's screen
    And Zitadel issues an ID token with provider="facebook", email_verified=true, email="alice@example.com", name="Alice Doe"
    When the user returns to "/#signup"
    Then the email and name fields are prefilled
    And the tag "verificat prin Facebook" is shown

  Scenario: Facebook cancel path mirrors Google cancel path
    Given the user clicks "Continuă cu Facebook"
    When the user cancels at Facebook's consent screen
    Then the user lands on "/#signup?auth_status=cancelled"
    And the bubble shows the cancelled message (with provider="Facebook")

  Scenario: With Facebook env unset, only Google button renders
    Given ZITADEL_IDP_FACEBOOK is unset
    When the user visits "/#signup"
    Then "Continuă cu Facebook" is not rendered

  # ─── TikTok (only if spike result is GO or CONDITIONAL) ────────────────────

  Scenario: TikTok button appears when its IdP env is set
    Given ZITADEL_IDP_TIKTOK is set to a valid IdP id
    When the user visits "/#signup"
    Then "Continuă cu TikTok" is rendered

  Scenario: TikTok prefill happy path (GO)
    Given the TikTok ID token includes email_verified=true and email="charlie@example.com"
    When the user returns to "/#signup"
    Then the email and name fields are prefilled
    And the tag "verificat prin TikTok" is shown

  Scenario: TikTok prefill degraded (CONDITIONAL — no email in token)
    Given the TikTok ID token has name="Charlie Doe" but no email claim
    When the user returns to "/#signup"
    Then the name field is prefilled
    And the email field remains empty and editable
    And no "verificat prin" tag is shown
    And the structured log emits event "auth.callback.success.no_email"

  # ─── Architecture invariants ───────────────────────────────────────────────

  Scenario: Stage 1 modules are unchanged
    When the byte-invariance guard test runs
    Then lib/zitadel.ts has not changed since Stage 1 merge
    And lib/prefill-cookie.ts has not changed since Stage 1 merge
    And app/api/auth/start/route.ts has not changed since Stage 1 merge
    And app/api/auth/callback/route.ts has not changed since Stage 1 merge

  Scenario: Adding a third provider is config + UI only
    Given a hypothetical fourth provider's env var ZITADEL_IDP_<X> is set
    And PROVIDER_<X> exists in lib/auth-providers.ts
    And lib/auth-copy.ts has copy keys for <X>
    When the user visits "/#signup"
    Then the <X> button is rendered with no other code change required

  # ─── Kill-switch still applies ─────────────────────────────────────────────

  Scenario: Kill-switch disables all providers, not just Google
    Given NEXT_PUBLIC_AUTH_ENABLED is "false"
    And ZITADEL_IDP_FACEBOOK and ZITADEL_IDP_TIKTOK are set
    When the user visits "/#signup"
    Then no auth buttons are rendered
    And all "/api/auth/*" routes return 404
