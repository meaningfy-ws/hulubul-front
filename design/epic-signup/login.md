# EPIC — Signup & Login (Zitadel OIDC, frontend-owned)

> **Status:** Spec only. Not implemented.
> **Date:** 2026-04-23.
> **Scope:** this frontend repo (`hulubul-front`). Zitadel is a separately deployed service (Zitadel Cloud free tier to start; self-host later if needed — see `design/sso-provider-comparison.md`). Strapi is **not touched** by this epic.
> **Architectural pattern:** Option 1 from the IdP discussion — the Next.js frontend is the authentication boundary. Strapi remains unaware of end-users.

## 1. Goal

Let visitors of hulubul.com create an account or sign in so that, in a later epic, they can see personalised content (dashboards, shipment tracking, transporter profiles). This epic delivers *only* the plumbing: account creation, login, logout, session, and the route-protection middleware. It deliberately stops before any authenticated features exist.

## 2. Non-goals (explicit boundaries)

The following are **out of scope** for this epic. Do not build them; they belong to future epics.

- **No MFA / passkeys / WebAuthn.** Zitadel supports them, but we ship email+password + social first and add factors later.
- **No organisations / teams / roles.** Single-user accounts only. Expeditor vs. transporter differentiation is a later epic.
- **No Strapi-side JWT validation.** Strapi continues to read landing-page content with no auth and accept anonymous waitlist submissions. The `waitlist-submission` collection stays anonymous-create even after signup exists.
- **No per-user data in Strapi.** If we ever need "my shipments", it goes into a new Strapi collection *in a separate epic* with its own permission model.
- **No admin-panel SSO for Strapi editors.** That requires Strapi Enterprise Edition (see `design/sso-provider-comparison.md §Admin SSO`).
- **No custom login UI.** We use Zitadel's hosted login page. Branding is applied via Zitadel's theme settings, not by rebuilding the form in Next.js.
- **No Stripe / billing integration.** Separate epic when the product actually charges money.
- **No email / SMS infrastructure of our own.** Zitadel handles verification emails and password-reset emails via its own SMTP settings.
- **No user profile fields beyond Zitadel defaults** (given name, family name, email, phone optionally). Domain-specific profile (e.g. "vehicle type" for transporters) belongs in a future epic, likely stored separately from the identity.
- **No CRM / analytics wiring.** Signup events do *not* push to HubSpot/Mailchimp/etc. in this epic. If that's needed, a later epic adds a webhook consumer.
- **No account deletion UI.** GDPR erasure is triggered via support request until a later epic builds the self-service flow.

## 3. What IS in scope

### 3.1 User-facing flows

1. **Email + password signup.** User enters email, password (twice), first + last name → Zitadel creates the user → Zitadel sends verification email → user clicks link → account is active. Redirected back to hulubul.com signed in.
2. **Social signup/login.** One-click buttons for: **Google**, **Facebook**, **Apple**. (See §11 for why we cap at three to start.) Handled by Zitadel as upstream IdPs; the frontend only redirects to Zitadel.
3. **Email + password login.** Standard login form on Zitadel's hosted page. Redirected back to hulubul.com.
4. **Logout.** User clicks "Ieșire" → frontend clears its session cookie → redirects to Zitadel end-session endpoint → Zitadel terminates its session → user lands on the public homepage signed out.
5. **Password reset.** Self-service via "Am uitat parola" link on Zitadel's login page. Zitadel owns the whole flow (email with reset link, set new password). Frontend doesn't implement anything beyond exposing the link.
6. **Email verification resend.** Same — handled by Zitadel's hosted UI.

### 3.2 Frontend-owned responsibilities

1. An OIDC client in `lib/auth.ts` using **`@auth/core` / `next-auth` v5** with Zitadel as the provider.
2. Session management via encrypted JWT cookie (HTTP-only, `SameSite=Lax`, `Secure` in prod).
3. A `middleware.ts` at the repo root that:
   - Leaves all existing public routes untouched (`/`, `/api/waitlist`).
   - Gates any route under `app/(protected)/*` — 401-redirect to login when no session.
4. An `<AccountMenu />` component in the nav that switches between "Intră în cont" (logged-out state) and "Bună, {firstName}" + "Ieșire" (logged-in state).
5. A stub protected route — `app/(protected)/account/page.tsx` — that shows the user's profile from the session. Placeholder until real authenticated features exist; proves the plumbing works end-to-end.
6. Types for the session user in `lib/types.ts` under `AuthenticatedUser`.
7. **Handshake with the remember-me epic** (`design/epic-signup/remember-me.md`): the Auth.js `signIn` callback MUST call `clearRememberedIdentity()` from `lib/remember-me.ts` on every successful login. This prevents a freshly-signed-in user from seeing stale anonymous prefill on their waitlist/signup fields the next time they visit the landing page. One line in the callback, plus an integration test asserting the call happens.

### 3.3 Zitadel-side responsibilities (configured outside the frontend repo)

Documented here so whoever sets up Zitadel knows what must exist. Not code in this repo; either click through Zitadel admin or manage via Terraform in an infra repo.

1. One **Zitadel Project** named `hulubul`.
2. One **Web Application** inside the project:
   - Auth type: **Code (PKCE)** with client secret.
   - Redirect URIs:
     - `http://localhost:3000/api/auth/callback/zitadel` (dev)
     - `https://hulubul.com/api/auth/callback/zitadel` (prod)
     - Additional hostnames as preview deployments need them.
   - Post-logout redirect URIs:
     - `http://localhost:3000/`
     - `https://hulubul.com/`
   - Access token type: **JWT**.
   - Refresh token: enabled.
   - ID token userinfo: enabled (so `given_name`, `family_name`, `email`, `picture` flow into the session without an extra call).
3. **Login policy**: allow username/password + allow registration + allow external IdPs.
4. **External IdPs** configured on the organisation:
   - Google (ClientID/Secret from Google Cloud Console)
   - Facebook (from Meta Developers)
   - Apple (from Apple Developer + JWT signing key) — optional if Apple Sign-In approval lag is a blocker, ship without it.
5. **Email templates** customised with Romanian copy and hulubul brand (optional polish — English defaults are acceptable for v1).
6. **Domain settings**: for v1 we use Zitadel's default subdomain (`*.zitadel.cloud`) because custom-domain support is a paid Cloud feature. Flagged as a migration risk in §9.

## 4. Architectural recap (Option 1)

```
    Browser
       │
       │  1. GET /account  (no session → redirect)
       ▼
    Next.js middleware  ──401 no session──▶  /api/auth/signin
                                                │
                                                │  2. Auth.js builds auth URL
                                                ▼
                                       Zitadel hosted login page
                                       (email/pwd, Google, Facebook, Apple)
                                                │
                                                │  3. User authenticates upstream
                                                ▼
                                       Zitadel issues code
                                                │
                                                │  4. Redirect back to
                                                ▼
                         /api/auth/callback/zitadel
                         (Auth.js exchanges code for tokens,
                          writes encrypted cookie)
                                                │
                                                ▼
                                 Browser re-requests /account (with cookie)
                                                │
                                                ▼
                                   Next.js renders /account
                                   (reads session via `auth()` server helper)
                                                │
                                                ▼
                                   For any Strapi data it needs:
                                   uses server-side STRAPI_API_TOKEN
                                   (Strapi never sees the user)
```

**Invariant:** no Zitadel token ever leaves the Next.js server. The browser receives an encrypted session cookie only. Strapi never receives a user-bearing token.

## 5. Stories (work breakdown)

Each story is an implementable unit. Execution sequence matters — do not skip ahead.

### STORY 1 — Zitadel instance set up (outside this repo)

**Deliverable:** a Zitadel Cloud instance with the project, application, IdPs, and policies described in §3.3. Client ID, client secret, and issuer URL handed to the frontend dev via a secure channel.

**Acceptance:**
- `curl https://<tenant>.zitadel.cloud/.well-known/openid-configuration` returns a valid OIDC discovery document.
- Clicking "Sign in with Google" on Zitadel's own hosted login page completes end-to-end (inside Zitadel admin, without the frontend).

### STORY 2 — Frontend dependencies + env plumbing

**Deliverable:**
- Add `next-auth@^5` (Auth.js v5) to `package.json`.
- Extend `.env.example`, `.env.cloud`, and the README with the new variables (see §7).
- No code changes yet beyond the env file.

**Acceptance:**
- `npm install` succeeds.
- `npm test` still passes (no regression).
- `tsc --noEmit` clean.

### STORY 3 — Auth.js config + callback route

**Deliverable:**
- `lib/auth.ts` exporting `auth`, `handlers`, `signIn`, `signOut` from Auth.js configured with the Zitadel provider, JWT session strategy, and mapping of ID token claims → session.
- `app/api/auth/[...nextauth]/route.ts` re-exporting the handlers.
- `lib/types.ts` extended with `AuthenticatedUser`.

**Acceptance:**
- Visiting `/api/auth/signin` renders the default Auth.js provider picker → clicking "Zitadel" redirects to Zitadel's hosted login.
- Completing the login cycle lands the user back on `/` with a valid session cookie.
- `auth()` server helper returns a typed user object with `sub`, `email`, `name`, `image`.

### STORY 4 — Route protection middleware

**Deliverable:**
- Root `middleware.ts` protecting `app/(protected)/*` route group and nothing else.
- A `app/(protected)/layout.tsx` that calls `auth()` and guarantees a user is present (belt-and-braces in case middleware is bypassed by cache).

**Acceptance:**
- Anonymous GET `/account` → 307 redirect to `/api/auth/signin?callbackUrl=/account`.
- Authenticated GET `/account` → 200 with the user's name visible on the page.
- Anonymous GET `/` → 200 (public landing page unaffected).
- Anonymous POST `/api/waitlist` with valid body → 201 (public endpoint unaffected).

### STORY 5 — Stub account page

**Deliverable:**
- `app/(protected)/account/page.tsx` displaying email, first name, last name, Zitadel subject (`sub`) — read from the session only. No writes, no Strapi queries.
- Uses the same type tokens + CSS custom properties as the rest of the site.

**Acceptance:**
- Signed-in user visits `/account` → sees their own data.
- Page passes type-check and lints clean.

### STORY 6 — Account menu in nav

**Deliverable:**
- `components/landing/AccountMenu.tsx` (client component).
- When no session: renders "Intră în cont" that triggers `signIn("zitadel")`.
- When session present: renders a small menu with the user's first name and a "Ieșire" button that calls `signOut({ callbackUrl: "/" })`.
- `components/landing/Nav.tsx` includes `<AccountMenu />` alongside the existing CTA.
- The existing "Mă înscriu" CTA still anchors to `#signup` and keeps its current behaviour.

**Acceptance:**
- Visual: both states render without layout shift on desktop and mobile breakpoints.
- Clicking "Ieșire" terminates the session both client-side (cookie cleared) and at Zitadel (end-session endpoint hit).

### STORY 7 — Tests

**Deliverable (Vitest, same TDD style as the rest of the repo):**
- `tests/lib/auth.test.ts` — asserts the Zitadel provider is registered, that required env vars are read, that claims map to the session user correctly. Uses MSW to mock Zitadel's `/.well-known/openid-configuration` + `/oauth/v2/token` + `/oidc/v1/userinfo`.
- `tests/components/AccountMenu.test.tsx` — renders signed-in and signed-out states (session passed via a stubbed `SessionProvider`), asserts the right button shows and click handlers fire.
- `tests/middleware.test.ts` — unit-tests the middleware matcher logic against a set of URL patterns (`/`, `/api/waitlist`, `/account`, `/account/settings`) and asserts which redirect vs. pass through.

**Acceptance:**
- `npm test` passes with the new tests included (expected: existing 30 + new ~10–12 = ~40+ green).
- Coverage on `lib/auth.ts` ≥ 80%.

### STORY 8 — Docs + runbook

**Deliverable:**
- Update `README.md` with a new "Authentication" section pointing at this epic.
- New `docs/runbooks/zitadel-setup.md` describing STORY 1 steps click-by-click, including troubleshooting for the three most common OIDC misconfigurations (wrong redirect URI, clock skew on JWT, missing `openid email profile` scope).
- Mention in `design/sso-provider-comparison.md` that Zitadel was chosen and link back to this epic.

**Acceptance:**
- A new engineer can set up auth from scratch in under 30 minutes using only the runbook + this spec.

## 6. Data flow — cookies and tokens

- **Session cookie:** `__Secure-authjs.session-token` (prod) / `authjs.session-token` (dev). HTTP-only, `SameSite=Lax`, `Secure` in prod, encrypted JWT payload containing `sub`, `email`, `name`, `picture`, `exp`.
- **ID token from Zitadel:** consumed on callback, claims copied into the session cookie, then discarded. The raw ID token is **not** stored on the client.
- **Access token from Zitadel:** similarly consumed and stored **server-side** in the session if refresh is needed. Never exposed to the browser.
- **Refresh token:** stored encrypted in the session cookie; Auth.js refreshes automatically when the access token is close to expiry.
- **Strapi API token (`STRAPI_API_TOKEN`):** unchanged. Stays a server-only env var. Used for anonymous-content reads. Never swapped out for a user token in this epic.

## 7. Environment variables (added in this epic)

| Var | Where | Purpose |
|---|---|---|
| `ZITADEL_ISSUER` | server | Issuer URL, e.g. `https://<tenant>.zitadel.cloud` |
| `ZITADEL_CLIENT_ID` | server | OIDC client ID from the Zitadel application |
| `ZITADEL_CLIENT_SECRET` | server | OIDC client secret (never `NEXT_PUBLIC_`) |
| `AUTH_SECRET` | server | Random 32+ byte base64 secret used by Auth.js to encrypt the session cookie |
| `AUTH_URL` | server | Full app URL, e.g. `https://hulubul.com`; required by Auth.js in prod |

All five go into `.env.cloud` (gitignored) and `.env.example` (with placeholder values). `AUTH_SECRET` is generated via `openssl rand -base64 32` and must be different per environment.

## 8. Security checklist

- Cookies: `HttpOnly`, `Secure` in prod, `SameSite=Lax`.
- CSRF: Auth.js's built-in CSRF protection is left enabled. No custom handling needed.
- Open redirect: the `callbackUrl` parameter on `/api/auth/signin` is validated against the app's own origin only (Auth.js default).
- Clock skew: allow ±120 s between frontend and Zitadel for JWT `iat`/`exp` checks.
- PKCE: required (Auth.js defaults to it for OIDC Code flow).
- Scopes requested: `openid email profile offline_access`. Nothing more; no Zitadel-specific scopes needed for v1.
- Rate limiting: Zitadel's own login page rate-limits. No additional Next.js-side throttling in v1.

## 9. Known risks / decisions deferred

| Risk | Mitigation |
|---|---|
| **Using Zitadel Cloud default subdomain** means the issuer URL changes if we migrate to self-host or to a custom Zitadel Cloud domain. All JWT consumers would need reconfig. | Buy a custom Zitadel Cloud domain (`auth.hulubul.com`) as soon as traffic justifies the paid tier — ideally before real users register passkeys (future epic). Until then, accept a one-time forced re-login at migration. |
| **Apple Sign-In approval** from Apple Developer can take 1–2 weeks. | Ship v1 with Google + Facebook only; add Apple when approved. Social button set is driven by Zitadel IdP config, not hard-coded in the frontend — zero code change when Apple is enabled. |
| **Zitadel Cloud free tier limits** (25k MAU, 10k auth req/mo). | Monitor from the start. Upgrade plan or self-host before hitting caps. |
| **Romanian email templates** require Zitadel admin work not captured in code. | Documented in `docs/runbooks/zitadel-setup.md` as manual steps. |
| **No MFA in v1** means a compromised password grants access. | Acceptable for pre-launch; add MFA epic before we store anything sensitive (shipment details, payment info). |

## 10. Acceptance criteria for the epic

- [ ] A new user can sign up with email+password via Zitadel's hosted page and returns signed-in.
- [ ] A new user can sign up with Google in a single redirect chain.
- [ ] A new user can sign up with Facebook in a single redirect chain.
- [ ] An existing user can log in via any of the above.
- [ ] A logged-in user sees their name in the nav and can reach `/account`.
- [ ] A logged-out user visiting `/account` is redirected to login and, after authenticating, lands back on `/account`.
- [ ] Logout terminates the session both client-side and at Zitadel.
- [ ] Password reset works end-to-end (user never leaves Zitadel's flow, returns to app signed in).
- [ ] Anonymous visitors can still read the landing page and submit the waitlist form — no regression.
- [ ] Full test suite green, typecheck clean, production build passes.

## 11. Why only three social providers to start

`design/sso-provider-comparison.md §Important up-front caveats` covers the nuance: WhatsApp login doesn't exist, Instagram is really Facebook-with-scopes, TikTok works but adds a developer-account approval step. For a pre-launch landing page, Google + Facebook + Apple gives >95% coverage for the diaspora target audience without committing to approval timelines or low-value connectors. More can be added in Zitadel admin without code changes.

## 12. Out of scope — followup epics (named, not specced)

- **EPIC — MFA & passkeys**: add TOTP + WebAuthn factors via Zitadel policy; gate sensitive actions behind step-up.
- **EPIC — Transporter onboarding**: authenticated flow for verifying transporter accounts (ID upload, vehicle info, vetting). Introduces the per-user data model in Strapi — this is when we revisit Option 2 (Strapi validates JWTs).
- **EPIC — Expeditor dashboard**: "my shipments" views, messaging with transporters.
- **EPIC — Admin SSO**: separate, only when we have a Strapi Enterprise licence.
- **EPIC — Billing & Stripe integration**: separate; reads plan from Zitadel metadata.
- **EPIC — Account self-service**: change email, change password, delete account, export data (GDPR).

## 13. References

- `design/sso-provider-comparison.md` — why Zitadel was selected.
- `docs/specs/2026-04-23-hulubul-frontend-design.md` — overall frontend architecture this epic extends.
- Auth.js (next-auth v5) docs: authjs.dev
- Zitadel OIDC docs: zitadel.com/docs/apis/openidoauth/authn-methods
- Zitadel Terraform provider: registry.terraform.io/providers/zitadel/zitadel

---

*End of EPIC. Implementation begins when this spec is approved and STORY 1 (Zitadel instance) is ready.*
