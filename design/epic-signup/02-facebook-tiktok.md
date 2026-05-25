# Stage 2 — Add Facebook (and TikTok) prefill

> **Status:** Spec. Implementation gated on Stage 1 being merged and live.
> **Date:** 2026-05-25.
> **Prerequisites:** Stages 0 (runbook) and 1 complete. [`00-architecture.md`](./00-architecture.md) read.
> **Gherkin scenarios:** [`features/02-facebook-tiktok.feature`](./features/02-facebook-tiktok.feature).
> **Plan:** [`02-facebook-tiktok-plan.md`](./02-facebook-tiktok-plan.md).

## 1. Goal

Add **Facebook** as a second upstream identity provider, then (gated by a feasibility spike) **TikTok** as a third. The *whole point* of this stage is to validate that Stage 1's design holds: a new provider is **config + UI only**, with no changes to `lib/zitadel.ts`, `lib/prefill-cookie.ts`, or any route handler.

If this stage requires editing `lib/zitadel.ts`, the Stage-1 architecture is wrong and we stop and reassess.

## 2. What changes

### 2.1 Operator-side (zero code)

- Register a Facebook app on Meta Developers. Get App ID + App Secret.
- Add **Facebook** as an upstream IdP in Zitadel (mirrors §4 of the runbook, with Facebook-specific fields).
- Populate `ZITADEL_IDP_FACEBOOK` in `.env.local` and the cloud environment.
- Repeat for TikTok (spike first; see §4 below).

### 2.2 Frontend (config + UI only)

- `lib/auth-providers.ts`: add `PROVIDER_TIKTOK` constant.
- `lib/auth-copy.ts`: the Facebook/TikTok keys already exist from Stage 1 — no change.
- `components/landing/AuthButtons.tsx`: already gated on env var presence. Setting the env var renders the button. **No code change** beyond possibly adding an icon import for TikTok.
- `tests/components/AuthButtons.test.tsx`: extend the existing parametrised tests to cover Facebook and TikTok cases.

### 2.3 Backend (Strapi)

- Nothing. INV-1 holds.

## 3. New env vars

| Variable | Notes |
|---|---|
| `ZITADEL_IDP_FACEBOOK` | Already exists in `.env.example` from Stage 1 (empty). Now populated. |
| `ZITADEL_IDP_TIKTOK` | New. Add to `.env.example` (empty) and to `tests/lib/env-shape.test.ts`. |

## 4. TikTok feasibility spike (mandatory before TikTok implementation)

Before any TikTok work, perform a time-boxed (½ day) spike to confirm:

1. Zitadel Cloud free tier supports TikTok as a built-in upstream IdP, **or** TikTok can be added via Zitadel's "Generic OIDC" provider with a stable configuration.
2. TikTok Developer account approval is achievable on a sensible timeline.
3. TikTok's OAuth returns *at minimum* a stable `sub` and an email. **TikTok historically does not provide email on standard scopes** — if it doesn't, the prefill use case is degraded (only name + sub) and we must decide whether to ship TikTok at all.

Spike outcome is one of:

- **GO**: implement following the plan.
- **NO-GO**: archive the TikTok work; remove the env-var stub; keep Facebook as the only Stage 2 addition.
- **CONDITIONAL**: implement with reduced functionality (e.g. button labelled "Continuă cu TikTok" but only `name` prefilled; email field stays empty and editable). Updated copy in `auth-copy.ts`.

Spike output is recorded in `design/epic-signup/spike-tiktok.md` (not yet written; created during the spike).

## 5. Acceptance criteria

- [ ] `lib/zitadel.ts` is **byte-identical** to its Stage-1-merged content. Verify by `git diff main..stage-2 -- lib/zitadel.ts` producing no output.
- [ ] `lib/prefill-cookie.ts` is **byte-identical**.
- [ ] `app/api/auth/start/route.ts` and `app/api/auth/callback/route.ts` are **byte-identical** (apart from possibly one parametrised string).
- [ ] Gherkin scenarios in `features/02-facebook-tiktok.feature` are covered by Vitest tests.
- [ ] Kill-switch (INV-8) still works: with `NEXT_PUBLIC_AUTH_ENABLED=false`, all buttons are hidden.
- [ ] Single-provider gating works: with only `ZITADEL_IDP_GOOGLE` set, only the Google button renders.
- [ ] Manual smoke test against the configured Zitadel covers both Facebook and (if implemented) TikTok happy + cancel paths.

## 6. Risks

| ID | Risk | Mitigation |
|---|---|---|
| S2-R1 | Meta app approval delays the launch | Independent of Stage 1; if approval is slow, ship Facebook in a follow-up PR. |
| S2-R2 | TikTok doesn't fit our model | Spike result governs; CONDITIONAL or NO-GO. |
| S2-R3 | Tempted to add a "provider config object" abstraction now | Resist. Two providers is not enough to justify an abstraction. Three is the soonest to revisit; even then, only if Stage-3 forces it. |
| S2-R4 | New IdP icons inflate the bundle | Use inline SVGs (≤ 1 KB each), not an icon library. |

## 7. Non-goals

- No new auth-flow behaviour. No new cookie. No new route. No protected pages.
- No "preferred provider" memory. The user picks each visit.
- No account-linking UI. If a user signs in with Google one day and Facebook the next, Zitadel's "Account linking allowed" setting handles the linkage; the frontend remains oblivious.

## 8. References

- [`00-architecture.md`](./00-architecture.md)
- [`01-google-prefill.md`](./01-google-prefill.md)
- [`features/02-facebook-tiktok.feature`](./features/02-facebook-tiktok.feature)
- [`02-facebook-tiktok-plan.md`](./02-facebook-tiktok-plan.md)
