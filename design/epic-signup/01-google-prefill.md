# Stage 1 — Google prefill via Zitadel

> **Status:** Spec. Implementation gated on review.
> **Date:** 2026-05-25.
> **Prerequisites:** [`00-architecture.md`](./00-architecture.md), [`zitadel-google-runbook.md`](./zitadel-google-runbook.md) (executed; `.env.local` populated; manual round-trip verified).
> **Gherkin scenarios:** [`../../tests/features/auth-01-google-prefill.feature`](../../tests/features/auth-01-google-prefill.feature).
> **Plan:** [`01-google-prefill-plan.md`](./01-google-prefill-plan.md).

## 1. Goal

A visitor to `hulubul.com/#signup` can click **"Continuă cu Google"**, complete Google's consent screen, and return to the same waitlist form with their **email** and **name** already filled in. They then pick their role and submit. The Zitadel user record is created as a side-effect of the round-trip; nothing else is persisted server-side beyond a short-lived prefill cookie.

That is the **entire** stage. No sessions. No protected routes. No logout. No Facebook (Stage 2). No middleware (Stage 3).

## 2. Non-goals

See [`00-architecture.md §7`](./00-architecture.md). Restated for the lazy reader: no MFA, no orgs, no custom domain, no Strapi changes, no `/account` page, no logout button, no Facebook in Stage 1, no E2E tests.

## 3. User-visible flows

### 3.1 Happy path

```
1. Visitor scrolls to #signup. Sees two new buttons above the form:
     [ G  Continuă cu Google ]   (button is enabled only if INV-1 conditions met, see §6)

2. Click → browser navigates to /api/auth/start?provider=google
3. Server: build authorize URL with PKCE+state+nonce, set OIDC_FLOW_COOKIE, 302 to Zitadel.
4. Zitadel: with idp_hint=<google_idp_id>, redirect straight to Google.
5. Google consent screen. User clicks "Continue".
6. Google → Zitadel → /api/auth/callback?code=…&state=…
7. Server: validate state from OIDC_FLOW_COOKIE, exchange code, verify id_token,
   extract {sub, email, email_verified, name, picture, provider},
   write signed PREFILL_COOKIE, delete OIDC_FLOW_COOKIE, 302 to /#signup.
8. Form's parent server component reads PREFILL_COOKIE, passes claims as props,
   deletes the cookie (single-use), renders SignupForm with prefilled fields.
9. User picks role + clicks Submit. Existing waitlist flow runs unchanged.
```

### 3.2 Cancel / failure paths

| Trigger | Outcome |
|---|---|
| User clicks "Cancel" at Google's consent screen | Google redirects to Zitadel with `error=access_denied`; Zitadel redirects to `/api/auth/callback` with same error; callback redirects to `/#signup?auth_status=cancelled`. SignupForm renders normally; notification bubble shows "Conectarea cu Google nu a fost finalizată. Poți completa formularul manual." |
| Zitadel unreachable | `/api/auth/start` returns 503; user lands on `/#signup?auth_status=unreachable`. Bubble shows "Conectarea este temporar indisponibilă. Încearcă din nou sau completează formularul manual." |
| `state` mismatch on callback (CSRF defence) | Callback returns 400 with `auth_status=invalid_state`. Logged as security event. User-facing message identical to the generic "could not complete" case to avoid information leak. |
| Token exchange fails (Zitadel side error) | `auth_status=token_exchange_failed`. Bubble shows generic "could not complete" message. Technical detail in console + observability backend per [INV-4](./00-architecture.md#inv-4--no-pii-in-logs). |
| ID-token signature/claim verification fails | `auth_status=token_invalid`. Same UX as above. Logged as security event. |
| Prefill cookie verification fails on return (tampered, expired, secret rotated) | Cookie silently ignored; form renders empty (falls back to remember-me). No bubble — this is not a user-visible failure. |

### 3.2.bis UX side-effects of a successful prefill

These follow from §3.1 step 8 and exist purely for clarity / non-regression:

- **Auth button hidden:** while the prefill cookie is valid (the SignupForm has `initialPrefill`), `<AuthButtons>` is rendered with `hidden={true}` — re-offering the provider button when the form is already populated would be confusing. The button reappears on the next visit once the prefill cookie expires (10 min TTL) or after a successful waitlist submit.
- **Nav greeting upgrades immediately:** `<Nav>` is an async server component that also reads the prefill cookie (via `lib/server-prefill.ts`); the "Bună, {firstName}" greeting appears on the same render that processes the OIDC callback, *without* a client-side hydration delay. The client-side fallback (`<NavCta>` reading `remember-me`) still kicks in for returning visitors who didn't go through a Google round-trip on this visit. Precedence: prefill > remember-me.

### 3.2.ter Forget-me path

When the user clicks **"Nu ești tu? Șterge."** (the existing button in `SignupForm`):

1. Client clears `remember-me` (localStorage) and resets form state.
2. If a Stage-1 prefill cookie is active, client POSTs `/api/auth/clear-prefill`. The server responds 204 with `Set-Cookie: PREFILL_COOKIE=; Max-Age=0; HttpOnly; SameSite=Lax`.
3. Client triggers `location.reload()`. The async server components (`<Nav>`, `<Signup>`) re-render without the cookie: nav reverts to the CMS CTA, `<AuthButtons>` reappears, form is empty.
4. **Out of scope for Stage 1:** ending the upstream Zitadel/Google session. Zitadel still holds its session for that Google account; clicking "Continuă cu Google" again sees `prompt=select_account` (see §5.1) so the user is shown the picker and can choose a different account. A true sign-out lands with Stage 3 (`design/epic-signup/03-auth-middleware.md`).

### 3.3 Re-entry / "remembered" path

If the user previously submitted the waitlist (with or without Google), `lib/remember-me.ts` has already filled name/email on next visit. **Precedence**:

1. If a *fresh* `PREFILL_COOKIE` exists (this visit included a Google round-trip): use Google claims; ignore remember-me.
2. Otherwise: fall back to `remember-me` cookie as today.

The prefill cookie is **single-use**: read by the server component, then immediately cleared with `Set-Cookie: ...; Max-Age=0`. A reload of `/#signup` without re-doing the Google round-trip falls back to remember-me.

## 4. Files added or modified

### 4.1 New library modules (`lib/`)

```
lib/zitadel.ts                — pure OIDC primitives (INV-3)
lib/prefill-cookie.ts          — sign / verify / set / read / clear the prefill cookie
lib/auth-copy.ts               — keyed Romanian strings (INV-5)
lib/cookies.ts                 — cookie-name constants (INV-5)
lib/auth-providers.ts          — PROVIDER_GOOGLE etc. constants (INV-5)
lib/auth-events.ts             — log-event constants (INV-5)
lib/auth-env.ts                — typed env-var reader with kill-switch helper
lib/server-prefill.ts          — server-only adapter: reads + verifies PREFILL_COOKIE
                                  (used by both Signup and Nav so the read isn't duplicated)
```

### 4.2 New route handlers (`app/api/auth/`)

```
app/api/auth/start/route.ts        — GET ?provider=google → 302 Zitadel
app/api/auth/callback/route.ts     — GET ?code&state → 302 /#signup (+ prefill cookie)
app/api/auth/clear-prefill/route.ts — POST → 204 + Set-Cookie clearing PREFILL_COOKIE
                                       (forget-me; kill-switch aware)
```

### 4.3 New components (`components/landing/`)

```
components/landing/AuthButtons.tsx   — renders the Google button (and later Facebook etc.)
```

### 4.4 Modified components

```
components/landing/SignupForm.tsx
  - accepts optional `initialPrefill?: { email, name, emailVerified, provider }` prop
  - precedence rule: initialPrefill > remember-me
  - renders "verificat prin Google" badge when emailVerified && provider==="google"

components/landing/Signup.tsx (the parent)
  - async server component
  - delegates PREFILL_COOKIE read to lib/server-prefill.ts
  - passes claims to SignupForm
  - mounts <AuthButtons hidden={…} /> above the form (hides the button row
    when a prefill cookie is in play to avoid re-offering the provider after
    a successful round-trip)

components/landing/Nav.tsx
  - becomes async server component
  - reads PREFILL_COOKIE via lib/server-prefill.ts and forwards the first name
    to <NavCta /> via the new `prefilledFirstName` prop
  - lets the "Bună, {firstName}" greeting appear on the very first paint after
    /api/auth/callback redirects, with no hydration flicker

components/landing/NavCta.tsx
  - new optional prop `prefilledFirstName?: string`
  - renders the greeting immediately when present
  - falls back to the existing client-side `readRemembered()` upgrade for
    returning visitors who didn't do a Google round-trip on this visit
  - precedence: prefilledFirstName (this visit) > remember-me (previous visits)

components/landing/AuthButtons.tsx
  - new optional prop `hidden?: boolean` — parent suppresses the button row
    when a prefill cookie is active
  - renders proper Google-styled button with inline G-logo SVG (no remote asset,
    no CSP allow-list needed); CSS lives in app/globals.css under .auth-buttons
```

### 4.5 New env vars

See [`00-architecture.md §4`](./00-architecture.md#4-environment-variables-across-stages) for the complete table. Stage 1 introduces: `ZITADEL_ISSUER`, `ZITADEL_CLIENT_ID`, `ZITADEL_CLIENT_SECRET`, `ZITADEL_IDP_GOOGLE`, `AUTH_REDIRECT_URI`, `AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_AUTH_ENABLED`.

### 4.6 New dependencies

```
openid-client     ^6   — server-side OIDC client
jose              ^5   — JWT/JWS for prefill cookie signing (already an openid-client peer)
```

No client-bundle increase: both are server-only.

### 4.7 Dependency-cruiser rule additions

Add to `.dependency-cruiser.cjs`:

```js
{
  name: 'no-zitadel-in-components',
  comment: 'lib/zitadel.ts must not be imported from UI (INV-3, INV-9)',
  severity: 'error',
  from: { path: '^components/' },
  to:   { path: '^lib/zitadel\\.ts$' },
},
{
  name: 'no-prefill-cookie-in-components',
  comment: 'lib/prefill-cookie.ts must be used only via server-rendering / route handlers (INV-9)',
  severity: 'error',
  from: { path: '^components/.*\\.tsx?$', pathNot: '\\.test\\.' },
  to:   { path: '^lib/prefill-cookie\\.ts$' },
},
```

## 5. Module contracts

### 5.0 Authorize-request `prompt`

`buildAuthStart` unconditionally sets `prompt=select_account` on the authorize URL. Zitadel relays this to the upstream IdP. Rationale: visitors with multiple Google accounts in the browser get the chooser every time, eliminating an entire class of "wrong account" identity-confusion bugs (S1-R3) at the cost of one extra click for the single-account majority — acceptable trade. Asserted in `tests/lib/zitadel.buildAuthStart.test.ts`.

### 5.1 `lib/zitadel.ts`

```ts
export interface ZitadelClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
  provider: AuthProvider;   // PROVIDER_GOOGLE | PROVIDER_FACEBOOK | …
}

export interface AuthStartParams {
  provider: AuthProvider;
  returnTo: string;          // currently always "/#signup"
}

export interface AuthStartResult {
  authorizationUrl: string;
  flowCookieValue: string;   // opaque, signed; contents = {code_verifier,state,nonce,returnTo,createdAt}
}

export interface AuthCallbackParams {
  code: string;
  state: string;
  flowCookieValue: string;
}

export function buildAuthStart(params: AuthStartParams): Promise<AuthStartResult>;
export function completeAuthCallback(params: AuthCallbackParams): Promise<ZitadelClaims>;
```

`completeAuthCallback` performs: state match, code-for-token exchange (with PKCE verifier), ID-token signature verification against JWKS, nonce match, `iss`/`aud`/`exp`/`iat` validation, and claim extraction. Throws a typed `ZitadelAuthError` with a `code` field matching the `auth_status` enum.

### 5.2 `lib/prefill-cookie.ts`

```ts
export interface PrefillPayload {
  email: string;
  name: string;
  emailVerified: boolean;
  provider: AuthProvider;
  iat: number;
}

export function signPrefillCookie(payload: PrefillPayload, secret: string): Promise<string>;
export function verifyPrefillCookie(value: string, secret: string): Promise<PrefillPayload>;
```

Lifetime ≤ 10 minutes (enforced in `iat` check on read). HttpOnly + Secure + SameSite=Lax. Single use.

### 5.3 `lib/auth-env.ts`

```ts
export interface AuthEnv {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  idps: Partial<Record<AuthProvider, string>>;
  redirectUri: string;
  cookieSecret: string;
}

export function readAuthEnv(): AuthEnv;          // throws if disabled or missing required vars
export function isAuthEnabled(): boolean;        // safe; returns false when disabled
```

The kill-switch (INV-8): `readAuthEnv()` throws `AuthDisabledError` if `NEXT_PUBLIC_AUTH_ENABLED !== "true"`. Route handlers catch this and return 404. `AuthButtons` returns `null`.

### 5.4 `lib/auth-copy.ts`

```ts
export const AUTH_COPY = {
  buttonContinueWith: {
    google:   "Continuă cu Google",
    facebook: "Continuă cu Facebook",
    tiktok:   "Continuă cu TikTok",
  },
  verifiedTag: {
    google:   "verificat prin Google",
    facebook: "verificat prin Facebook",
    tiktok:   "verificat prin TikTok",
  },
  notice: {
    cancelled:           "Conectarea cu {provider} nu a fost finalizată. Poți completa formularul manual.",
    unreachable:         "Conectarea este temporar indisponibilă. Încearcă din nou sau completează formularul manual.",
    generic:             "Nu am putut finaliza conectarea. Încearcă din nou sau completează formularul manual.",
  },
} as const;
```

This is the **only** place Romanian auth strings live. Backend CMS spec `backend-spec-auth-copy-fields.md` describes the eventual migration to Strapi-managed copy.

## 6. Acceptance criteria

A pull request implementing Stage 1 is approved when **all** of these are true:

- [ ] All Gherkin scenarios in [`../../tests/features/auth-01-google-prefill.feature`](../../tests/features/auth-01-google-prefill.feature) have at least one passing Vitest test asserting them by name.
- [ ] `npm test` is green and total test count rose by ≥ 25 (rough estimate of new test surface).
- [ ] Coverage targets in [`00-architecture.md §3`](./00-architecture.md#coverage-targets) are met.
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run check:deps` clean, including the two new rules in §4.7.
- [ ] `npm run build` succeeds.
- [ ] Manual smoke test (against the real configured Zitadel tenant) of the happy path + the cancel path is recorded in the PR description.
- [ ] `.env.example` updated; `.env.local` and `.env.cloud` (per environment) updated; the kill-switch (`NEXT_PUBLIC_AUTH_ENABLED=false`) is verified to disable the feature end-to-end with the manual form still working.
- [ ] No occurrences of the strings `"Continuă cu Google"`, `"verificat prin"`, or any cookie name string outside `lib/auth-copy.ts` / `lib/cookies.ts` (grep-able invariant check, encoded as a unit test in `tests/lib/no-free-strings.test.ts`).

## 7. Risk register (Stage-1-specific)

See also [`00-architecture.md §2`](./00-architecture.md#2-architectural-invariants) for cross-cutting risks. Stage-1 specifics:

| ID | Risk | Mitigation |
|---|---|---|
| S1-R1 | OIDC flow cookie hijacked, allowing CSRF auth | HttpOnly+Secure+SameSite=Lax, ≤5min TTL, deleted on callback, state mismatch surfaces as `invalid_state`. |
| S1-R2 | Open redirect via `return_to` query param | Hardcoded to `/#signup`. No user-controlled redirect target. |
| S1-R3 | Email-mismatch identity confusion | Prefill only; user must click Submit and sees the new email visibly. |
| S1-R4 | Spam via throwaway Google accounts | Existing `/api/waitlist` rate limiter unchanged. |
| S1-R5 | CSP `form-action` / `connect-src` blocks Zitadel | Updated as part of this stage. Integration test asserts redirect resolves. |
| S1-R6 | MSW mocks drift from real Zitadel responses | Manual smoke test in PR description + (future) a periodic real-Zitadel discovery doc check. |
| S1-R7 | Regression in existing manual signup flow | TDD: existing-flow tests are written/locked first, then changes are introduced. |
| S1-R8 | Hardcoded Romanian copy needs designer changes | Centralised in `lib/auth-copy.ts`; backend spec exists for CMS migration. |
| S1-R9 | `email_verified === false` shown as "verified" | Badge gated on `emailVerified === true`. Unit test asserts the negative case. |
| S1-R10 | Two-button-row layout breaks the form on mobile | Visual regression covered by component test rendering at narrow viewport; manual mobile check in PR. |
| S1-R11 | Zitadel's IdP callback URL diverges from what's registered at Google Cloud (e.g. Login UI v1 ↔ v2 path shift) | **Detection:** smoke-test the happy path + admin-console login after any tenant change; symptom is universal `Error 400: redirect_uri_mismatch`. **Mitigation:** register **both** v1 (`/ui/login/login/externalidp/callback`) and v2 (`/idps/callback`) URIs in Google's OAuth client. Runbook §3 step 18 and §8 carry the recovery procedure. Observed and fixed during Stage-1 setup of `hulubu0-fddnjo`. |
| S1-R12 | Provider button still visible after a successful Google round-trip, tempting a re-click that re-overwrites the form | `<AuthButtons hidden={true} />` when `initialPrefill` is set in `<Signup>`. Asserted by a Signup component test. |
| S1-R13 | Nav still shows the CTA after Google sign-in until the user reloads | `<Nav>` becomes async server-rendered and reads PREFILL_COOKIE via `lib/server-prefill.ts`; the greeting is emitted on the same render that processes the callback. Asserted by `NavCta` test "shows the prefilled first name immediately on first paint". |

## 8. Out of scope reminders

WhatsApp field — untouched. Logout — Stage 3. `/account` page — Stage 3. RBAC — Stage 3. Facebook — Stage 2. TikTok — Stage 2.

## 9. References

- [`00-architecture.md`](./00-architecture.md) — invariants this stage respects.
- [`zitadel-google-runbook.md`](./zitadel-google-runbook.md) — operator-side setup (run before implementation).
- [`login.md`](./login.md) — the original full-auth epic (Stage 3 will implement what's left of it).
- [`remember-me.md`](./remember-me.md) — the existing identity-prefill mechanism this stage composes with.
- [`../../tests/features/auth-01-google-prefill.feature`](../../tests/features/auth-01-google-prefill.feature) — Gherkin scenarios.
- [`01-google-prefill-plan.md`](./01-google-prefill-plan.md) — TDD implementation steps.
