# Stage 3 — Sessions, middleware, RBAC

> **Status:** Spec. Implementation gated on a real product need (the first authenticated feature).
> **Date:** 2026-05-25.
> **Prerequisites:** Stages 1 (and ideally 2) live. [`00-architecture.md`](./00-architecture.md) read. [`login.md`](./login.md) consulted for the original full-auth requirements that Stage 3 ultimately implements.
> **Gherkin scenarios:** [`../../tests/features/auth-03-auth-middleware.feature`](../../tests/features/auth-03-auth-middleware.feature).
> **Plan:** [`03-auth-middleware-plan.md`](./03-auth-middleware-plan.md).

## 1. Goal

Upgrade Stage 1's *transient* OIDC round-trip to a *persistent* session model, so that authenticated routes can exist. This is what the original [`login.md`](./login.md) was specifying. The minimum to make Stage 3 useful is:

1. A long-lived encrypted **session cookie** issued at callback (alongside or replacing the prefill cookie, depending on context).
2. A `middleware.ts` that protects the `app/(protected)/*` route group and nothing else.
3. A `/api/auth/logout` route that clears the session + hits Zitadel's `end_session_endpoint`.
4. A stub `app/(protected)/account/page.tsx` that displays the session user — proves the plumbing.
5. RBAC `user` / `admin` role checks plumbed through ID-token claims into a `lib/auth-roles.ts` helper.

Stage 3 is **not** triggered by time; it is triggered by demand. Do not implement until there is a concrete authenticated feature waiting.

## 2. What changes vs. Stage 1

### 2.1 New code

```
lib/session-cookie.ts              — sign / verify / refresh the session cookie
lib/auth-intent-cookie.ts          — short-lived cookie carrying "prefill" | "login"
lib/auth-roles.ts                  — assertRole(claims, role) and useRole() helpers
app/api/auth/logout/route.ts       — clear session + redirect to Zitadel end_session_endpoint
app/(protected)/layout.tsx         — belt-and-braces auth() check via session helper
app/(protected)/account/page.tsx   — stub
middleware.ts                       — matcher: ["/(protected)(.*)"]
```

### 2.2 Modified code (limited scope)

- `app/api/auth/start/route.ts` — reads optional `?intent=login` query param; writes `AUTH_INTENT_COOKIE` accordingly (default `"prefill"`).
- `app/api/auth/callback/route.ts` — reads `AUTH_INTENT_COOKIE`; when `"login"`, issues `SESSION_COOKIE` and clears the intent cookie. **Crucially, the OIDC flow cookie schema in `lib/zitadel.ts` is unchanged** — intent is a separate cookie.
- `components/landing/AuthButtons.tsx` — gains a `mode` prop: `"prefill"` (Stage-1 behaviour, used on `#signup`) vs. `"login"` (Stage-3 behaviour, used wherever a "Sign in" button is needed).
- `lib/zitadel.ts` — **unchanged**. Stage 3 builds on top, not into it.

### 2.3 Operator-side changes in Zitadel

- Turn **"Assert Roles on Authentication"** **ON** at the project level (was OFF in Stage 1 — see runbook §1.5).
- Create project roles: `user` (default-granted to all signups via "default project grant") and `admin` (granted manually to specific accounts).
- Add post-logout redirect URIs to the `hulubul-web` application: `http://localhost:3000/` and `https://hulubul.com/`.

### 2.4 New env vars

| Variable | Notes |
|---|---|
| `SESSION_COOKIE_SECRET` | Separate from `AUTH_COOKIE_SECRET`. Rotating it logs everyone out. |
| `SESSION_TTL_SECONDS` | Optional override of the default (e.g., 14 days). |

## 3. RBAC model

- Roles live in Zitadel. The ID token carries them under the project-roles claim (`urn:zitadel:iam:org:project:roles`).
- `lib/auth-roles.ts` exposes:
  ```ts
  export const ROLE_USER  = "user"  as const;
  export const ROLE_ADMIN = "admin" as const;
  export type Role = typeof ROLE_USER | typeof ROLE_ADMIN;

  export function hasRole(session: SessionUser, role: Role): boolean;
  export function requireRole(session: SessionUser, role: Role): SessionUser;   // throws if missing
  ```
- **Strict naming distinction:** these auth roles live in `lib/auth-roles.ts`. They are **not** the domain roles in `lib/roles.ts` (`expeditor`, `transportator`, `destinatar`). Different concepts; never conflated.

## 4. Cookie strategy

Two cookies coexist; they serve different purposes:

| Cookie | Lifetime | Set by | Read by | Purpose |
|---|---|---|---|---|
| `PREFILL_COOKIE` | ≤ 10 min | `/api/auth/callback` (when intent="prefill") | `Signup` server component | One-shot waitlist prefill (Stage 1) |
| `SESSION_COOKIE` | ~14 days | `/api/auth/callback` (when intent="login") | `middleware.ts`, server components in `(protected)` | Long-lived authenticated identity |
| `AUTH_INTENT_COOKIE` | ≤ 5 min | `/api/auth/start` | `/api/auth/callback` | Carries `"prefill"` or `"login"`; cleared on callback |

A user who signs in for *both* purposes (rare) gets both cookies. They are independent.

## 5. Acceptance criteria

- [ ] All Gherkin scenarios in `../../tests/features/auth-03-auth-middleware.feature` covered.
- [ ] `lib/zitadel.ts` and `lib/prefill-cookie.ts` are byte-identical to Stage 2 merge. Verified by a guard test.
- [ ] Anonymous GET `/account` → 307 to `/api/auth/start?provider=…&intent=login&return_to=/account` (`return_to` allowlist-validated).
- [ ] Authenticated GET `/account` → 200, shows session user.
- [ ] Anonymous GET `/` → 200 (unchanged).
- [ ] Anonymous POST `/api/waitlist` → 201 (unchanged).
- [ ] Logout clears the cookie *and* hits Zitadel's `end_session_endpoint`.
- [ ] Roles claim missing → `hasRole(session, "admin")` returns `false` (never throws).
- [ ] No domain-role / auth-role mixing — separate test enforces module boundary.

## 6. Risks

| ID | Risk | Mitigation |
|---|---|---|
| S3-R1 | `middleware.ts` accidentally protects `/` or `/api/waitlist` | Explicit matcher `["/(protected)(.*)"]`; regression test asserts public routes still 200. |
| S3-R2 | Stage-1 prefill cookie semantics change | Byte-invariance guard on `lib/prefill-cookie.ts`. New behaviour goes into `lib/session-cookie.ts`. |
| S3-R3 | Open redirect via `return_to` on login | Allowlist of safe paths: `/account`, `/account/*`. Anything else falls back to `/`. |
| S3-R4 | Role-assertion-on toggle floods existing tokens | Issue is per-user-per-session; users get fresh tokens on next sign-in. Documented as a one-time soft-rollout. |
| S3-R5 | Rotating `SESSION_COOKIE_SECRET` silently breaks production | Rotation is a documented operational procedure with a "users will be logged out" disclaimer. |
| S3-R6 | A future logged-in user submits the waitlist and we accidentally start deduplicating by `sub` | INV-2 restated: waitlist remains anonymous-write. Test asserts `/api/waitlist` ignores any session header. |

## 7. Out of scope (still)

- MFA / passkeys.
- Account deletion UI.
- Email change / password change UI (Zitadel hosts these flows).
- Org/team model.
- Strapi-side JWT validation.
- Stripe — but Stage 3 makes the Zitadel `sub` available to a future Stripe integration as `session.sub`.

## 8. References

- [`login.md`](./login.md) — the original full-auth epic; Stage 3 implements its essence.
- [`00-architecture.md`](./00-architecture.md)
- [`../../tests/features/auth-03-auth-middleware.feature`](../../tests/features/auth-03-auth-middleware.feature)
- [`03-auth-middleware-plan.md`](./03-auth-middleware-plan.md)
