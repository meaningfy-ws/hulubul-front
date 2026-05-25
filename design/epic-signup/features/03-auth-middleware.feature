# Gherkin behaviour spec — Stage 3 (sessions, middleware, RBAC)

Feature: Authenticated routes, session lifecycle, role-based access
  As a returning user (and as the system)
  I want a long-lived session, route protection, logout, and role checks
  So that authenticated features can be built on top in future epics

  Background:
    Given Stage 1 and Stage 2 are deployed and operational
    And the kill-switch NEXT_PUBLIC_AUTH_ENABLED is "true"
    And Zitadel project has role-assertion ON and roles "user" and "admin" defined

  # ─── Session lifecycle ────────────────────────────────────────────────────

  Scenario: Authenticated callback issues a session cookie
    Given the user clicked an auth button with mode="login"
    When the OIDC round-trip completes successfully
    Then "/api/auth/callback" sets SESSION_COOKIE (HttpOnly, Secure, SameSite=Lax)
    And SESSION_COOKIE is signed with SESSION_COOKIE_SECRET (not AUTH_COOKIE_SECRET)
    And the prefill cookie is not set unless intent was both "prefill" and "login"

  Scenario: Session cookie is valid for ~14 days
    Given a session cookie was issued at time T
    When the user visits a protected route at T + 13 days
    Then the request is authenticated
    But when the user visits at T + 15 days
    Then the cookie is treated as expired and a fresh login is required

  Scenario: Session cookie tamper is rejected
    Given the user has a session cookie whose signature does not verify
    When they visit a protected route
    Then they are redirected to "/api/auth/start?intent=login"
    And the structured log emits event "auth.session.invalid"

  # ─── Route protection ─────────────────────────────────────────────────────

  Scenario: Anonymous visitor to /account is redirected to sign in
    Given no session cookie is present
    When the user visits "/account"
    Then they are redirected (307) to "/api/auth/start?provider=google&intent=login&return_to=/account"

  Scenario: Authenticated visitor to /account is served
    Given a valid session cookie is present
    When the user visits "/account"
    Then the response is 200 and the page shows the session user's email and sub

  Scenario Outline: Public routes remain accessible to anonymous visitors
    Given no session cookie is present
    When the user GETs "<path>"
    Then the response is 200

    Examples:
      | path          |
      | /             |
      | /sitemap.xml  |
      | /robots.txt   |
      | /og           |

  Scenario: Anonymous POST /api/waitlist still works (INV-2)
    Given no session cookie is present
    When the user POSTs a valid body to "/api/waitlist"
    Then the response is 201
    And the Strapi payload contains no Zitadel sub and no session data

  # ─── Logout ───────────────────────────────────────────────────────────────

  Scenario: Logout clears the cookie and ends the Zitadel session
    Given the user is signed in
    When they click "Ieșire" (which calls "/api/auth/logout")
    Then SESSION_COOKIE is cleared (Set-Cookie with Max-Age=0)
    And the user is redirected to Zitadel's end_session_endpoint
    And Zitadel terminates the user's session
    And the user finally lands on "/" signed out

  Scenario: Logout works even if Zitadel end_session is unreachable
    Given Zitadel is unreachable
    When the user clicks "Ieșire"
    Then SESSION_COOKIE is still cleared locally
    And the user lands on "/" signed out (with a bubble noting the partial logout)

  # ─── RBAC ────────────────────────────────────────────────────────────────

  Scenario: User without admin role is denied admin routes
    Given the session user has roles ["user"]
    When they visit "/admin" (if such a route exists)
    Then the response is 403 (or a redirect to a graceful "not authorised" page)

  Scenario: User with admin role is granted admin routes
    Given the session user has roles ["user", "admin"]
    When they visit "/admin"
    Then the response is 200

  Scenario: Missing roles claim is treated as no roles, not an error
    Given the ID token has no project-roles claim
    When hasRole(session, "admin") is called
    Then it returns false (does not throw)

  Scenario: Auth roles and domain roles are never confused
    Given lib/auth-roles.ts exports ROLE_USER and ROLE_ADMIN
    And lib/roles.ts exports WAITLIST_ROLES "expeditor", "transportator", "destinatar"
    When the type-level guard test runs
    Then no symbol name appears in both modules
    And no test imports both modules in the same file (architectural smell)

  # ─── Open-redirect allowlist ──────────────────────────────────────────────

  Scenario Outline: return_to is allowlist-validated
    Given the OIDC flow cookie was set with return_to="<input>"
    When "/api/auth/callback" finishes the login intent
    Then the final redirect target is "<final>"

    Examples:
      | input                       | final     |
      | /account                    | /account  |
      | /account/settings           | /account/settings |
      | /                           | /         |
      | https://evil.example.com    | /         |
      | //evil.example.com          | /         |
      | javascript:alert(1)         | /         |

  # ─── Stage 1 + 2 invariants preserved ─────────────────────────────────────

  Scenario: Stage 1's prefill cookie still works after Stage 3
    Given the user is anonymous (no session cookie)
    When they click "Continuă cu Google" on "/#signup" (mode="prefill")
    Then the existing Stage-1 prefill flow runs unchanged
    And no session cookie is issued

  Scenario: lib/zitadel.ts and lib/prefill-cookie.ts are unchanged
    When the byte-invariance guard test runs
    Then lib/zitadel.ts has not changed since Stage 2 merge
    And lib/prefill-cookie.ts has not changed since Stage 2 merge

  # ─── Kill-switch ──────────────────────────────────────────────────────────

  Scenario: Kill-switch off — auth disabled, but public routes intact
    Given NEXT_PUBLIC_AUTH_ENABLED is "false"
    When an anonymous user visits "/account"
    Then they receive a graceful "feature unavailable" page (not a Zitadel redirect loop)
    And the manual waitlist flow on "/" still works
