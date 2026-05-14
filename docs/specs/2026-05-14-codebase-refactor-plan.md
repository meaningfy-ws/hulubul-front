# Codebase refactor — implementation plan (BDD/TDD)

**Date:** 2026-05-14
**Companion spec:** `2026-05-14-codebase-refactor-findings.md` (read first).
**Style:** Each phase is a small, reviewable PR. Each change is described
as a Gherkin feature (BDD) for behaviour and a red/green/refactor cycle
(TDD) for the code.
**Done definition (for every phase):** type-check clean, all tests green
(no skipped), no new ESLint warnings, manual smoke per "Verify" step.

---

## 0. Conventions

- **Branch naming:** `refactor/<id>-<short-name>` — e.g. `refactor/nf1-survey-endpoint`.
- **PR title:** matches branch.
- **PR body** must link back to the corresponding section of this plan and
  the findings document.
- **Test layer mapping** (per Meaningfy guide §4):
  - `lib/*` ↔ unit tests in `tests/lib/`
  - `components/*` ↔ unit tests in `tests/components/`
  - `app/api/*` ↔ route-handler tests in `tests/api/`
  - User flows ↔ Gherkin features in `tests/features/` (where they
    already exist — extend, don't fork).
- **No commits without tests** unless the change is documentation or
  configuration.

---

## 0.5 Risk register and mitigations

When the whole refactor lands as one PR (current decision), the failure
modes shift: a single broken phase blocks all the rest. The mitigations
below are designed for that bundling.

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | A phase introduces a type error that masks an unrelated regression | MEDIUM | HIGH | After every phase, run `npx tsc --noEmit && npx vitest run --reporter=dot` before starting the next phase. Stop at first red. |
| R2 | Renaming `LegalPage` → `EditorialPage` (Phase 5/H3 analogue: same idea, applied to roles) breaks an external import we don't see in this repo | LOW | MEDIUM | Keep the old name as a deprecated `export type X = NewX` alias for the duration of this PR. Drop the alias only in a follow-up PR with its own review window. |
| R3 | The `useReducer` rewrite of `SurveyForm` (Phase 12) silently changes behaviour because `useState`-vs-`useReducer` initialisation order differs | MEDIUM | HIGH | Two safeguards: (a) snapshot-test the SurveyForm initial render with `roleDefault=expeditor` and with a remembered identity, BEFORE the rewrite; (b) keep the integration tests in `tests/components/SurveyForm.test.tsx` untouched. Both must stay green after the rewrite. |
| R4 | Splitting `SurveyForm` into 8 sections regresses field tab order or aria-labels | LOW | MEDIUM | Existing form integration tests check fill-and-submit; extend with a tab-order test asserting the focusable elements appear in document order. |
| R5 | Strapi state drifts during the refactor (e.g. an editor changes a footer link to `#` again) and the slimmed Footer (Phase 8) silently breaks | LOW | LOW | Phase 8 includes a dev-mode console warning when any footer href is `#`. Test asserts the warning fires. |
| R6 | The strapi-client extraction (Phase 3) accidentally changes Next.js cache behaviour for some endpoint, causing stale data in production | MEDIUM | MEDIUM | Migrate one fetcher at a time, asserting each call site keeps its current cache directive. Add a unit test per fetcher pinning the directive. |
| R7 | Typed errors (Phase 4) fail `instanceof` across server/client realm boundaries | LOW | MEDIUM | Provide `isStrapiError()` / `isStrapiUpstreamError()` discriminators that check `error.name`, not `instanceof`. Use these in `humanizeFormError`. Document the realm gotcha in the JSDoc. |
| R8 | dependency-cruiser (Phase 11) flags pre-existing violations and blocks CI | MEDIUM | LOW | Run dep-cruiser locally before adding it to CI. Either fix violations as part of this PR, or start with the rule set in `--info` mode and tighten in a follow-up. |
| R9 | Survey URL fix (Phase 1/NF1) creates rows in production immediately | HIGH (intended) | LOW | Before merging, confirm with the user that real submissions are wanted from the moment of merge. (User has confirmed survey is live and important.) |
| R10 | Bundling 12 phases into one PR creates a review burden so high the PR sits unreviewed for days, accumulating merge conflicts | MEDIUM | MEDIUM | (a) Per-phase commits, well-described, so reviewer can read commit-by-commit. (b) Final commit list summarised in the PR body. (c) Rebase-and-push aggressively if `main` advances. |
| R11 | A change passes unit tests but breaks a real browser flow we don't have a test for | MEDIUM | MEDIUM | Manual smoke checklist in the PR description: home page renders, audience CTAs work, signup submits, sondaj submits, footer links resolve. Reviewer ticks before approval. |
| R12 | GitNexus impact analysis is run only at the end and reveals a high-blast-radius change late | LOW | MEDIUM | Run `gitnexus_impact` on every renamed or deleted symbol *before* the rename, not after. Documented per phase below. |
| R13 | The PR ends up too big to ship safely, but the work has already been done | MEDIUM | HIGH | Have a fallback: if any single phase blows up, drop it and ship the rest. Phase ordering is chosen so the deferrable ones (M1, L8) are last. |

### Mitigations applied to the implementation flow

1. **Phase-by-phase test discipline.** After every phase: typecheck + full
   vitest run. No "I'll batch the tests at the end."
2. **GitNexus impact gate.** Before any rename or symbol deletion, run
   `gitnexus_impact({target: ..., direction: "upstream"})`. Findings logged
   in the PR description.
3. **Deprecated aliases for one PR window.** Renames keep the old name as
   a `@deprecated` alias.
4. **Pinned cache behaviour.** Phase 3 introduces a `mode` parameter that
   resolves to the current Next.js directive; tests pin the resolved value
   per fetcher.
5. **Two-tier error discriminators.** `instanceof` AND `error.name`-based
   discriminators ship together in Phase 4.
6. **Snapshot before refactor.** Phase 12 adds a render snapshot of
   `SurveyForm` *before* the rewrite, then asserts the snapshot survives
   the split.
7. **Manual smoke checklist** in the final PR description.
8. **Deferral hatch.** If Phase 12 (the highest-risk one) requires more
   time than the PR can absorb, it ships separately. Phases 1-11 do not
   depend on it.

---

## Phase 1 — CRITICAL: unblock survey submissions (NF1)

**Why now:** survey form is currently broken in production. Every other
refactor compounds the user-visible impact if shipped first.

### Feature

```gherkin
Feature: Sender survey persists to Strapi
  In order to collect feedback from senders
  As Adrian (PM)
  I want each completed survey to land as a row in Strapi admin

  Background:
    Given the Strapi `survey-sender` content type is published
    And the API token has `create` permission on `survey-sender`

  Scenario: Sender submits the survey
    Given a sender opens "/sondaj/expeditori"
    When they fill in identity, context, decision, problems, and trust
    And they click "Trimite răspunsurile"
    Then the form shows the success state
    And a new row appears in Strapi admin under "Survey Senders"

  Scenario: Strapi rejects the payload
    Given Strapi returns 400 for the POST
    When the user clicks submit
    Then the user sees the friendly Romanian upstream-error message
    And no success state is shown
```

### TDD cycle

**Red:** add a failing route-handler test in `tests/api/survey-route.test.ts`
asserting the outgoing fetch URL ends with `/api/survey-senders`. Today
the test would pass against `/api/survey-responses`; flip the assertion to
the new URL.

**Green:** change `lib/survey.ts:16` from `survey-responses` to
`survey-senders`. One-line diff.

**Refactor:** none yet (deferred to Phase 3 H1).

### Verify
- `npx vitest run tests/api/survey-route.test.ts` — green.
- Manual: submit one survey on the deployed site; confirm row appears in
  Strapi admin under *Content Manager → Survey Senders*.

### Files
- `lib/survey.ts` (1 line)
- `tests/api/survey-route.test.ts` (assertion update)

---

## Phase 2 — LOW (do early): test `humanizeFormError` (L4)

**Why early:** lock the contract before Phase 5 (M4) refactors the error
classes.

### Feature
```gherkin
Feature: Form errors are translated to user-readable Romanian
  Scenario Outline: Each error class produces the right copy
    Given the form submission throws <error>
    When humanizeFormError is invoked with a default message
    Then it returns "<copy>"

    Examples:
      | error                                              | copy                   |
      | new TypeError("Failed to fetch")                   | network message        |
      | new Error("Strapi /api/foo failed: 502")           | upstream message       |
      | new Error("Email invalid")                         | "Email invalid"        |
      | "weird non-Error throwable"                        | default message        |
```

### TDD cycle
**Red:** create `tests/lib/form-errors.test.ts`. Four cases per the table
above. Run — they fail because the file doesn't exist.

**Green:** the production code already passes these — the test is purely
a contract lock. (If any case fails, that's a bug in the current code we
should fix before proceeding.)

**Refactor:** none.

### Verify
- 4 new tests pass.
- 100% line coverage on `lib/form-errors.ts`.

---

## Phase 3 — HIGH: extract `lib/strapi-client.ts` (H1)

### Feature
```gherkin
Feature: All Strapi calls flow through a single client
  As an engineer
  I want one place to configure Strapi auth, base URL, and caching
  So that a config bug requires one fix, not three

  Scenario: All callers use the shared helper
    When the codebase is searched for `process.env.NEXT_PUBLIC_STRAPI_URL`
    Then the only match is in `lib/strapi-client.ts`

  Scenario: Trailing slashes are normalised once
    Given NEXT_PUBLIC_STRAPI_URL is "https://example.com///"
    When any fetcher calls strapiFetch("/api/foo")
    Then the request URL is "https://example.com/api/foo"
```

### TDD cycle

**Red:** create `tests/lib/strapi-client.test.ts` with three tests:
1. `strapiUrl()` strips trailing slashes.
2. `authHeaders()` returns `{}` when token absent, `{ Authorization: "Bearer X" }` when present.
3. `strapiFetch("/api/foo")` calls `fetch` with the right URL and merged headers.
   Use `vi.spyOn(global, "fetch")`.

**Green:** create `lib/strapi-client.ts` with the three exports. Mirror
the existing logic.

**Refactor (in the same PR):**
- Delete the three duplicates from `lib/strapi.ts`, `lib/survey.ts`,
  `lib/routes-api.ts`. Each imports from `@/lib/strapi-client`.
- Add a `mode: "static" | "fresh" | "no-store"` parameter to `strapiFetch`
  that maps to the right Next.js cache directive. Existing callers keep
  current behaviour.

### Verify
- `npx tsc --noEmit` clean.
- `grep -rn "process.env.NEXT_PUBLIC_STRAPI_URL" lib/` returns one match
  (`strapi-client.ts`).
- All 291 existing tests still pass.

### Files
- New: `lib/strapi-client.ts`, `tests/lib/strapi-client.test.ts`
- Modified: `lib/strapi.ts`, `lib/survey.ts`, `lib/routes-api.ts`

---

## Phase 4 — MEDIUM: typed Strapi error hierarchy (M4)

Depends on Phase 3.

### Feature
```gherkin
Feature: Strapi failures carry typed metadata, not regex-parseable strings
  Scenario: Upstream 502 surfaces as a typed error
    Given Strapi returns 502 for /api/waitlist-submissions
    When submitWaitlist is invoked
    Then it throws StrapiUpstreamError with status=502 and path="/api/waitlist-submissions"

  Scenario: 401/403 surfaces as auth error
    Given Strapi returns 401
    When any fetcher is invoked
    Then it throws StrapiAuthError

  Scenario: humanizeFormError uses instanceof, not regex
    Given an error of class StrapiUpstreamError
    When humanizeFormError is invoked
    Then it returns the upstream copy without inspecting `error.message`
```

### TDD cycle

**Red:** add tests in `tests/lib/strapi-client.test.ts`:
- `strapiFetch` with mocked 401 throws `StrapiAuthError`.
- `strapiFetch` with mocked 502 throws `StrapiUpstreamError` with `status` + `path`.
- Update `tests/lib/form-errors.test.ts` to assert
  `humanizeFormError(new StrapiUpstreamError("/api/x", 502))` returns the
  upstream message.

**Green:**
- Add error classes to `lib/strapi-client.ts`.
- Make `strapiFetch` map response status → typed error.
- Update `humanizeFormError` to switch on `instanceof` (with a `name`-based
  fallback `isStrapiError(e)` to defend against realm boundaries).

**Refactor:** delete the regex branch in `humanizeFormError`. Delete the
templated error strings in `lib/survey.ts` and `lib/strapi.ts`
(`submitWaitlist`/`submitSurvey`).

### Files
- Modified: `lib/strapi-client.ts`, `lib/form-errors.ts`,
  `lib/strapi.ts`, `lib/survey.ts`
- Tests updated.

---

## Phase 5 — MEDIUM: canonical role enums (H3 + L2 + L6)

### Feature
```gherkin
Feature: Roles are defined once and validated everywhere
  Scenario: Single source of truth
    When the codebase is searched for the literal "expeditor"
    Then the only definitions are in lib/roles.ts and Strapi

  Scenario: Survey roles ≠ waitlist roles by design
    Given the survey supports `expeditor, transportator, ambele`
    And the waitlist supports `expeditor, transportator, destinatar`
    Then both subsets are explicit named exports of `lib/roles.ts`

  Scenario: Audience CTA validates role before composing URL
    Given a CMS card has role="future-unknown-value"
    When Audience renders
    Then the rendered href is "/" (safe fallback) and an error is logged
```

### TDD cycle

**Red:** create `tests/lib/roles.test.ts`:
1. `WaitlistRoles` and `SurveyRoles` are subsets of `AllRoles`.
2. `parseRole(value, fallback)` returns the value when it's in `AllRoles`,
   the fallback otherwise.
3. (For L6) `Audience` test: a card with an invalid role renders a fallback href.

**Green:**
- Create `lib/roles.ts` with `ALL_ROLES`, `WAITLIST_ROLES`, `SURVEY_ROLES`,
  matching Zod enums, and a single `parseRole` function.
- Migrate `lib/waitlist-schema.ts`, `lib/survey-schema.ts` to import
  from `lib/roles.ts`.
- Delete the duplicate `parseRole` from `SignupForm.tsx` and
  `SurveyForm.tsx`. Import from `lib/roles.ts`.
- Add bounds check in `Audience.tsx`.
- Drop the `Role` re-export from `lib/types.ts` (or convert to a thin
  re-export of `WaitlistRole` for one release, then delete).

**Refactor:** none beyond the deletions above.

### Files
- New: `lib/roles.ts`, `tests/lib/roles.test.ts`
- Modified: `lib/types.ts`, `lib/waitlist-schema.ts`, `lib/survey-schema.ts`,
  `components/landing/SignupForm.tsx`, `components/survey/SurveyForm.tsx`,
  `components/landing/Audience.tsx`, plus their tests.

### Risk
- Type errors at every call site of the deprecated `Role` from `lib/types.ts`.
  Mitigated by keeping the alias for one phase, then removing.

---

## Phase 6 — HIGH: dedupe editorial page routes (H2)

### Feature
```gherkin
Feature: Editorial pages share one renderer
  Scenario Outline: Each editorial page renders the same shell
    Given the slug "<slug>"
    When the user navigates to "/<slug>"
    Then the page renders the title, lastUpdated and body from CMS or fallback
    And the layout matches the shared <EditorialPageView> component

    Examples:
      | slug              |
      | confidentialitate |
      | termeni           |
      | despre-proiect    |

  Scenario: Adding a new editorial page is one line + one entry
    Given a developer wants to add "cookie-policy"
    When they add "cookie-policy" to EditorialPageSlug
    And add a fallback entry to EDITORIAL_FALLBACK
    And add a 5-line route file
    Then the new page renders with no other code changes
```

### TDD cycle

**Red:** create `tests/components/EditorialPageView.test.tsx` with three
tests (one per slug) asserting the rendered shell. Test fails because the
component doesn't exist yet.

**Green:**
- Create `components/editorial/EditorialPageView.tsx` (server component).
- Export `makeEditorialMetadata(slug)` that returns a `generateMetadata`
  function for the route.
- Replace each of the three route files with a 5-line shim.

**Refactor:** delete the duplicated `loadPage`/`generateMetadata` bodies
from the three pages.

### Files
- New: `components/editorial/EditorialPageView.tsx`,
  `tests/components/EditorialPageView.test.tsx`
- Modified: `app/(marketing)/{confidentialitate,termeni,despre-proiect}/page.tsx`

---

## Phase 7 — MEDIUM: shared `FormStatus` (M3)

### Feature
```gherkin
Feature: Form status is a single typed enum across the app
  Scenario: Both forms compare against the same constants
    When the codebase is searched for the literal "submitting"
    Then matches are limited to lib/form-status.ts and tests
```

### TDD cycle
**Red:** add `tests/lib/form-status.test.ts` asserting the enum members.

**Green:** create `lib/form-status.ts`. Migrate both forms.

**Refactor:** delete the local `Status` types.

---

## Phase 8 — MEDIUM: slim Footer (M5)

Depends on the CMS edits already shipped (PR #9 round).

### Feature
```gherkin
Feature: Footer trusts the CMS for hrefs
  Scenario: All footer links use the CMS href verbatim
    Given a CMS link with href="/foo"
    When Footer renders
    Then the rendered <a> has href="/foo"

  Scenario: Bare anchors are normalised for off-landing pages
    Given a CMS link with href="#signup"
    When Footer renders on /sondaj/expeditori
    Then the rendered <a> has href="/#signup"
```

### TDD cycle
**Red:** update `tests/components/Footer.test.tsx` (create if missing)
with the two scenarios. Today's override map test cases would be removed.

**Green:** delete the override map. Keep only the bare-anchor
normalisation.

**Refactor:** none.

### Risk
- If Strapi state regresses to `#` placeholders, the footer breaks again.
  Mitigation: add a CI check (or a startup check in `lib/strapi-client.ts`
  in dev mode) that warns if any footer link has href === "#".

---

## Phase 9 — LOW: structured logger (L1)

### Feature
```gherkin
Feature: All non-test logging goes through a single logger
  Scenario: Replacing the logger affects all sites
    When the codebase is searched for `console.error` outside tests/
    Then the only match is in lib/logger.ts
```

### TDD cycle
**Red:** add `tests/lib/logger.test.ts` asserting the format.

**Green:** create `lib/logger.ts`. Migrate the five `console.error` sites.

---

## Phase 10 — LOW: routes-api consistency (L3) + tests setup dedup (L7)

Both are mechanical. Bundle into one PR.

---

## Phase 11 — LOW: dependency-cruiser (L8)

### Feature
```gherkin
Feature: Architectural boundaries are enforced by CI
  Scenario: components/ may not import from app/
    When dependency-cruiser runs
    Then any import from components/* to app/* fails the build

  Scenario: lib/ is leaf-only
    When dependency-cruiser runs
    Then any import from lib/* to components/* or app/* fails the build
```

### TDD cycle
**Red:** add `.dependency-cruiser.cjs` with the rules above. Run —
should pass today (we've verified manually).

**Green:** add to CI (`make check-architecture` if a Makefile is added,
otherwise an `npm run check:deps` script invoked from `.github/workflows/ci.yml`).

**Refactor:** if any current import violates a rule, fix the import — do
not weaken the rule.

---

## Phase 12 — DEFERRED to its own PR (M1 + NF2 prep)

**Decision (2026-05-14):** Phase 12 is **not** included in the bundled PR.
Rationale, per the R13 mitigation:

- The bundled PR already covers 11 phases (~20 file changes). Adding a
  600-line refactor on top dilutes review focus.
- GitNexus impact analysis confirms `SurveyForm` has **zero upstream
  callers** outside `app/(marketing)/sondaj/expeditori/page.tsx` and the
  test file — risk is contained to the file itself, so the split can ship
  later without affecting anything we land now.
- NF2 (transporter survey) is the natural trigger for extracting a shared
  `<IdentitySection>`. Doing both in one PR (split + new feature) gives a
  cleaner story than a "split for its own sake" PR.

The plan content below stays as the spec for the deferred PR.

---

### Original Phase 12 plan — now ships as `refactor/m1-survey-split` (separate PR)

Depends on Phase 5 (canonical roles) and Phase 7 (FormStatus).

### Feature
```gherkin
Feature: Sender survey is composed of focused sections
  Scenario: Each section can be rendered and tested in isolation
    Given the SurveyForm is split into 8 section components
    When a developer modifies the "Trust" section
    Then only Trust-related tests need to re-run
    And the rest of the survey is untouched

  Scenario: IdentitySection is reusable
    Given <IdentitySection state={...} dispatch={...} />
    When mounted in TransporterSurveyForm
    Then it behaves identically to the sender form's identity capture
```

### TDD cycle

**Red:** for each new section, create a test in
`tests/components/survey/<Section>.test.tsx` asserting the section
renders given a state stub and dispatches the right action on input.

**Green:** prototype both `useReducer` and grouped-`useState` shapes;
ship whichever is smaller and clearer (per §6.1 critique). Extract the
8 section components.

**Refactor:** drop the original monolith. Verify all integration tests
in `tests/components/SurveyForm.test.tsx` still pass.

### Files
- New: `lib/survey-state.ts` (if useReducer wins),
  `components/survey/sections/{Identity,Context,Process,Decision,Problems,Trust,Ideal,Validation}Section.tsx`,
  matching tests.
- Modified: `components/survey/SurveyForm.tsx` (becomes the orchestrator).

---

## Phase 13 — MEDIUM/FEATURE: transporter survey (NF2)

Separate from the refactor scope but enabled by it. Tracked here so the
plan is complete; ship as its own epic.

### Feature
```gherkin
Feature: Transporters can submit a tailored survey
  Background:
    Given Strapi has the `survey-transporter` content type published
    And the IdentitySection is reusable (from Phase 12)

  Scenario: Transporter submits the survey
    Given a transporter opens "/sondaj/transportatori"
    When they fill in identity, route patterns, client acquisition, and pricing
    And they click submit
    Then a row appears in Strapi admin under "Survey Transporters"
```

### Files (high level)
- `lib/survey-transporter-schema.ts`
- `lib/survey-client.ts` — `submitTransporterSurvey()`
- `app/api/survey-transporter/route.ts`
- `components/survey/TransporterSurveyForm.tsx`
- `app/(marketing)/sondaj/transportatori/page.tsx`
- Tests across all layers.

---

## Done definition for the whole refactor

The refactor is "done" when:

1. `grep -rn "process.env.NEXT_PUBLIC_STRAPI_URL" lib/` returns one match.
2. `grep -rn "function strapiUrl\|function authHeaders" lib/` returns one match each.
3. The Footer override map (`FOOTER_HREF_OVERRIDES`) does not exist.
4. `lib/types.ts` no longer exports `Role` (or only re-exports for compat).
5. No `console.error` outside `tests/` or `lib/logger.ts`.
6. CI runs `dependency-cruiser` as a required check.
7. All tests still green; coverage on touched files ≥ 80%.
8. The findings document is updated with each finding marked **DONE** or
   explicitly **DEFERRED** with a reason.

---

## Rollout

| Phase | Estimated effort | Sequencing |
|-------|------------------|------------|
| 1 (NF1)         | 5 min        | Immediately, alone |
| 2 (L4)          | 15 min       | Immediately after Phase 1 |
| 3 (H1)          | 30 min       | After Phase 2 |
| 4 (M4)          | 1h           | After Phase 3 |
| 5 (H3+L2+L6)    | 1.5h         | Independent of Phase 3-4 |
| 6 (H2)          | 1h           | Independent |
| 7 (M3)          | 30 min       | Independent |
| 8 (M5)          | 30 min       | Independent |
| 9 (L1)          | 15 min       | After Phase 4 |
| 10 (L3+L7)      | 45 min       | Independent |
| 11 (L8)         | 1h           | Last; verifies the rest didn't break boundaries |
| 12 (M1+NF2 prep)| 4h           | After Phase 5, 7 |
| 13 (NF2 feature)| 6-8h         | After Phase 12, 3, 4 |

Ship phases 1-3 in week 1. The rest can be paced over 2-3 weeks without
blocking feature work.
