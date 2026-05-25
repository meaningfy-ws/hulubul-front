# Stage 2 — Implementation plan (TDD)

> **Pairs with:** [`02-facebook-tiktok.md`](./02-facebook-tiktok.md), [`features/02-facebook-tiktok.feature`](./features/02-facebook-tiktok.feature).
> **Discipline:** strict red → green → refactor. Same conventions as Stage 1 plan.
> **Hard constraint:** if any step requires editing `lib/zitadel.ts`, `lib/prefill-cookie.ts`, or the route handlers, **stop** — the Stage-1 architecture is wrong and needs reassessment.

## Step 0 — Verify Stage-1 invariants still hold

- Run `git diff main..HEAD -- lib/zitadel.ts lib/prefill-cookie.ts app/api/auth/` and confirm zero output.
- This is enforced by a guard test `tests/architecture/stage-2-byte-invariance.test.ts` that fails if a future PR mutates those files in Stage 2 scope.

## Facebook track

### Step F1 — Operator: register Meta app, populate `.env.local`

- Follow [`zitadel-google-runbook.md`](./zitadel-google-runbook.md) §3–§4 with Facebook substitutions.
- Add `ZITADEL_IDP_FACEBOOK=<id>` to all environments.
- **No code in this step.**

### Step F2 — Test: `AuthButtons` renders Facebook button when env set

- **Red:** Extend `tests/components/AuthButtons.test.tsx` parametrised cases: with `ZITADEL_IDP_FACEBOOK` set, the Facebook button renders with `lib/auth-copy.ts` label and links to `/api/auth/start?provider=facebook`.
- **Green:** Confirm — `AuthButtons` should already handle this if Stage-1 was implemented correctly (it iterates over enabled providers). If a code change is needed, that is a bug fix in Stage 1, not a Stage-2 feature.
- **Commit:** `test(auth-s2, step F2): Facebook button visibility`

### Step F3 — Integration test: Facebook round-trip

- **Red:** `tests/api/auth-flow.facebook.integration.test.ts` — same MSW-driven test as Stage 1 but with `provider=facebook` and IdP-hint pointing at Facebook. Asserts the authorize URL contains the Facebook IdP id.
- **Green:** No new code expected.
- **Commit:** `test(auth-s2, step F3): Facebook end-to-end`

### Step F4 — Manual smoke + PR

- Smoke-test the Facebook happy path and cancel path.
- PR with checklist mirroring Stage 1's smoke section.

## TikTok track

### Step T0 — Spike (½ day, NO code commits)

- Verify TikTok-as-upstream feasibility in Zitadel (built-in or generic OIDC).
- Verify scope/claim shape returned by TikTok.
- Decide: GO / NO-GO / CONDITIONAL.
- Write `design/epic-signup/spike-tiktok.md` capturing findings and decision.

### Step T1 (only if GO or CONDITIONAL) — Operator: register TikTok app, populate `.env.local`

- Mirror Step F1 with TikTok.

### Step T2 — Constants

- **Red:** Test asserts `PROVIDER_TIKTOK` exists in `lib/auth-providers.ts` and is accepted by `AuthButtons` provider iteration.
- **Green:** Add the constant. No other code.
- **Commit:** `feat(auth-s2, step T2): add PROVIDER_TIKTOK constant`

### Step T3 — Copy

- **Red:** Test asserts `lib/auth-copy.ts` resolves TikTok keys to non-empty Romanian strings.
- **Green:** Either already present from Stage 1 (it is — preemptively added) or add now.
- **Commit:** `feat(auth-s2, step T3): TikTok copy keys` (or skip if no change)

### Step T4 — Button + smoke

- **Red:** `tests/components/AuthButtons.test.tsx` parametrised case for TikTok env set.
- **Green:** No new code.
- **Commit:** `test(auth-s2, step T4): TikTok button visibility`

### Step T5 — If CONDITIONAL: degrade prefill on TikTok callback

- **Red:** When the ID token from TikTok has no email, the callback still succeeds but `PREFILL_COOKIE` is set with `email=""` and the form does not show the verified tag.
- **Green:** This is the **only** Stage-2 step that may touch shared modules — and only if CONDITIONAL applies. The change is a single conditional in `completeAuthCallback` to accept empty email when `provider===PROVIDER_TIKTOK`. **This counts as an exception to the byte-invariance rule and must be called out in the PR description with the spike outcome attached.**
- **Commit:** `feat(auth-s2, step T5): accept empty email for TikTok (conditional GO)`

### Step T6 — Manual smoke + PR

## Definition of done

- Stage-1 byte-invariance guard test green (or, in the explicit T5 exception case, updated and re-justified).
- All Gherkin scenarios in `features/02-facebook-tiktok.feature` covered.
- Kill-switch still disables all providers.
- Manual smoke transcripts in PR description.
