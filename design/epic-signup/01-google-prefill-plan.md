# Stage 1 — Implementation plan (TDD)

> **Pairs with:** [`01-google-prefill.md`](./01-google-prefill.md), [`../../tests/features/auth-01-google-prefill.feature`](../../tests/features/auth-01-google-prefill.feature).
> **Discipline:** strict red → green → refactor per test file. One commit per step. Reference the Gherkin scenario in the commit message.
> **Prerequisite:** runbook executed, `.env.local` populated, manual round-trip succeeded.

## Conventions for every step

- **Red:** write the failing test first. Run `npm test -- <pattern>` to confirm red.
- **Green:** minimum code to pass.
- **Refactor:** only after green. Re-run tests.
- **Commit:** `feat(auth-s1, step N): <scenario id>` or `test(auth-s1, step N): …`.
- **Gherkin link:** at the top of each test file, comment `// Implements scenarios: <names>` from `../../tests/features/auth-01-google-prefill.feature`.

## Step 0 — Regression guard for the existing manual flow

Lock current behaviour before changing anything.

- **Red:** Add `tests/components/SignupForm.manual-flow.regression.test.tsx` asserting today's submit payload shape and remember-me write. Should pass immediately (it codifies current behaviour).
- **Green:** Nothing — it already passes.
- **Commit:** `test(auth-s1, step 0): lock manual signup regression`

## Step 1 — Constants & env reader

Files: `lib/cookies.ts`, `lib/auth-providers.ts`, `lib/auth-events.ts`, `lib/auth-env.ts`.
Tests: `tests/lib/auth-env.test.ts`, `tests/lib/no-free-strings.test.ts`.

- **Red:** Unit tests cover: `readAuthEnv` throws `AuthDisabledError` when `NEXT_PUBLIC_AUTH_ENABLED !== "true"`; throws `MissingAuthEnvError` listing missing keys; returns a fully-typed `AuthEnv` on the happy path; `isAuthEnabled()` is safe (never throws). Free-strings test greps `components/**` and `app/api/auth/**` for forbidden literals.
- **Green:** Implement modules.
- **Commit:** `feat(auth-s1, step 1): env reader and naming constants`

## Step 2 — Prefill cookie (sign/verify)

Files: `lib/prefill-cookie.ts`. Tests: `tests/lib/prefill-cookie.test.ts`.

- **Red:** Round-trip sign → verify returns same payload; tampered payload rejects; wrong secret rejects; payload older than 10 min rejects; missing fields reject; `iat` is set by the signer.
- **Green:** Implement using `jose` `SignJWT` / `jwtVerify` with HS256.
- **Commit:** `feat(auth-s1, step 2): prefill-cookie sign/verify`

## Step 3 — Romanian copy module

Files: `lib/auth-copy.ts`. Tests: `tests/lib/auth-copy.test.ts`.

- **Red:** Keyed lookups return non-empty strings for known providers; `{provider}` placeholder interpolation works.
- **Green:** Implement.
- **Commit:** `feat(auth-s1, step 3): auth copy constants`

## Step 4 — `lib/zitadel.ts` — `buildAuthStart`

Tests: `tests/lib/zitadel.buildAuthStart.test.ts` (MSW for discovery).

- **Red:** Returns an authorization URL containing `client_id`, `response_type=code`, `scope=openid email profile`, `code_challenge`, `code_challenge_method=S256`, `state`, `nonce`, `redirect_uri`, and `idp_hint=<google>`; `flowCookieValue` is a signed JWT decoding to `{code_verifier, state, nonce, returnTo, createdAt}`; unsupported provider throws.
- **Green:** Implement via `openid-client` discovery + state/nonce/code_verifier generation + sign flow cookie with `jose`.
- **Commit:** `feat(auth-s1, step 4): zitadel.buildAuthStart`

## Step 5 — `lib/zitadel.ts` — `completeAuthCallback`

Tests: `tests/lib/zitadel.completeAuthCallback.test.ts` (MSW for token + JWKS).

- **Red:** Happy path returns full `ZitadelClaims`. Negative cases (all map to typed `ZitadelAuthError`): state mismatch → `invalid_state`; missing/expired flow cookie → `invalid_state`; token endpoint returns error → `token_exchange_failed`; signature invalid → `token_invalid`; nonce mismatch → `token_invalid`; bad `iss` / `aud` / `exp` → `token_invalid`; `email_verified` propagated correctly.
- **Green:** Implement.
- **Commit:** `feat(auth-s1, step 5): zitadel.completeAuthCallback`

## Step 6 — Route handler: `/api/auth/start`

Files: `app/api/auth/start/route.ts`. Tests: `tests/api/auth-start.test.ts`.

- **Red:** Kill-switch off → 404; unsupported provider → 400; happy path → 302 to Zitadel authorize URL + `Set-Cookie` for `OIDC_FLOW_COOKIE` (HttpOnly, Secure, SameSite=Lax, ≤5min); Zitadel unreachable (discovery 500) → 503 with `?auth_status=unreachable` redirect.
- **Green:** Implement.
- **Commit:** `feat(auth-s1, step 6): /api/auth/start route`

## Step 7 — Route handler: `/api/auth/callback`

Files: `app/api/auth/callback/route.ts`. Tests: `tests/api/auth-callback.test.ts`.

- **Red:** Kill-switch off → 404; `error=access_denied` → 302 `/#signup?auth_status=cancelled`, no prefill cookie; happy path → 302 `/#signup` + `Set-Cookie` PREFILL_COOKIE + `Set-Cookie` clearing OIDC_FLOW_COOKIE; each `ZitadelAuthError.code` mapped to the right `auth_status`; ignores `return_to` query param (open-redirect guard).
- **Green:** Implement.
- **Commit:** `feat(auth-s1, step 7): /api/auth/callback route`

## Step 8 — `<AuthButtons />` component

Files: `components/landing/AuthButtons.tsx`. Tests: `tests/components/AuthButtons.test.tsx`.

- **Red:** Kill-switch off → renders null; Google IdP env set → renders Google button with link to `/api/auth/start?provider=google`; Facebook IdP env unset → no Facebook button; button copy from `lib/auth-copy.ts`.
- **Green:** Implement (server component, no client JS — it's just `<a>` tags).
- **Commit:** `feat(auth-s1, step 8): AuthButtons component`

## Step 9 — `<SignupForm />` prefill prop

Files: modify `components/landing/SignupForm.tsx`. Tests: extend `tests/components/SignupForm.test.tsx`.

- **Red:** New optional `initialPrefill` prop overrides remember-me; "verificat prin Google" tag visible iff `emailVerified && provider==="google"`; email field marked `readOnly` when prefill present; manual flow unchanged when prop absent (regression guarded by Step 0).
- **Green:** Add prop and precedence logic.
- **Commit:** `feat(auth-s1, step 9): SignupForm initialPrefill prop`

## Step 10 — `<Signup />` parent reads + clears prefill cookie

Files: modify `components/landing/Signup.tsx`. Tests: `tests/components/Signup.test.tsx`.

- **Red:** Reads `PREFILL_COOKIE` via `cookies()` (`next/headers`); when valid, passes claims to `SignupForm` and clears the cookie via response headers; when missing or invalid, passes `undefined`; mounts `<AuthButtons />` above the form.
- **Green:** Implement.
- **Commit:** `feat(auth-s1, step 10): Signup parent prefill consumption`

## Step 11 — Dependency-cruiser rules

Files: modify `.dependency-cruiser.cjs`. Verify with `npm run check:deps`.

- **Red:** Add the two rules from spec §4.7. The rule file must catch a deliberate violation (temporary import) introduced in a test branch then reverted.
- **Green:** Confirm rules pass with the real code.
- **Commit:** `chore(auth-s1, step 11): dep-cruiser rules`

## Step 12 — CSP / `next.config.ts` adjustments

Files: `next.config.ts`. Tests: smoke check by manual round-trip in dev.

- **Red:** Manual test confirms the existing CSP does **not** block the Zitadel redirect chain. If it does, add `form-action` / `connect-src` entries for `https://*.zitadel.cloud`.
- **Green:** Adjustments committed.
- **Commit:** `chore(auth-s1, step 12): CSP allows Zitadel`

## Step 13 — `.env.example` update

Files: `.env.example`. Tests: `tests/lib/env-shape.test.ts`.

- **Red:** Asserts every key from `00-architecture.md §4` (Stage 1 subset) is present in `.env.example` and has no `NEXT_PUBLIC_` prefix except `NEXT_PUBLIC_AUTH_ENABLED`.
- **Green:** Update file.
- **Commit:** `chore(auth-s1, step 13): .env.example for Zitadel Stage 1`

## Step 14 — Final integration test

Tests: `tests/api/auth-flow.integration.test.ts`.

End-to-end happy + cancel paths driving `/start` and `/callback` with MSW; asserts cookies flow correctly and that a subsequent rendered `Signup` reads + clears prefill.

- **Commit:** `test(auth-s1, step 14): end-to-end auth flow integration`

## Step 15 — Manual smoke + PR

- Run the dev server. Click the Google button. Complete the round-trip. Verify prefill, submit, remember-me update.
- Test the cancel path (click Cancel at Google).
- Flip `NEXT_PUBLIC_AUTH_ENABLED=false`, confirm buttons gone and routes return 404.
- Paste smoke-test transcript into PR description.
- Open PR. Wait for review.

## Test-file inventory (expected count: ~13 new files)

```
tests/lib/auth-env.test.ts
tests/lib/auth-copy.test.ts
tests/lib/prefill-cookie.test.ts
tests/lib/zitadel.buildAuthStart.test.ts
tests/lib/zitadel.completeAuthCallback.test.ts
tests/lib/no-free-strings.test.ts
tests/lib/env-shape.test.ts
tests/api/auth-start.test.ts
tests/api/auth-callback.test.ts
tests/api/auth-flow.integration.test.ts
tests/components/AuthButtons.test.tsx
tests/components/Signup.test.tsx
tests/components/SignupForm.manual-flow.regression.test.tsx
```

## Definition of done

All checkboxes in [`01-google-prefill.md §6`](./01-google-prefill.md#6-acceptance-criteria) green.
