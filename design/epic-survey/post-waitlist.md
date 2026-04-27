# EPIC — Post-waitlist Survey

> **Status:** Spec only. Not implemented.
> **Date:** 2026-04-23.
> **Note 2026-04-27:** The role enum in this doc (`expeditor | transportator | ambele`) is superseded by `expeditor | transportator | destinatar` — see `design/spec-waitlist-backend.md` §4. Update §5 of this doc when survey implementation begins.
> **Scope:** this frontend repo (`hulubul-front`). Backend `survey-response` collection already exists at `/api/survey-responses` on Strapi Cloud — field list confirmed by live probe on 2026-04-23.
> **Relationship to other epics:**
> - Ships *after* the waitlist form but *before* `design/epic-signup/login.md` (no auth needed).
> - Soft-linked to `design/epic-signup/remember-me.md` via the stored `name`/`email` — a just-submitted waitlist visitor sees the survey pre-filled.
> - Standalone fallback: the survey works for someone who arrives directly at `/sondaj/expeditori` without having filled the waitlist.

## 1. Goal

Collect qualitative + quantitative signal from diaspora visitors about how they currently ship packages, what pains them, and what they'd expect from a platform. Used to prioritise product features and identify hot leads (people who'll ship within 2–4 weeks).

## 2. Non-goals

- **Not a form we force people through.** Survey is opt-in, post-waitlist.
- **No authentication.** Anonymous-to-the-frontend just like the waitlist form. Identity is `email` echoed forward from prefill or typed fresh.
- **No forced field completion.** All research fields are optional — partial responses are valuable data. Only identity fields (`name`, `email`, `role`, `source`) are required.
- **No in-form logic that gates enrolment.** Failing to submit the survey does not affect the user's waitlist status.
- **No multi-page wizard.** Sections are visually separated on a single page. Submit once, not five times. Complexity of a real wizard is not justified for ~25 fields.
- **No cross-device resume.** If a visitor starts the survey and closes the tab, they start over. Draft persistence is a follow-up epic if it becomes a pain point.
- **No analytics event wiring in this epic.** If later you want "section_completed" events, separate epic.
- **No admin-facing analytics view.** Data goes into Strapi; aggregation happens in a spreadsheet or Metabase, not in this frontend.
- **No hot-lead notification flow.** `willShipSoon === true` does not ping anyone; you read it out of Strapi admin for now. Automated alerts are a separate epic.

## 3. What IS in scope

This epic delivers the **sender-facing** survey only. Every research question is
framed from the expeditor's perspective ("cum găsești un transportator", "ce
trimiți", "cât ți-a luat să cauți"). A transporter-facing survey gets its own
page + field set in a separate epic.

1. A new route **`/sondaj/expeditori/expeditori`** rendering the full sender survey on one page.
2. A **CTA in the waitlist success state** — "Împărtășește experiența ta de expeditor (3 min) →" — that navigates to `/sondaj/expeditori/expeditori` and pre-fills identity from the remembered entry.
3. A **footer link** — "Sondaj pentru expeditori" — in the Platformă column.
4. **Pre-fill on `/sondaj/expeditori`** from:
   - `lib/remember-me.ts` (if the visitor has opted in and just filled the waitlist).
   - URL params (`/sondaj/expeditori?email=&name=&role=` — enables email-campaign links that open with identity).
5. A **`source` inference rule**: `waitlist_followup` if arrived via the success-state CTA (sets a one-shot sessionStorage flag), `standalone` otherwise. `other` reserved for future use.
6. A typed **Zod schema** mirroring the 25 backend fields with enum values and defaults.
7. A **Next.js Route Handler** at `/api/survey` that Zod-validates and proxies POSTs to `/api/survey-responses` with the server-side Bearer token.
8. A **success state** — "Mulțumim! Ne ajută enorm." with a link back to the landing page.

## 4. Architecture

Same pattern as the waitlist form. Option 1 (frontend is the API boundary).

```
  Browser → GET /sondaj/expeditori  (Server Component)
         ↓
  Page renders with placeholder identity defaults
         ↓
  Client component hydrates, reads:
    - sessionStorage "hulubul:from-waitlist" → source=waitlist_followup
    - URL ?email / ?name / ?role                → overrides
    - localStorage (remember-me)                → fallback for name/email/whatsapp
         ↓
  User fills sections (all optional except identity)
         ↓
  POST { name, email, role, source, ...research } → /api/survey
         ↓
  Route handler:
    1. Zod parse (returns 400 on failure)
    2. POST { data: parsed } to /api/survey-responses with Bearer token
    3. 201 { ok: true }
         ↓
  Client shows success card with "Înapoi la pagina principală"
```

**Invariants:**
- The Next.js server never stores anything of its own; the Bearer token stays server-side.
- Partial answers are allowed (spec §Summary says so). The Zod schema reflects this — `optional()` on every research field.
- The survey does NOT talk to the `waitlist-submission` collection. Linkage is by `email` at query time, as the spec describes.

## 5. Data contract — frontend mirror of the backend

Spec in user message (2026-04-23) is the source of truth. Frontend types:

```ts
// lib/survey-schema.ts — Zod schema mirrors the backend 1:1
export const Role = z.enum(["expeditor", "transportator", "ambele"]);
export const Source = z.enum(["waitlist_followup", "standalone", "other"]);

export const SendingFrequency = z.enum(
  ["niciodata", "rar", "cateva_ori_pe_an", "lunar", "mai_des"],
);
export const PackageType = z.enum(
  ["alimente", "haine", "electronice", "documente", "altele"],
);
export const HowFind = z.enum(
  ["grup_facebook", "recomandare", "cunosc_personal", "altul"],
);
export const SearchDuration = z.enum(
  ["sub_o_ora", "cateva_ore", "una_doua_zile", "mai_mult"],
);
export const ContactedCount = z.enum(["unul", "doi_trei", "mai_multi"]);
export const SelectionCriterion = z.enum(
  ["pret", "siguranta", "viteza", "reputatie", "recomandare"],
);
export const SafetyPriceAttitude = z.enum(["nu", "uneori", "da_depinde"]);
export const PainPoint = z.enum(
  ["gasit_transportator", "negociere_pret", "comunicare", "siguranta", "intarzieri", "altele"],
);
export const IssueExperienced = z.enum(["intarzieri", "lipsa_comunicare"]);
export const TrustSignal = z.enum(
  ["recomandare_prieteni", "profil_verificat", "recenzii", "altceva"],
);
```

Full object schema lives in `lib/survey-schema.ts`. Array JSON fields are
`z.array(...).optional()`. `selectionCriteria` is an **ordered** array (index 0 =
highest priority). `callbackPhone` is required only when `wantsCallback === true`
(enforced via `z.refine`).

## 6. UX — where the CTA appears

| Placement | What | Why |
|---|---|---|
| **Waitlist success card** | Primary CTA button "Ajută-ne cu un scurt sondaj (3 min) →" + secondary "Înapoi la pagina principală" | Peak engagement moment; they just succeeded, we ride the momentum. |
| **Footer "Platformă" column** | Link "Împărtășește experiența ta" → `/sondaj/expeditori` | Low-pressure, always reachable. Honest position: post-signup is the main path, this is the side door. |
| **FAQ section footer** (optional, flag for later) | Small italic line "Ai o experiență cu transportatori? Împărtășește-o →" | Inline context-match — the FAQ is where people are still curious. Gate behind a quick visual review before shipping; could look needy. |
| **NOT the nav** | — | Too aggressive. Nav stays waitlist-focused until launch. |
| **NOT a hero secondary CTA** | — | Competes with the primary "Anunță-mă la lansare". Same reasoning. |
| **NOT a banner on every page load** | — | Cheapens the ask. Survey is a post-action, not a pre-emptive interrupt. |

Execution: primary + footer in this epic. FAQ-footer line deferred to a follow-up after you've seen the primary placements in production.

## 7. Stories (work breakdown)

### STORY 1 — Zod schema + types

`lib/survey-schema.ts` mirroring the backend. All research fields `optional()`, identity fields required. `callbackPhone` refined (required when `wantsCallback === true`). Export `SurveyPayload` inferred type.

**Acceptance:** unit tests cover every enum, every optional path, the `callbackPhone` refinement, and the "empty strings → undefined" normalisation for free-text fields.

### STORY 2 — Fetcher + route handler

`lib/survey.ts::submitSurvey(payload)` POSTs `{ data: payload }` to `/api/survey-responses` with Bearer token. Mirrors `submitWaitlist` patterns including 401/403 actionable errors. Route handler at `app/api/survey/route.ts` parses via Zod, calls fetcher, returns 201 / 400 / 502.

**Acceptance:** MSW-backed unit tests for the fetcher; unit tests for the route handler covering success + Zod error + Strapi 403.

### STORY 3 — Survey page shell + identity prefill

`app/sondaj/expeditori/page.tsx` (Server Component) renders `<SurveyForm />` (Client Component). Form mounts, reads identity from (in order): URL params → remember-me localStorage → empty. Sets `source` from sessionStorage flag (`waitlist_followup`) or defaults to `standalone`.

**Acceptance:** component test — when sessionStorage flag is set, form submits with `source: "waitlist_followup"`; when URL has `?email=x`, email is pre-filled; when neither, form is blank with `source: "standalone"`.

### STORY 4 — Section components

Split the form into six section components, one per spec section (Identity, Context, Process, Decision, Problems, Trust, Ideal, Validation). Each section is a pure client component receiving its slice of state + onChange. Sections render in a single `<form>` — no wizard.

**Acceptance:** each section renders its fields with the correct input types (radio, multi-checkbox, ordered list for `selectionCriteria`, textareas for open questions). No network. Unit-tested per section.

### STORY 5 — Ordered-criteria input

`selectionCriteria` is an ordered array. UX: drag-to-reorder is expensive; use a numbered-chip selection pattern where clicking a criterion appends it, click again removes it, and a small "Mutaţi sus" / "Mutaţi jos" control moves items. Keyboard-accessible.

**Acceptance:** component test covers add, remove, reorder, max-5 constraint.

### STORY 6 — CTA wiring

- Modify `components/landing/SignupForm.tsx` success state to include:
  - Primary button → `/sondaj/expeditori` with `sessionStorage.setItem("hulubul:from-waitlist", "1")`.
  - Secondary link → `/` (existing home).
- Modify footer component / CMS data consumption: add "Împărtășește experiența ta" → `/sondaj/expeditori` to the Platformă column.

**Acceptance:** existing SignupForm success tests still pass; new test covers "clicking survey CTA sets sessionStorage flag".

### STORY 7 — Success state

Post-submit card: "Mulțumim! Ne ajută enorm." + short message + button back to `/`. Clears the `waitlist_followup` session flag on success to prevent re-tagging a subsequent standalone visit in the same tab.

**Acceptance:** component test for the success card appearance and the flag-clear behaviour.

### STORY 8 — E2E smoke (Playwright)

Single happy-path test: visit `/sondaj/expeditori?email=x&role=expeditor`, fill identity + one research field, submit, assert success, verify Strapi received a 201 (via MSW boot in tests or staging).

**Acceptance:** `e2e/survey.spec.ts` passes against a test Strapi instance (or MSW-booted Next).

## 8. Testing strategy

Follows `design/testing-strategy.md` §4 rubric. Mapped here explicitly so nobody has to re-derive it.

| Layer | What | Count estimate |
|---|---|---|
| **Unit — `lib/survey-schema.ts`** | Every enum, optional paths, callbackPhone refinement, empty-string → undefined | ~12–15 cases |
| **Unit — `lib/survey.ts`** | MSW-backed fetcher: payload shape, auth header, 401/403/5xx branches | ~5 cases |
| **Unit — `/api/survey/route.ts`** | Valid → 201; Zod error → 400; Strapi 403 → 502 | ~4 cases |
| **Component — `<SurveyForm>`** | Identity prefill from URL / localStorage / both, source resolution, submit payload shape, success state | ~6 cases |
| **Component — per section** | Correct field types, selection state, mutual-exclusion for enums | ~2–3 cases per section × 7 sections = ~15 cases |
| **Component — `<SelectionCriteriaPicker>`** | Add / remove / reorder / max-5 | ~4 cases |
| **Component — Waitlist success-card CTA** | Clicking primary button sets sessionStorage + navigates | 2 cases |
| **E2E Playwright** | One happy-path run through the full form | 1 spec |

Target: new-epic additions cost ~45 new test cases. Suite total ~100. Runs in under 3 s locally.

**What NOT to test (anti-coverage per the strategy doc):**
- JSX passthrough components (section wrappers with no branching).
- react-markdown / react-dom internals.
- Strapi's own validation (e.g. enum values) — trust the backend; Zod mirrors it so drift surfaces as a test failure on our side.
- The Zod library itself — no `z.string().parse("x")` assertions.

**Test fixtures:** one `tests/msw/fixtures/survey-response.ts` with a complete `v:1` payload covering every field; each section test derives from it.

## 9. Known risks

| Risk | Mitigation |
|---|---|
| **Survey length drop-off.** 25 fields looks long; people bail. | All research fields are optional. Section labels make progress feel incremental. No wizard step penalty. Copy emphasises 3-minute completion. |
| **`selectionCriteria` ordered input is fiddly.** Drag-drop is a UX/accessibility tax. | Numbered-chip pattern (STORY 5). Keyboard-accessible up/down. Max 5 prevents overwhelm. |
| **`callbackPhone` collection has lead-quality implications.** Bad phones waste outreach time. | Client-side input mask + a simple shape check (starts with `+`, at least 8 digits). No full E.164 validation — too error-prone. |
| **Email on survey ≠ email on waitlist.** Same person, two identities. | Spec accepts this — linkage is by email at query time. For people coming via the success-card CTA, we prefill from remember-me, so they're consistent unless they edit. |
| **`source` inference is session-based.** Close tab and come back → `standalone` even if they *just* did the waitlist. | Accept. `waitlist_followup` is best-effort for analytics, not a contract. |
| **Schema drift: backend adds a field.** Frontend doesn't send it. Strapi stores null. | Acceptable; Zod test fails if backend changes a required field. New optional fields need an update here. |
| **CSP header on the new page.** `app/sondaj/expeditori/page.tsx` inherits `next.config.ts` headers. | Verify smoke-test that CSP is present on `/sondaj/expeditori` at build time. |

## 10. Acceptance criteria

- [ ] Anonymous visitor navigates to `/sondaj/expeditori` directly, fills name + email + role, submits, sees success card. Strapi stores `source: "standalone"`.
- [ ] Waitlist visitor completes the waitlist, clicks "Ajută-ne cu un scurt sondaj", lands on `/sondaj/expeditori` with name + email + role pre-filled. Submits. Strapi stores `source: "waitlist_followup"`.
- [ ] URL param `/sondaj/expeditori?email=x@y.com&role=transportator` pre-fills those fields.
- [ ] Submitting with only identity (no research fields) succeeds; backend stores nulls.
- [ ] Submitting `wantsCallback: true` without `callbackPhone` → inline validation error, no POST.
- [ ] Network failure shows an inline error; no success state; no Strapi record leaked.
- [ ] Footer "Împărtășește experiența ta" link works from every page.
- [ ] Full test suite green, typecheck clean, production build passes.

## 11. Follow-up epics (named, not specced)

- **EPIC — Draft persistence** — save partial survey in localStorage so a closed tab can resume. Add only if drop-off data justifies.
- **EPIC — Hot-lead alerting** — Strapi lifecycle hook on `create` → webhook to email/Slack when `willShipSoon: true` or `wantsCallback: true`.
- **EPIC — Survey analytics view** — editor-facing aggregation in Strapi admin or exported to a BI tool.
- **EPIC — Email campaign link kit** — prebuilt `/sondaj/expeditori?email=…&name=…&role=…` generators for campaigns, plus UTM param capture.
- **EPIC — Transporter survey** — `/sondaj/transportatori`, separate field set focused on driver pains, route preferences, empty-space frequency, vetting concerns. Reuses the same backend `survey-response` collection (with `role: "transportator"`) or gets its own collection — decided at epic time.
- **EPIC — i18n** — once EN/FR versions of the landing ship, survey strings follow.

## 12. References

- Backend schema spec: provided in conversation 2026-04-23 (user message); verified live on Strapi Cloud the same day.
- `design/testing-strategy.md` — the rubric used to scope §8.
- `design/epic-signup/login.md` — the future home for authenticated resume flows.
- `design/epic-signup/remember-me.md` — the prefill source used by STORY 3.
- `components/landing/SignupForm.tsx` — the call-site for STORY 6 (success-state CTA).

---

*End of EPIC. Implementation begins when this spec is approved.*
