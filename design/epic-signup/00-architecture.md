# EPIC — Signup & Login: shared architecture (Stages 1 → 3)

> **Status:** Spec. Implementation gated on review.
> **Date:** 2026-05-25.
> **Scope:** cross-stage invariants and boundaries that **all three stages** of the signup/login epic must respect.
> **Reading order:** read this first, then `01-google-prefill.md`, then `02-facebook-tiktok.md`, then `03-auth-middleware.md`. The user-notification spec `04-user-error-bubble.md` is orthogonal and can be read at any time.
> **Relationship to `login.md`:** the original `login.md` describes the *full-auth* end state. This staged plan implements that end state in three reviewable chunks. Anything in `login.md` not covered here is preserved verbatim as Stage 3 scope.

## 1. Why a staged approach

The product need that justifies *now* is **frictionless waitlist onboarding**, not a session-based account model. We deliver that need in Stage 1 with the minimum that is forward-compatible with the full-auth end state. Stages 2 and 3 add capability without rewriting Stage 1 artefacts.

| Stage | Delivers | Code added | Code that changes from prior stage |
|---|---|---|---|
| 1 | Google "Continuă cu Google" → prefills waitlist form. Zitadel user record exists from day one. | `lib/zitadel.ts`, `lib/prefill-cookie.ts`, `lib/auth-copy.ts`, `app/api/auth/start/route.ts`, `app/api/auth/callback/route.ts`, `components/landing/AuthButtons.tsx`, `SignupForm` prefill prop. | Nothing — first stage. |
| 2 | Facebook (and later TikTok) buttons. | New env vars, new IdP entries in Zitadel admin, new copy in `auth-copy.ts`. | **Zero** changes to `lib/zitadel.ts`, `lib/prefill-cookie.ts`, route handlers. Proves the Stage-1 module shape is correct. |
| 3 | Real Zitadel-backed session, route protection, RBAC `user`/`admin`, logout. | `lib/session-cookie.ts`, `middleware.ts`, `app/api/auth/logout/route.ts`, `app/(protected)/account/page.tsx`, `lib/auth-roles.ts`. | `lib/zitadel.ts` is **re-used unchanged**. `SignupForm` is untouched. |

## 2. Architectural invariants

These hold in **every stage**. They are the load-bearing structure of the epic.

### INV-1 — Zitadel owns identity. Strapi owns content.

- Zitadel is the single authoritative source for *who a user is*.
- Strapi never sees a Zitadel token, never validates a JWT, never knows a Zitadel `sub`.
- No new Strapi collection is created by this epic. No existing Strapi collection is modified by this epic. (The optional `zitadel_sub` field discussed during brainstorming was **rejected** by the user — see §11.)

### INV-2 — Waitlist submissions are immutable events. A user may submit many times.

- The `waitlist-submission` collection holds *submission events*, not user identities.
- The same person may click "Continuă cu Google" + Submit five times and produce five rows. That is correct behaviour. No de-duplication is performed against Google `sub`, email, or Zitadel `sub`.
- The waitlist endpoint is **the same anonymous endpoint** in all three stages. Authenticated session in Stage 3 does not alter waitlist submission semantics.

### INV-3 — `lib/zitadel.ts` is pure OIDC.

- It exposes only OIDC-protocol primitives: `buildAuthorizationUrl`, `exchangeCodeForTokens`, `verifyIdToken`, `extractClaims`.
- It **does not** read or write cookies. It does **not** know what `lib/prefill-cookie.ts` (Stage 1) or `lib/session-cookie.ts` (Stage 3) do with the data.
- This boundary is what makes Stage 3 a pure addition rather than a rewrite.

### INV-4 — No PII in logs.

- The auth code paths log structured events (`auth.start.requested`, `auth.callback.success`, `auth.callback.failed`) with **non-identifying** metadata only: provider name, error code, request id, latency.
- Email, name, `sub`, `code`, `state`, `nonce`, `access_token`, `id_token` are **never** logged or emitted to any observability backend.
- The callback URL contains `?code=...&state=...` which would be PII-adjacent in a request log; whatever access-logging layer exists must strip query strings for `/api/auth/*`.

### INV-5 — No free strings.

Per Meaningfy code style: every semantic identifier exists as a named constant. This applies to:

- Cookie names — `lib/cookies.ts` exports `PREFILL_COOKIE`, `OIDC_FLOW_COOKIE`, `SESSION_COOKIE` (Stage 3).
- Provider IdP keys — `lib/auth-providers.ts` exports `PROVIDER_GOOGLE`, `PROVIDER_FACEBOOK`, `PROVIDER_TIKTOK` (Stage 2).
- Romanian copy — `lib/auth-copy.ts` exports keyed message constants.
- Event names — `lib/auth-events.ts` exports event-name constants used in logs and telemetry.

Tests assert via these constants; never inline string literals.

### INV-6 — Server-only secrets.

- `ZITADEL_CLIENT_SECRET` and `AUTH_COOKIE_SECRET` (and Stage 3's `SESSION_COOKIE_SECRET`) are **never** prefixed with `NEXT_PUBLIC_`.
- Only `NEXT_PUBLIC_AUTH_ENABLED` is allowed to cross the server/client boundary.
- A unit test in `tests/lib/env-shape.test.ts` asserts the prefix rule programmatically on every PR.

### INV-7 — Failure is communicated to the user, never silent.

- Every failure path (sign-in cancelled, Zitadel unreachable, token verification failed, prefill cookie corrupted) results in a user-facing notice surfaced via the **user-notification bubble** (spec `04-user-error-bubble.md`).
- Technical detail (`code`, request id, stack) is logged to the console + observability backend for technical users — **never** displayed in the UI.

### INV-8 — Feature kill-switch.

- `NEXT_PUBLIC_AUTH_ENABLED=false` (or unset) must:
  - hide all auth-related UI (buttons, notices);
  - cause every `/api/auth/*` route to respond `404`;
  - leave the manual waitlist flow fully operational.
- This is the canonical rollback mechanism. It is enforced by tests in every stage.

### INV-9 — Module dependency direction.

Following the project's `lib/*` convention and Meaningfy layered principles, the dependency graph is:

```
                    components/landing/AuthButtons.tsx       components/landing/SignupForm.tsx
                                  │                                       │
                                  ▼                                       ▼
                       app/api/auth/start/route.ts        app/api/auth/callback/route.ts
                                  │                                       │
                                  └───────────────┬───────────────────────┘
                                                  ▼
                                       lib/prefill-cookie.ts (Stage 1)
                                       lib/session-cookie.ts (Stage 3)
                                                  │
                                                  ▼
                                          lib/zitadel.ts
                                                  │
                                                  ▼
                                          lib/auth-copy.ts
                                          lib/cookies.ts
                                          lib/auth-events.ts
                                          lib/auth-providers.ts
```

- `lib/zitadel.ts` must not import from any `components/*`, `app/*`, or `lib/{prefill,session}-cookie`. The reverse is allowed.
- A `dependency-cruiser` rule (project already uses dep-cruiser — see `package.json` `check:deps`) is added to enforce this.

### INV-10 — Tests are isomorphic to source.

For every new source file `X.ts` there exists a `tests/.../X.test.ts` (or `.test.tsx`) at the corresponding path. Gherkin feature files live in `design/epic-signup/features/<stage>.feature` and are paired with Vitest step-style integration tests.

## 3. Test taxonomy

This taxonomy applies uniformly to Stages 1–3 and to the notification bubble spec.

| Layer | Tool | What it tests | Where |
|---|---|---|---|
| **Unit** | Vitest | Pure functions: builders, parsers, validators, cookie sign/verify. No HTTP, no DOM, no env-dependent code paths. | `tests/lib/*` |
| **Integration / feature** | Vitest + MSW | Route handlers exercised in full, with MSW mocking Zitadel's discovery, token, JWKS, and userinfo endpoints. Cookie writes verified via `Set-Cookie` header. | `tests/api/*` |
| **UI / component** | Vitest + Testing Library + JSDOM | Components render correctly under each session/prefill state; user interactions trigger correct effects. Strict `@testing-library/jest-dom` matchers. | `tests/components/*` |
| **Behaviour spec (Gherkin)** | Hand-authored `.feature` files | Customer-facing acceptance scenarios in `Given / When / Then` form, with `Scenario Outline` for variants. Each scenario maps to one or more Vitest tests via behaviour-driven test naming (`describe("Given … When … Then …")`). | `design/epic-signup/features/*.feature` |
| **End-to-end (browser)** | **Not introduced in this epic.** | Reserved for a future epic that introduces Playwright. | — |

### TDD discipline

Per user instruction, every stage follows **strict red → green → refactor** at the *test-file granularity*: open a new test file, write a failing test, make it pass with the minimum code, refactor, commit. Each commit references the Gherkin scenario(s) it covers.

### Coverage targets

| Module | Statement coverage target |
|---|---|
| `lib/zitadel.ts` | ≥ 90% |
| `lib/prefill-cookie.ts`, `lib/session-cookie.ts` | ≥ 95% (security-sensitive) |
| Route handlers `/api/auth/*` | ≥ 90% |
| `AuthButtons.tsx`, modified `SignupForm.tsx` paths | ≥ 80% |

## 4. Environment variables across stages

| Variable | Stage introduced | Server / public | Notes |
|---|---|---|---|
| `ZITADEL_ISSUER` | 1 | server | No trailing slash. |
| `ZITADEL_CLIENT_ID` | 1 | server | Format: `<numeric>@<projectname>`. |
| `ZITADEL_CLIENT_SECRET` | 1 | server | Never `NEXT_PUBLIC_`. |
| `ZITADEL_IDP_GOOGLE` | 1 | server | Numeric IdP ID; passed as `idp_hint`. |
| `ZITADEL_IDP_FACEBOOK` | 2 | server | Optional in Stage 1; populated in Stage 2. |
| `ZITADEL_IDP_TIKTOK` | 2 | server | Optional; gated by Stage 2 feasibility spike. |
| `AUTH_REDIRECT_URI` | 1 | server | Must byte-match a Zitadel-registered URI. |
| `AUTH_COOKIE_SECRET` | 1 | server | HMAC key for prefill cookie. ≥ 32 bytes. |
| `SESSION_COOKIE_SECRET` | 3 | server | Separate from prefill secret. Rotating it logs everyone out. |
| `NEXT_PUBLIC_AUTH_ENABLED` | 1 | public | The kill-switch (INV-8). |

## 5. Security baseline

These apply to every stage; restated for emphasis.

- All auth cookies are **HttpOnly**, **Secure** in production, **SameSite=Lax**.
- CSRF protection: OIDC `state` parameter, validated on callback.
- PKCE: `S256` code challenge on every authorisation request.
- Nonce: included in auth request, validated against ID-token `nonce` claim.
- Token signature: validated against JWKS fetched from `${ZITADEL_ISSUER}/oauth/v2/keys`, with a small JWKS cache (TTL ~10 min).
- Clock skew: ±2 s for `iat`/`exp` checks (matches Zitadel app setting in the runbook).
- Scopes: `openid email profile` in Stages 1–2. Stage 3 adds `offline_access` only if refresh tokens are needed.
- Email verification: only treat email as "verified by provider" when the ID token's `email_verified` is `true`. Otherwise the email is still used for prefill, but no "verificat prin Google" badge is shown.

## 6. Boundaries that must not be crossed

Restating the spec's hard "do nots":

- **No edits to backend Strapi code.** If something seems to require backend change, write a separate spec under `design/epic-signup/backend-spec-*.md` and stop.
- **No introduction of Auth.js / next-auth.** The architecture is intentionally hand-rolled around `openid-client` + `jose`. Adopting a framework later is a deliberate decision, not a drift.
- **No Strapi-side JWT validation, ever.** Strapi continues to treat all requests as anonymous from the user's perspective. The `STRAPI_API_TOKEN` server-side admin token is unchanged.
- **No protected routes in Stage 1 or 2.** The `app/(protected)/*` route group does not exist until Stage 3.
- **No persistence of `code`, `id_token`, `access_token`, or `refresh_token` outside the encrypted cookie boundary.** In particular: no localStorage, no React state, no analytics payload.

## 7. Out of scope for this entire epic

- MFA, passkeys, WebAuthn.
- Organisations / teams / multi-tenant accounts.
- Custom-domain Zitadel (`auth.hulubul.com`). The free-tier `*.zitadel.cloud` issuer is accepted; migration is a separate epic.
- Email/SMS infrastructure of our own.
- CRM / analytics wiring of auth events (beyond the existing tracking module).
- Account deletion UI / GDPR self-service erasure.
- WhatsApp field changes (the existing field is preserved as-is).

## 8. Quota and cost monitoring

Zitadel Cloud free tier limits: **25 000 MAU**, **10 000 auth requests / month**. Stage 1 traffic is bounded by waitlist visitors clicking the Google button. Define alerting before launch:

- Dashboard panel (or Zitadel admin polling): auth-request count vs. quota.
- Alert at 70 % monthly quota.
- Migration to paid tier triggered at 85 %.

## 9. Open backend specs (writes for the backend team)

The frontend produces these specs as a side effect of this epic. They are committed in this repo but addressed to whoever owns Strapi.

| Spec | Purpose |
|---|---|
| `design/epic-signup/backend-spec-auth-copy-fields.md` | Add CMS fields to `landing-page` for the Romanian auth copy that Stage 1 currently hardcodes in `lib/auth-copy.ts`. |

There are **no other backend asks** for this epic. The `zitadel_sub` field idea was explicitly rejected (§11).

## 10. Glossary

- **Zitadel `sub`** — opaque, stable string identifying a user within our Zitadel project. Used as the canonical user ID across Stages 1–3 and beyond (Stripe later).
- **Upstream IdP** — Google, Facebook, TikTok. Zitadel brokers OAuth to them on our behalf.
- **`idp_hint`** — Zitadel-specific authorise-request parameter that auto-redirects past Zitadel's picker, going directly to the named upstream IdP.
- **Prefill cookie** (Stage 1) — short-lived (≤10 min), HttpOnly, signed cookie carrying `{email, name, email_verified, provider}` from `/api/auth/callback` to `SignupForm`. Single-use.
- **Session cookie** (Stage 3) — long-lived encrypted cookie holding a user session. Disjoint from the prefill cookie.
- **OIDC flow cookie** — ephemeral cookie holding `{code_verifier, state, nonce, return_to}` between `/api/auth/start` and `/api/auth/callback`. Lifetime ≤ 5 min, deleted at callback.

## 11. Decisions captured during brainstorming

These are the choices made during the design conversation that produced this epic. Recorded here so the rationale survives.

| # | Question | Decision | Reason |
|---|---|---|---|
| D1 | Build full auth or onboarding-ease first? | Onboarding-ease first (staged C). | Demand-driven; full auth is infrastructure ahead of a real user need. |
| D2 | Route Google via Zitadel or direct? | Via Zitadel. | Eliminates user migration when Stage 3 arrives; configures social providers as data, not code. |
| D3 | What happens after Google sign-in? | Prefill the existing form (A). | Smallest delta; reuses the existing form's validation. |
| D4 | Library? | `openid-client` + `jose`. | Educational fit; no premature lock-in to Auth.js's session model. |
| D5 | Add `zitadel_sub` to Strapi waitlist row? | **No.** Keep waitlist anonymous and decoupled. | Per user: waitlist allows unlimited duplicates per user; identity uniqueness lives in Zitadel only. |
| D6 | RBAC roles in Stage 1? | No code. Roles defined in Zitadel in Stage 3. | No protected routes yet; nothing to gate. |
| D7 | `.env` shape? | See §4 above. | Commit-safe; secrets server-only. |
| D8 | Notification bubble in this epic? | Yes, separate spec (`04-user-error-bubble.md`), implemented after Stage 1 lands in its own PR. | Cross-cutting; not Stage-1-specific. |
| D9 | CMS-driven copy? | Hardcoded in `lib/auth-copy.ts` now; backend spec written for CMS fields. | Avoids backend coupling in Stage 1. |
| D10 | WhatsApp field? | Untouched. | Already exists as optional; Google/Facebook do not return phone numbers. |
| D11 | E2E browser tests? | Out of scope (no Playwright in repo). | Avoids tooling bloat for a single epic. |
| D12 | Gherkin / BDD framework? | Gherkin scenarios authored in `.feature` files; executed via Vitest with behaviour-named tests. | Discipline without framework bloat. |
| D13 | TDD strictness? | Strict red-green-refactor per test file. | User-confirmed. |
| D14 | Vercel previews? | Not used. Single dev + single prod redirect URI. | Project deploys to its own cloud server. |
| D15 | Facebook in Stage 1? | No. Stage 2. | Decouples timelines from Meta app approval. |
| D16 | TikTok? | Stage 2, gated by a feasibility spike. | Zitadel free-tier support unverified. |
