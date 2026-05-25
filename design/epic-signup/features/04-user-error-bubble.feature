# Gherkin behaviour spec — Stage 4 (user notification bubble)

Feature: Cross-cutting user-facing notification bubble
  As a visitor receiving a workflow-level outcome from the system
  I want a short, dismissible message in business language
  So that I know what happened without reading the console

  Background:
    Given the user is on any page of the site

  # ─── Store / API ──────────────────────────────────────────────────────────

  Scenario: notify() adds a notification visible immediately
    Given the notify store is empty
    When notify({code: "AUTH_CANCELLED", level: "info", message: "Conectarea cu Google nu a fost finalizată."}) is called
    Then a bubble with that message is rendered on screen
    And it has role="status"

  Scenario: Error-level notifications use role="alert"
    When notify({code: "AUTH_UNREACHABLE", level: "error", message: "..." }) is called
    Then the bubble has role="alert"

  Scenario: Calling notify with the same code twice deduplicates and refreshes TTL
    Given a bubble with code "AUTH_CANCELLED" is visible with 2s remaining
    When notify({code: "AUTH_CANCELLED", ...}) is called again
    Then only one bubble with that code is visible
    And its TTL is reset to the default

  Scenario: TTL auto-dismisses
    Given a bubble was emitted with ttlMs=1000
    When 1100ms pass
    Then the bubble is no longer visible

  Scenario: User dismisses manually
    Given a bubble is visible
    When the user clicks the dismiss button
    Then the bubble is no longer visible

  Scenario: Stack cap at 3
    When 4 notifications with different codes are emitted in quick succession
    Then exactly 3 bubbles are visible
    And the oldest one is the one dropped

  Scenario: clear() removes everything
    Given multiple bubbles are visible
    When clear() is called
    Then no bubbles are visible

  # ─── Server-side guard ────────────────────────────────────────────────────

  Scenario: Calling notify() on the server throws
    Given a Node server-side context (no window)
    When notify(...) is called
    Then it throws NotifyOnServerError with a clear message

  # ─── URL bridge ───────────────────────────────────────────────────────────

  Scenario Outline: ?auth_status URL param surfaces as a bubble
    Given the user lands on "/#signup?auth_status=<code>"
    When the page mounts
    Then a bubble with message matching NOTIFY_CODES["<code>"].message is shown
    And the URL is updated to remove the auth_status param
    And the structured log emits no error

    Examples:
      | code                    |
      | cancelled               |
      | unreachable             |
      | invalid_state           |
      | token_exchange_failed   |
      | token_invalid           |

  Scenario: Unknown auth_status code is ignored, not shown
    Given the user lands on "/#signup?auth_status=mysterious"
    When the page mounts
    Then no bubble is shown
    And logger.warn is called with scope "notify/bridge" and a message naming the unknown code

  # ─── Channel separation (INV-7) ───────────────────────────────────────────

  Scenario: Technical detail goes to logger, not the bubble
    Given an auth callback failure with internal error "JWS signature verification failed: kid=abc123"
    When the callback finishes processing
    Then logger.error is called with the technical detail
    And the user-facing bubble shows only the generic AUTH_GENERIC message
    And the bubble does not contain any token, sub, code, or stack trace

  Scenario: Sensitive data never appears in URL bridge
    When the user lands on the page after any auth flow
    Then the URL params contain only enum-typed status codes
    And no email, name, sub, or token appears in any URL we generate

  # ─── Stage 1 integration ──────────────────────────────────────────────────

  Scenario: Cancelled Google sign-in surfaces via bubble (post-Stage-4)
    Given the user cancelled a Google sign-in
    When they land on "/#signup?auth_status=cancelled"
    Then the bubble shows the cancelled message
    And the inline banner introduced in Stage 1 is no longer present
    And the SignupForm continues to be fully usable
