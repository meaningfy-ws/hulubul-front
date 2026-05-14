# Codebase findings & proposed refactor solutions

**Date:** 2026-05-14
**Author:** post-QA refactor analysis (GitNexus + Strapi probes + manual review)
**Scope:** All commits up to and including PR #9 (`fix/form-ux-followups`).
**Status:** Draft 1 — to be revised after re-verification (see §6).

---

## 1. Executive summary

The repo is healthy at the macro level: 291 unit tests pass, type-check is
clean, the layered structure (`app/` → `components/` + `lib/`) is consistent,
and the GitNexus impact analysis on the latest branch shows zero broken
upstream callers. Three rounds of fast iteration (waitlist v2, transporter
seed, QA fixes, form UX follow-ups) have, however, accumulated localised
duplication and a handful of Meaningfy-anti-pattern smells worth resolving
before the next feature wave.

The findings below are prioritised **HIGH / MEDIUM / LOW** by *defect
potential × cost to fix later*, not by code volume.

---

## 2. Method

- **GitNexus structural analysis:** clusters, fan-in by file/symbol,
  function size by LOC, and impact analysis of the current branch against
  `main`.
- **Static grep / read** for free strings, duplicated function names,
  inconsistent enum members, layering violations.
- **Live Strapi probes** against the cloud instance to confirm schema vs.
  frontend assumptions.

Evidence is cited inline with `file:line` references throughout.

---

## 3. HIGH — duplication / DRY violations

### H1. `strapiUrl()` and `authHeaders()` triplicated

**Evidence:**
- `lib/strapi.ts:14-23`
- `lib/survey.ts:3-12`
- `lib/routes-api.ts:4-13`

Identical code. GitNexus fan-in: 8 callers each (per file). A config
adjustment (e.g. trailing-slash handling) requires three identical edits.

**Proposed solution:**
Create `lib/strapi-client.ts` exporting:

- `strapiUrl(): string`
- `authHeaders(): Record<string, string>`
- `strapiFetch(path: string, init?: RequestInit): Promise<Response>` — thin
  helper that prepends the URL and merges auth headers, so callers stop
  repeating the `${strapiUrl()}/api/foo` + `headers: { ...authHeaders() }`
  template.

The three existing files become thin call-site adapters that compose
`strapiFetch`.

**Cost:** ~30 min. **Blast radius:** LOW — three files, all in `lib/`.

---

### H2. Three editorial-page route files are 90% identical

**Evidence:**
- `app/(marketing)/confidentialitate/page.tsx`
- `app/(marketing)/termeni/page.tsx`
- `app/(marketing)/despre-proiect/page.tsx`

Each is 42 lines, differing only in the slug literal, the page-component
name, and the `console.error` prefix. Adding a fourth editorial page
guarantees a third copy.

**Proposed solution (option A — shared component):**
Factor a server component `<EditorialPageView slug={slug} />` in
`components/editorial/EditorialPageView.tsx`. Each route file becomes:

```tsx
export const generateMetadata = makeEditorialMetadata("termeni");
export default function TermsPage() {
  return <EditorialPageView slug="termeni" />;
}
```

**Proposed solution (option B — dynamic route):**
Single `app/(marketing)/[editorialSlug]/page.tsx` with
`generateStaticParams` returning the known slug list. Adding a new page =
one slug in `EditorialPageSlug` + one fallback entry; no new files.

**Recommendation:** B is cleaner long-term; A is closer to the existing
shape and easier to revert. Pick during planning.

**Cost:** ~1h. **Blast radius:** LOW — only the three pages, no callers
import them.

---

### H3. `Role` enum has three sources of truth — and they disagree

**Evidence:**

| File                          | Members                                            |
|-------------------------------|----------------------------------------------------|
| `lib/types.ts:1`              | `expeditor, transportator, destinatar`             |
| `lib/waitlist-schema.ts:3`    | `expeditor, transportator, destinatar`             |
| `lib/survey-schema.ts:5`      | `expeditor, transportator, ambele` (no destinatar) |
| Strapi waitlist-submission    | `expeditor, transportator, ambele, destinatar`     |

Plus two private `ROLES` constants:
- `components/landing/SignupForm.tsx:69`
- `components/survey/SurveyForm.tsx:38`

This is the textbook Meaningfy "free strings as semantic markers"
anti-pattern. The current invariant — *waitlist roles ≠ survey roles* — is
implicit and easily violated by a typo.

**Proposed solution:**

Create `lib/roles.ts`:

```ts
import { z } from "zod";

export const ALL_ROLES = ["expeditor", "transportator", "ambele", "destinatar"] as const;
export type Role = (typeof ALL_ROLES)[number];
export const allRoleEnum = z.enum(ALL_ROLES);

// Filtered subsets — explicit, audited, single source of truth.
export const WAITLIST_ROLES = ["expeditor", "transportator", "destinatar"] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];
export const waitlistRoleEnum = z.enum(WAITLIST_ROLES);

export const SURVEY_ROLES = ["expeditor", "transportator", "ambele"] as const;
export type SurveyRole = (typeof SURVEY_ROLES)[number];
export const surveyRoleEnum = z.enum(SURVEY_ROLES);
```

`lib/types.ts`, `lib/waitlist-schema.ts`, `lib/survey-schema.ts` all import
from here. The two component-local `ROLES` constants disappear.

**Cost:** ~1h (touches 5 files + tests). **Blast radius:** MEDIUM — the
two form components and validation paths. Caught by tests.

---

## 4. MEDIUM — architectural smell

### M1. `SurveyForm.tsx` violates SRP at the file level

**Evidence (GitNexus + LOC):**
- `SurveyBody`: **426 lines** in one function
- `SurveyForm`: **185 lines** wrapping it
- **28 `useState` calls** in the file
- Renders 8 sections in a single tree

Per the Meaningfy guide ("functions and classes small and cohesive"), this
is well past the threshold and is the single most painful file in the repo
to extend safely.

**Proposed solution (three reviewable steps):**

1. Replace the 28 `useState`s with a `useReducer<SurveyState, SurveyAction>`.
   Move state, actions and the reducer to `lib/survey-state.ts`. Tests cover
   the reducer in isolation.
2. Extract sections into `components/survey/sections/`:
   - `IdentitySection`, `ContextSection`, `ProcessSection`, `DecisionSection`,
     `ProblemsSection`, `TrustSection`, `IdealSection`, `ValidationSection`.
   Each accepts `{ state, dispatch }`.
3. `SurveyForm` becomes the orchestrator (~80 lines): initial state,
   prefill effect, `onSubmit`, success view.

**Bonus:** unlocks per-section unit tests, currently impractical.

**Cost:** 3-4h on a dedicated branch. **Blast radius:** HIGH within the
component, LOW outside (no other code imports from inside `SurveyForm`).

---

### M2. `CityTagInput.tsx` (450 LOC, 330-line component fn)

Mixes input control, autocomplete fetch, dropdown rendering, keyboard nav
and sortable chip list. Same SRP issue as M1, smaller scale.

**Proposed solution:**
- Extract `useCityAutocomplete()` hook (fetch + suggestion state).
- Extract `<CityChipList>` for the sortable chip rendering.
- `CityTagInput` keeps the input + dropdown layout (~150 lines).

**Cost:** 2h. **Blast radius:** MEDIUM — tests already cover the public
behaviour; refactor should be invisible to callers.

**Note:** this file is **stable** (last touched April 28). Refactor only
if M1 frees up time, otherwise defer until next feature touches it.

---

### M3. `Status` form-state type duplicated in both forms

**Evidence:**
- `components/landing/SignupForm.tsx:67`: `type Status = "idle" | "submitting" | "success" | "error"`
- `components/survey/SurveyForm.tsx:41`: same definition

Plus the literal strings `"submitting"`, `"success"`, etc. compared inline
across both files (free-string anti-pattern again).

**Proposed solution:**
`lib/form-status.ts`:

```ts
export const FORM_STATUS = {
  Idle: "idle",
  Submitting: "submitting",
  Success: "success",
  Error: "error",
} as const;
export type FormStatus = (typeof FORM_STATUS)[keyof typeof FORM_STATUS];
```

Both forms import. Inline checks become `status === FORM_STATUS.Submitting`.

**Cost:** 30 min. **Blast radius:** LOW — two files + their tests.

---

### M4. Inconsistent error model between Strapi fetchers

**Evidence:**

| Function           | On 404            | On other failure          |
|--------------------|-------------------|---------------------------|
| `getLandingPage()` | throws `LandingPageNotPublishedError` | throws raw `Error`        |
| `getEditorialPage()` | returns `null`  | throws raw `Error`        |
| `submitWaitlist()` | n/a (POST)        | throws raw `Error` with templated message |
| `submitSurvey()`   | n/a               | throws raw `Error` with templated message |

`humanizeFormError` (`lib/form-errors.ts:34`) then **regex-matches** the
templated message strings (`/strapi .*failed:\s*\d+/i`) to recover the
shape. This is precisely the "free strings everywhere" smell from the
Meaningfy guide.

**Proposed solution:**
Define an error hierarchy in `lib/strapi-client.ts` (next to H1):

```ts
export class StrapiError extends Error { /* base */ }
export class StrapiNotFoundError extends StrapiError {}
export class StrapiAuthError extends StrapiError {}
export class StrapiUpstreamError extends StrapiError {
  constructor(public path: string, public status: number) { /* ... */ }
}
```

`strapiFetch` (from H1) maps response status to the right class.
`humanizeFormError` switches on `instanceof` instead of regex.

**Cost:** 1h (depends on H1). **Blast radius:** MEDIUM — touches all
fetchers and the form-error mapper.

---

### M5. Footer override map is brittle — free strings as keys

**Evidence:**
`components/landing/Footer.tsx:8-15`

```ts
const FOOTER_HREF_OVERRIDES: Record<string, string> = {
  "lista de așteptare": "/#signup",
  "confidențialitate": "/confidentialitate",
  ...
};
```

Keyed on **lowercase Romanian labels**. If an editor changes
*"Despre proiect"* to *"Despre noi"*, the override silently stops working.
Now that the CMS values have been corrected (PR #9 round), most of this
map is dead weight serving no purpose.

**Proposed solution:**
- Delete the label-keyed override map.
- Keep only the bare-anchor normalisation (`href.startsWith("#")` →
  prefix `/`) as a defensive default for legacy CMS entries.
- Optional, longer-term: add a `slot` enum field to the Strapi link
  component (`waitlist | privacy | terms | about | survey | other`) so
  routing is keyed on a stable id rather than display text.

**Cost:** 30 min for the deletion; CMS schema change is backend work.
**Blast radius:** LOW — Footer tests cover behaviour.

---

## 5. LOW — polish

### L1. Five ad-hoc `console.error` call sites
Each editorial page + the marketing layout do
`console.error("[scope] message:", error)` with hand-rolled prefixes.
**Solution:** single `lib/logger.ts` exposing `logger.error(scope, message, error)`.
Future swap to Sentry/Datadog is a one-line change. **Cost:** 15 min.

### L2. `parseRole` defined twice
`SignupForm.tsx:70` and `SurveyForm.tsx:42` — same function. Move to
`lib/roles.ts` (alongside H3). **Cost:** trivial; bundle with H3.

### L3. `lib/routes-api.ts` — `ROUTES_POPULATE` half-used
Defined at line 15, used by `getRoute` (line 34) but `getRoutes` (line 20)
re-builds the same query via `URLSearchParams.set`. Inconsistent.
**Solution:** pick one approach and use it in both. **Cost:** 15 min.

### L4. No unit test for `humanizeFormError`
Pure function in `lib/form-errors.ts` — three tests would lock the contract:
TypeError → network message; `"Strapi … failed: 502"` → upstream message;
passthrough for arbitrary string. **Cost:** 15 min.

### L5. Hardcoded `Sondaj pentru expeditori` link in Footer
`components/landing/Footer.tsx:53-55` — comment admits it's a stopgap.
**Solution:** add it to the CMS footer column or formalise as a `surveyLink`
slot. **Cost:** depends on backend coordination.

### L6. `Audience.tsx` interpolates `card.role` into URLs without bounds check
Today `role` is typed `Role`, so it's safe. Worth wrapping in an enum check
(using H3's canonical set) to defend against a future CMS field change
leaking unsafe values. **Cost:** 10 min, bundle with H3.

### L7. `tests/setup.ts` duplication
GitNexus shows `getItem`/`setItem`/`removeItem` (fanIn 8/8/7) — manual
localStorage stubs reused across many tests. Extract to
`tests/utils/storage-stub.ts`. **Cost:** 30 min.

### L8. No import-linter equivalent for TS
Layered structure exists informally but is not enforced. Install
**`eslint-plugin-boundaries`** or **`dependency-cruiser`** with rules:
- `components/` may not import from `app/`
- `lib/` may not import from `components/` or `app/`
- `app/api/*` is the only allowed POST/PUT writer to Strapi

**Cost:** 1h to install + configure. Per Meaningfy guide §5, this is the
TS analogue of `importlinter`.

---

## 6. Revision pass — verification, critique, and adjustments

Each finding from §3-§5 was re-verified by (a) GitNexus `context()`/`impact()`,
(b) direct code reads of the cited line ranges, and (c) live Strapi probes
where backend state matters. The probe surfaced a **major new finding (NF1)**
that supersedes the previous "backend ticket needed" stance on survey.

### 6.0 New findings from re-verification

#### NF1 (CRITICAL) — Survey form points at the wrong endpoint

**Evidence (Strapi probe, 2026-05-14):**
- `GET /api/survey-responses` → **404** (does not exist)
- `GET /api/survey-senders` → **200** (new content type, schema below)
- `GET /api/survey-transporters` → **200** (new content type, transporter-specific)

The backend has shipped two new collection types since the QA report:

```
api::survey-sender.survey-sender
  attributes: name, email, whatsapp, role (expeditor|transportator|ambele),
  routes, source (waitlist_followup|standalone|other), sendingFrequency,
  packageTypes, packageTypesOther, howFindTransporter, howFindTransporterOther,
  searchDuration, contactedCount, selectionCriteria, safetyPriceAttitude,
  painPointsStructured, painPointDetails, issuesExperienced, trustSignals,
  platformTrustRequirements, idealExperience, biggestTimeSaver, willShipSoon,
  wantsCallback, callbackPhone

api::survey-transporter.survey-transporter
  attributes: name, email, whatsapp, transporterType, source, experienceYears,
  tripFrequency, usualRoutes, collectionPoints, departurePreparation,
  howFindClients, howFindClientsOther, hasCapacityGaps, capacityGapsDetails,
  packageTracking, pricingMethod, clientCommunication, biggestChallenge,
  issuesExperienced, issuesDetails, refusedPackageTypes, hadCustomsIssues,
  customsIssuesDetails, preferredRequestChannel, preferredRequestChannelOther,
  platformBarriers, hasUpcomingTrip, acceptsNewClients, wantsCallback,
  callbackPhone
```

The `survey-sender` schema is a **field-for-field match** of our
`lib/survey-schema.ts`. PR #8's `design/spec-survey-backend.md` documented
the need for this content type; the backend team shipped it under a
different name (`survey-sender` instead of `survey-response`).

**Consequence:** the QA Issue 05 ("survey 405/404 error") is **fixable
entirely from this repo** with a one-line change in `lib/survey.ts:16`:

```diff
- const res = await fetch(`${strapiUrl()}/api/survey-responses`, { ... });
+ const res = await fetch(`${strapiUrl()}/api/survey-senders`, { ... });
```

This **must** ship before any of the other refactors — it unblocks live
data collection.

**Critique:** the field name `survey-sender` is awkward in the API URL
context (`/api/survey-senders` reads like a list of sender entities, not
sender survey responses), but renaming is backend-side work and not worth
delaying the fix. We can document the naming and revisit later.

---

#### NF2 (MEDIUM) — Transporter survey backend exists, frontend has nothing

**Evidence:** `survey-transporter` content type exists with 31 attributes
covering the transporter use case (`transporterType`, `experienceYears`,
`tripFrequency`, `usualRoutes`, `howFindClients`, `pricingMethod`, etc.).

The earlier user note ("we will need per-role question branches") is now
unblocked: the backend already accepts transporter responses; the frontend
needs (a) a new schema in `lib/survey-transporter-schema.ts`, (b) a new
form at `/sondaj/transportatori`, (c) a new fetcher in
`lib/survey.ts` (the soon-to-be-renamed `lib/survey-client.ts` after H1).

**Recommendation:** do **not** branch the existing sender form per role
(my original M1 proposal). The two surveys have radically different
question sets — branching would force a mega-form. Instead, ship two
parallel forms, share only the identity/contact section as a subcomponent.

This effectively **changes the scope of M1**: instead of just splitting
`SurveyForm` into sections, we extract a reusable `<IdentitySection>` and
ship a fresh `TransporterSurveyForm` alongside.

---

#### NF3 (LOW) — Strapi has unused blog-template content types

**Evidence:** `api::about.about`, `api::article.article`,
`api::author.author`, `api::category.category`, `api::global.global` —
these are leftovers from the Strapi blog template starter. `/api/about`
returns *"About the strapi blog"*. None are referenced from this repo.

**Recommendation:** ask the backend team to delete them on next maintenance
window. Not a frontend change; documented here for traceability.

---

### 6.1 Revisions to existing findings

#### H1 (`strapiUrl`/`authHeaders` triplicated) — **CONFIRMED, no change**
GitNexus `context("strapiUrl")` returns 3 candidates with disjoint file
paths, confirming the duplication. Solution stands. Add: the soon-to-exist
`survey-transporter` fetcher (NF2) makes the case stronger — without H1,
we'd add a fourth copy.

**Critique:** the `strapiFetch` helper proposed earlier should also
**centralise the cache directive**. Today: `getLandingPage` uses
`revalidate: 300`, `getEditorialPage` uses `revalidate: 300`,
`submitWaitlist` uses `cache: "no-store"`, `getRoutes` uses `revalidate: 0`.
Inconsistent. The helper should accept a `mode: "static" | "fresh" | "no-store"`
parameter that resolves to the right Next.js caching directive.

#### H2 (3 editorial-page route files near-identical) — **CONFIRMED, refined**
Verified via reading all three files. They differ only in slug and page
name. **Choose option A** (shared component) over option B (dynamic route):
Next.js 15 dynamic routes interact awkwardly with `generateMetadata` for
i18n metadata, and a static set of three is easier to reason about. Each
route file becomes:

```tsx
import { EditorialPageView, makeEditorialMetadata } from "@/components/editorial/EditorialPageView";
export const generateMetadata = makeEditorialMetadata("termeni");
export default function TermsPage() { return <EditorialPageView slug="termeni" />; }
```

#### H3 (Role enum drift) — **DOWNGRADED to MEDIUM**

Re-verification shows the "drift" is by design, not by accident:

| Schema                          | Roles                                              | Backend match? |
|---------------------------------|----------------------------------------------------|----------------|
| `lib/waitlist-schema.ts`        | `expeditor, transportator, destinatar`             | Yes (Strapi has 4, frontend exposes 3 — `ambele` deprecated) |
| `lib/survey-schema.ts`          | `expeditor, transportator, ambele`                 | Yes (`survey-sender` Strapi enum is exactly these 3) |
| `lib/types.ts`                  | `expeditor, transportator, destinatar`             | Mirror of waitlist |

Each schema is internally consistent with its backend counterpart. The
real issue is **two Role aliases for the same set** (`lib/types.ts` ===
`lib/waitlist-schema.ts.Role`) and **no canonical superset** for shared
helpers like `parseRole` (L2).

**Revised solution:** still create `lib/roles.ts` as the single source of
truth, but ship it as **three explicit named exports** (`AllRoles`,
`WaitlistRoles`, `SurveyRoles`) and **delete the duplicate type from
`lib/types.ts`**. Drop the `lib/types.ts` `Role` alias entirely after
migrating the few imports.

#### M1 (`SurveyForm` SRP) — **REFINED by NF2**
Original plan stands for the sender form, with the addition of extracting
`<IdentitySection>` as a *shared* primitive ready for the transporter
survey. State management still becomes a `useReducer` in `lib/survey-state.ts`,
but the reducer becomes role-agnostic and can host both sender and
transporter actions later.

**Critique:** a `useReducer` for a 28-field form is not necessarily an
improvement — it can become its own monolith. Alternative: keep `useState`
calls but **group related state into 4-5 cohesive objects** (identity,
context, decision, problems, validation). Easier to read, less ceremony.

**Recommendation:** prototype both during the refactor; pick whichever
ends up smaller. Don't dogmatically adopt `useReducer`.

#### M2 (`CityTagInput`) — **CONFIRMED but DEPRIORITISED**
Stable file (last touched April 28, no churn since). Defer until the next
feature touches it.

#### M3 (`Status` type duplication) — **CONFIRMED, no change**
Verified by reading both files. Trivial fix.

#### M4 (Inconsistent error model) — **CONFIRMED, expanded**

Read `lib/form-errors.ts` directly: the regex `/strapi .*failed:\s*\d+/i`
matches messages produced by **all four** Strapi callers (`getLandingPage`,
`getEditorialPage`, `submitWaitlist`, `submitSurvey`). The error class
hierarchy proposed earlier is necessary; in addition, **`humanizeFormError`
should switch on `instanceof StrapiUpstreamError` rather than message
regex**. This gives us a typed `error.path` and `error.status` we can show
to the user with full fidelity in dev mode and a friendly message in
production.

**Critique:** introducing custom error classes in TypeScript-on-Next is
sometimes painful because of `instanceof` failing across realm boundaries
(e.g. server vs. client). Mitigation: also expose `isStrapiError(e)` /
`isStrapiUpstreamError(e)` discriminator functions that check a `name`
property, not the prototype chain. Same idiom React Query uses.

#### M5 (Footer override map) — **CONFIRMED, sharpened by Strapi probe**

Re-fetched footer state (2026-05-14):

```
Platformă:
  - Lista de așteptare → /#signup
  - Despre proiect    → /despre-proiect
Contact:
  - Confidențialitate → /confidentialitate
  - Termeni           → /termeni
```

All hrefs are now correct in the CMS itself. **The override map can be
deleted entirely** — keep only the bare-anchor normalisation as a defensive
default. The proposed Strapi `slot` enum is **moved to a backend-side
issue** (out of scope for this refactor).

#### L1 (logger) — **CONFIRMED, no change**
Five sites verified. Trivial extraction.

#### L2 (`parseRole` defined twice) — **CONFIRMED, bundled with H3**
Move to `lib/roles.ts` along with the canonical enums.

#### L3 (`ROUTES_POPULATE` half-used) — **CONFIRMED, no change**
Verified by reading `lib/routes-api.ts`. Pick one approach (recommendation:
keep the constant, refactor `getRoutes` to use it).

#### L4 (no test for `humanizeFormError`) — **CONFIRMED, expanded**
Add tests now: NF1 (survey URL change) and M4 (error class refactor) both
touch this surface. Test it before refactoring it.

#### L5 (hardcoded survey link in Footer) — **PARTIALLY OBSOLETE**
The user has indicated `/sondaj/expeditori` is being kept. With NF2's
plan to add `/sondaj/transportatori`, the Footer will need *two* survey
links eventually. Either both go to the CMS, or the hardcoded list grows
to two — neither great. **Recommendation:** put both in CMS as part of the
NF2 work; remove the hardcoded link.

#### L6 (`Audience.tsx` role bounds check) — **CONFIRMED, bundled with H3**
After the canonical enum exists, add a guard in `Audience.tsx` that
verifies `card.role` is in `AllRoles` before composing the URL.

#### L7 (test setup duplication) — **CONFIRMED, no change**
Trivial extraction.

#### L8 (no import-linter equivalent) — **CONFIRMED, no change**
Recommendation: `dependency-cruiser` over `eslint-plugin-boundaries`. The
former produces a graph as a side benefit, useful for future GitNexus
cross-checks.

---

### 6.2 Final priority matrix (post-revision)

| ID  | Priority | Effort | Blast | Blocks others? |
|-----|----------|--------|-------|----------------|
| **NF1** | **CRITICAL** | 5 min | LOW | none |
| L4  | LOW (do first) | 15 min | LOW | M4 |
| H1  | HIGH | 30 min | LOW | M4, NF2 |
| M4  | MEDIUM | 1h | MEDIUM | — |
| H3 + L2 + L6 | MEDIUM | 1.5h | MEDIUM | — |
| H2  | HIGH | 1h | LOW | — |
| M3  | MEDIUM | 30 min | LOW | — |
| M5  | MEDIUM | 30 min | LOW | — |
| L1  | LOW | 15 min | LOW | — |
| L3  | LOW | 15 min | LOW | — |
| L7  | LOW | 30 min | LOW | — |
| L8  | LOW | 1h setup | LOW | — |
| NF2 | MEDIUM | 6-8h (new feature) | LOW | — |
| M1  | MEDIUM | 3-4h | HIGH within file | — |
| M2  | DEFERRED | — | — | — |
| L5  | bundle with NF2 | — | — | — |
| NF3 | backend issue | n/a | n/a | — |

The companion plan document
`2026-05-14-codebase-refactor-plan.md` ships these in BDD/TDD form.

---

## 7. Appendix — verification artifacts

- **Live Strapi schema dump** (truncated to relevant types): see §6.0 NF1.
- **Footer state at 2026-05-14:** see §6.1 M5.
- **GitNexus impact analysis** of `combine/prs-3-5-7` (now merged as PR #8):
  27 affected processes, 0 broken upstream callers, risk = critical at the
  *file count* level but LOW at the *symbol semantics* level.
- **All findings cite `file:line` ranges**; re-running this analysis
  requires only a fresh `git pull` and a fresh Strapi probe with the
  same `.env.cloud` token.
