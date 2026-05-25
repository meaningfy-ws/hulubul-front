# Stage 3 — Implementation plan (TDD)

> **Pairs with:** [`03-auth-middleware.md`](./03-auth-middleware.md), [`../../tests/features/auth-03-auth-middleware.feature`](../../tests/features/auth-03-auth-middleware.feature).
> **Discipline:** strict red → green → refactor. **Run `gitnexus_impact` on `middleware.ts` and `app/api/auth/callback/route.ts` before any edit**, per CLAUDE.md.

## Step 0 — Regression guard for public routes

- **Red:** `tests/middleware.public-routes.test.ts` asserts `/`, `/api/waitlist`, `/og`, `/sitemap.xml`, `/robots.txt` are reachable anonymously. Should pass now (no middleware exists yet); freezes behaviour.
- **Commit:** `test(auth-s3, step 0): freeze public-route accessibility`

## Step 1 — `lib/auth-roles.ts`

- **Red:** `tests/lib/auth-roles.test.ts` — `hasRole` returns true when claim contains role, false when missing or empty; `requireRole` throws typed `MissingRoleError`; never confuses `lib/roles.ts` types (separate test asserts no shared symbol names).
- **Green:** Implement.
- **Commit:** `feat(auth-s3, step 1): auth-roles helper`

## Step 2 — `lib/session-cookie.ts`

- **Red:** `tests/lib/session-cookie.test.ts` — sign/verify round-trip; rejects tampered; rejects expired; rotates `iat` on refresh; uses `SESSION_COOKIE_SECRET` (not `AUTH_COOKIE_SECRET`).
- **Green:** Implement with `jose`.
- **Commit:** `feat(auth-s3, step 2): session-cookie module`

## Step 3 — Callback issues session on `intent=login`

The `intent` is carried in a **separate** short-lived cookie (`AUTH_INTENT_COOKIE`), not embedded in the OIDC flow cookie. This keeps `lib/zitadel.ts` byte-identical to Stage 2.

- **Red:** `tests/api/auth-callback.intent-login.test.ts` — `/api/auth/start?intent=login` writes `AUTH_INTENT_COOKIE=login` (HttpOnly, ≤5min). On callback, when the intent cookie is `login`, issue `SESSION_COOKIE` in addition to clearing `OIDC_FLOW_COOKIE` and `AUTH_INTENT_COOKIE`. When the intent cookie is `prefill` or absent (Stage-1 default), only the `PREFILL_COOKIE` is issued.
- **Green:** Add intent-cookie helper in `lib/auth-intent-cookie.ts` (new, not modifying any Stage-2 module). Extend `/api/auth/start/route.ts` and `/api/auth/callback/route.ts` to read/write it. `lib/zitadel.ts` and `lib/prefill-cookie.ts` are not edited.
- **Commit:** `feat(auth-s3, step 3): session cookie on login intent (via separate intent cookie)`

## Step 4 — `middleware.ts`

- **Red:** `tests/middleware.protected-routes.test.ts` — matcher fires only for `/(protected)(.*)`; anonymous → 307 to `/api/auth/start?provider=google&intent=login&return_to=/account`; authenticated → pass-through.
- **Green:** Implement.
- **Commit:** `feat(auth-s3, step 4): middleware protects (protected) route group`

## Step 5 — `app/(protected)/layout.tsx` + `account/page.tsx`

- **Red:** Tests assert layout calls session helper and redirects on null (belt-and-braces); page renders session user's email and `sub`; no Strapi calls.
- **Green:** Implement.
- **Commit:** `feat(auth-s3, step 5): protected layout and account stub`

## Step 6 — `/api/auth/logout`

- **Red:** Clears `SESSION_COOKIE` (Max-Age=0), redirects to Zitadel `end_session_endpoint?post_logout_redirect_uri=/`, on Zitadel-unreachable still clears the cookie and redirects to `/`.
- **Green:** Implement.
- **Commit:** `feat(auth-s3, step 6): logout route`

## Step 7 — `<AuthButtons mode="login">` variant

- **Red:** When `mode="login"`, links carry `intent=login` and (optionally) `return_to`. `mode="prefill"` (default) unchanged.
- **Green:** Add `mode` prop.
- **Commit:** `feat(auth-s3, step 7): AuthButtons mode prop`

## Step 8 — Account-menu nav component (port from `login.md`)

- **Red:** Anonymous → "Intră în cont" button (`mode="login"`); authenticated → "Bună, {firstName}" + "Ieșire" button → `/api/auth/logout`.
- **Green:** Implement.
- **Commit:** `feat(auth-s3, step 8): account menu in nav`

## Step 9 — Open-redirect allowlist for `return_to`

- **Red:** Allowlist `["/account", "/account/*"]`; anything else → `/`.
- **Green:** Implement validator + tests.
- **Commit:** `feat(auth-s3, step 9): return_to allowlist`

## Step 10 — Operator: turn on role-assertion + create roles in Zitadel

- Follow updated runbook §1.5 (toggle ON) + §1.6 (new): create `user` (default-granted), `admin`.
- **No code in this step.**

## Step 11 — INV-2 guard: waitlist remains anonymous-write

- **Red:** `tests/api/waitlist-still-anonymous.test.ts` — POST `/api/waitlist` with and without a session cookie produces identical behaviour; no `sub` or session data appears in the Strapi payload.
- **Green:** No change expected; this is a regression guard.
- **Commit:** `test(auth-s3, step 11): waitlist remains anonymous-write`

## Step 12 — Manual smoke + PR

- Test: anonymous `/account` → login → back to `/account`.
- Test: logout → cookies cleared, Zitadel session ended (verify via Zitadel console).
- Test: kill-switch off → protected routes 503 or fallback per spec.
- Test: role `admin` grant to one test user → `/admin` (if any) accessible.

## Definition of done

All Gherkin scenarios in `../../tests/features/auth-03-auth-middleware.feature` covered; byte-invariance guards on `lib/zitadel.ts` and `lib/prefill-cookie.ts` green; public-routes regression green; manual smoke recorded.
