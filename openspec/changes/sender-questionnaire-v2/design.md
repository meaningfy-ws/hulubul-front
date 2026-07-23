## Context

The live sender survey lives at `/sondaj/expeditori` (`components/survey/SurveyForm.tsx`, `lib/survey-schema.ts`, `lib/survey.ts`, `app/api/survey/route.ts` → Strapi collection `survey-sender`). It's a single controlled-state form (no wizard/steps), ~20 optional fields beyond identity, built for broad discovery. It already has GDPR consent plumbing (`useConsent`), a callback-with-required-phone pattern (`wantsCallback`/`callbackPhone`), event tracking (`trackSurveySubmit`), and a `labels.ts` module for display strings.

Two Google Doc proposals were reviewed for v2:
- **Doc A** ("9 întrebări", casual tone, ~3 min) — preferred by product for tone and brevity. All 9 questions marked `[x]`.
- **Doc B** ("Discovery v0.3", Adrian's structured rewrite) — more granular answer options, a structured route-capture question, and a properly gated Alpha-recruitment block (opt-in → conditional phone → explicit consent checkbox), but several of its questions are marked `[~]`/`[-]` (redundant, dropped).

Per product decision: v1 keeps running, just at a new URL (see Decision 1); v2 is additive. Backend changes are out of scope for this repo — Strapi work is written up as a hand-off spec for the sibling backend repo's agent, never implemented here.

**Product review of the first draft** (recorded here so the "why" survives): the initial merged question list was accepted as a baseline ("q3 seems fine" on the open question asking exactly that), but five follow-up decisions reshaped the design — route capture, i18n, a multi-select option cap, a Q7/Q8 merge, and a missing pre-launch-testing question. All five are folded into this revision. See Decisions 3–5.

## Goals / Non-Goals

**Goals:**
- Ship a new, shorter sender questionnaire, built from the merged/deduplicated question set below, at the URL the product settled on (`/sondaj/expeditori`, freed up from v1 — see Decision 1).
- Preserve v1's form, schema, and data pipeline exactly as-is — only its URL moves.
- Make the questionnaire's content translatable (RO/EN shipped now, RU/FR structurally ready).
- Produce a precise, self-contained backend spec doc for the new Strapi collection, matching the existing `design/spec-survey-backend.md` format, ready to copy to the backend agent.

**Non-Goals:**
- No backend implementation in this repo (Strapi content type, permissions — spec only).
- No migration of existing `survey-sender` responses into any new shape.
- No per-role question branching (still out of scope, same as v1 — see `design/spec-survey-backend.md`'s own "Out of scope").
- No redesign of the transporter survey (doesn't exist yet, unrelated to this change).
- No site-wide i18n routing/middleware build-out — RU/FR support here is scoped to this form's copy, not a general framework (see Decision 4).

## Decisions

### 1. v1 moves to `/sondaj/expeditori-v1`; v2 takes over the plain `/sondaj/expeditori` slug

**Decision** (from product notes on proposal.md and design.md): flat, hyphenated version suffixes (`-v1`/`-v2`), not nested paths — and the plain slug goes to whichever form is current, which is v2 going forward (matches the original brief: "we will simply use the latest, v2 version").

Concretely:
- `app/(marketing)/sondaj/expeditori/page.tsx` (today's v1 page) **moves** to `app/(marketing)/sondaj/expeditori-v1/page.tsx`, verbatim — same component (`SurveyForm`), same metadata, same behavior. Nothing about v1's form, schema, or API route changes; only the page file's path.
- The plain `app/(marketing)/sondaj/expeditori/page.tsx` path is then rebuilt to render the new `SurveyFormV2`.
- Every existing CTA/link (`components/landing/Footer.tsx`, `components/landing/SignupForm.tsx`, `lib/editorial-fallback.ts`/`-en.ts`, the `/sondaj` redirect) already points at the plain `/sondaj/expeditori` slug — **none of them need to change**. They'll simply serve v2 once the page swap ships.
- v1 is still reachable, just at `/sondaj/expeditori-v1` — anyone who bookmarked or was sent the *old* `/sondaj/expeditori` link will now land on v2 instead, since that literal URL now serves different content. Accepted trade-off — see Risks.

**My interpretation flagged**: "keep the old form on /v1" was read as the flat `/sondaj/expeditori-v1` suffix, consistent with the sibling "`-v2` not `/v2`" note. If a literal nested `/sondaj/expeditori/v1` was meant instead, that's a one-line change to the new page's route.

Alternative considered (previous draft of this design): new page at `/sondaj/expeditori-v2`, old page untouched at `/sondaj/expeditori`, CTAs repointed to `-v2`. Superseded — the product wants the canonical slug to always be "whichever version is current," and moving v1 out of the way means zero CTA edits instead of four.

**GitNexus impact check**: `SurveyForm` (the v1 component) has exactly one upstream caller — `SenderSurveyPage`, the page file itself (LOW risk, `impactedCount: 1`). `SenderSurveyPage` itself has zero upstream callers (LOW risk, `impactedCount: 0`) — nothing in the codebase imports a Next.js page function directly, so moving its file is routing-only and doesn't ripple anywhere else. Confirms the page move above is safe and isolated.

### 2. New, independent frontend stack for v2 (no shared schema with v1)
New files: `lib/survey-schema-v2.ts`, `lib/survey-v2.ts`, `app/api/survey-v2/route.ts`, `components/survey/SurveyFormV2.tsx`, `components/survey/labels-v2.ts` (locale-keyed display strings — see Decision 4). Structurally mirrors the v1 pattern (controlled `useState` per field, no wizard, `useConsent` + `trackSurveySubmit` reused as-is, `humanizeFormError` reused as-is).

  Alternative considered: extend `lib/survey-schema.ts` with optional v2-only fields and branch on a `formVersion` flag. Rejected — the question sets diverge enough (different enums, different granularity, structured route vs autocomplete cities) that a shared schema would be harder to read than two small parallel ones, and it would risk the "v1 untouched" guarantee.

### 3. Route capture: reuse the existing city-autocomplete field, not a 4-field form

**Decision**: don't ask separately for country + locality on each end. Ask only "from where" and "to where," using the exact same autocomplete component already shipping in the waitlist "stay in touch" form: `components/routes/CityTagInput.tsx` (backed by `/api/geocode-suggest`, already used by `components/landing/CitiesQuestion.tsx`).

- v2 renders `<CityTagInput value={routeCities} onChange={...} maxCities={2} originDestinationLabels />` — same component, same suggestion API, capped to exactly 2 chips (origin, destination) instead of the waitlist's up-to-10 (which allows layovers).
- Payload field: `routeCities: [string, string]` (Zod: `z.array(City).length(2)`, reusing the same `City = z.string().trim().min(1).max(120)` shape already defined in `lib/waitlist-schema.ts`).
- This replaces the previous draft's 4-field structured route (origin/destination country selects + locality text fields) entirely.

  Alternative considered (previous draft): 4 separate fields (country × 2, locality × 2). Rejected per product note — heavier to fill in, and duplicates a component/service that already exists and already works well in the waitlist form.

  **GitNexus impact check**: `CityTagInput` is HIGH risk to *modify* — it has 6 upstream-impacted symbols across 3 modules (`CitiesQuestion` and `RouteFormDrawer` call it directly; `SignupForm`, `Signup`, `RoutesAdmin`, and `AdminRutePage` depend on it transitively — it's shared by the landing signup form and the admin routes page). v2 must only be a **new consumer** passing existing props (`maxCities={2}`, `originDestinationLabels`) — no changes to `CityTagInput.tsx` itself. If a v2-specific need ever requires touching the component's internals, redo this impact check first.

### 4. Translatable content, not a new i18n framework

**Decision**: every question, option, and hint must be translatable to English, Russian, Romanian, and French (at minimum).

The site has no general i18n framework today — `lib/locale.ts` defines only `ro` (default, unprefixed) and `en`, and translated pages are hand-duplicated per route (`/donate` vs `/doneaza`, `editorial-fallback.ts` vs `-en.ts`). Building a full n-locale routing system is out of scope here (see Non-Goals) — instead:

- `components/survey/labels-v2.ts` exports a `Record<SurveyV2Locale, SurveyV2Copy>` where `SurveyV2Locale = "ro" | "en" | "ru" | "fr"` — every question, option label, hint, and button string lives in this one data structure, keyed by locale. No hardcoded copy in `SurveyFormV2.tsx` itself.
- Locale selection: a `?lang=` query param on the v2 page (`useSearchParams`, the same mechanism `SurveyForm.tsx` already uses for `?role=` prefill), defaulting to `ro`. No new routing/middleware — this is a single transient, noindex page, not an indexed content route.
- **Content scope for this change**: `ro` and `en` copy is written and shipped now (matches the site's current two supported locales). `ru` and `fr` get the same data-structure slots, but the actual translated text is an open question below — the object can ship with `ru`/`fr` falling back to `en` until real translations exist, so the feature doesn't block on translation availability.

  Alternative considered: wait for a real i18n library (e.g. `next-intl`) before building this. Rejected as over-scoped for one form — the locale-keyed-object pattern gets translatability now without a framework migration.

### 5. Merged question set (the content decision, revised)

Identity fields (`name`, `email`) are kept as in v1 — unchanged, required. Route capture is Decision 3, asked before the numbered questions.

Multi-select questions are capped at **8 options total** (7 substantive + "Altceva" as the 8th) per product note — near-duplicate options are merged into one crisper choice rather than listed separately, to keep cognitive load down. This trimmed Q2 and Q4 below; Q5, Q6, and the merged Q7 were already at or under the cap.

Questions 7 and 8 from the previous draft (channel preference, and reasons to switch from calling a carrier directly) were flagged as redundant and merged into **one** multi-select question, folding channel comfort ("I'd rather message than call") in as one of the switch-reasons rather than asking it separately.

A ninth question was added: whether the respondent wants to test the platform before launch — this **replaces** the previous draft's separate "Alpha recruitment block" appendix; it's now just the last numbered question, using the same opt-in → conditional phone → consent-checkbox gating as before (mirrors `wantsCallback`/`callbackPhone` in `lib/survey-schema.ts`).

| # | Question (RO) | Type | Options | Notes |
|---|---|---|---|---|
| Route | De unde trimiți și unde trebuie să ajungă coletul? | `CityTagInput`, 2 cities (origin, destination) | — | Decision 3; not counted among the 9 |
| 1 | Cât de des trimiți colete acasă? | single-choice | Niciodată / Rar / De câteva ori pe an / La 2–3 luni / Lunar sau mai des | unchanged from previous draft |
| 2 | Cum găsești de obicei un transportator? | multi-select, max 4 (UX only) | Contactez un transportator cunoscut / Recomandare de la prieteni sau rude / Facebook (grup sau pagină) / WhatsApp sau Telegram / Google sau alte site-uri / Nu se aplică, nu am trimis încă un colet / Altcineva organizează expedierea pentru mine / Altceva (liber) | trimmed to 8 (was 9); see Decision 6 for the cap |
| 3 | Cât timp îți ia să găsești și să confirmi un transportator? | single-choice | Sub 5 minute / 5–15 minute / 15–30 minute / 30–60 minute / Câteva ore / O zi sau mai mult / Nu se aplică | unchanged |
| 4 | Care sunt cele mai mari dificultăți când trimiți un colet? | multi-select, max 4 (UX only) | Nu găsesc rapid un transportator pentru ruta mea / Nu primesc răspuns sau răspunsul vine prea târziu / Trebuie să repet aceleași informații fiecărui transportator / Nu știu dacă transportatorul este de încredere / Prețul sau condițiile nu sunt clare / Întârzieri sau probleme la preluare/livrare / Nu am informații despre starea coletului / Altceva (liber) | trimmed + merged to 8 (was 11); see Decision 6 for the cap |
| 5 | Ce contează cel mai mult când alegi un transportator? | multi-select, max 4 (UX only) | Siguranța / Prețul / Rapiditatea / Disponibilitatea / Reputația sau recenziile / Faptul că l-am mai folosit / Comunicarea / Altceva (liber) | unchanged (already 8); see Decision 6 for the cap |
| 6 | Ce te convinge că un transportator sau o platformă este de încredere? | multi-select, max 4 (UX only) | Recomandare de la cineva cunoscut / Transportator verificat / Recenzii reale / Preț clar / Tracking sau confirmare la livrare / Suport dacă apare o problemă / Altceva (liber) | unchanged (already 7); see Decision 6 for the cap |
| 7 | Ce te-ar determina să folosești o soluție nouă (aplicație sau WhatsApp) în loc să contactezi direct transportatorul? | multi-select, max 4 (UX only) | Prefer să comunic prin WhatsApp sau Telegram, nu la telefon / Trimit o singură cerere, fără să repet informațiile / Cererea ajunge la transportatori relevanți pentru ruta mea / Primesc alternative dacă transportatorul nu răspunde / Pot compara mai ușor prețurile și ofertele / Am tracking și notificări pentru colet / Nimic, aș prefera contactul direct / Altceva (liber) | **merged from old Q7 (channel) + Q8 (why switch)**; see Decision 6 for the cap |
| 8 | Care este un singur lucru pe care această soluție trebuie să îl facă foarte bine ca să o folosești de fiecare dată? | free text | — | unchanged (was Q9) |
| 9 | Vrei să testezi platforma Hulubul înainte de lansare? | single-choice → conditional phone + consent | Da, vreau să particip / Posibil, vreau mai multe informații / Nu în această etapă | **new** — replaces the old appendix "Alpha recruitment block"; if Da/Posibil, show a phone field (WhatsApp/Telegram) + required checkbox ("Sunt de acord ca echipa Hulubul să mă contacteze exclusiv în legătură cu testarea Alpha."), linking to the existing privacy/data-processing page |

Dropped entirely (redundant, or explicitly out of the cap): the old draft's "Nu am întâmpinat dificultăți importante" (Q4 no-problems option, cut to make room under the 8-cap — respondents with no real difficulties can pick nothing or use "Altceva"), and everything already dropped in the first draft (Doc B's loyalty-pattern, trust-signals, and "shipping soon" questions).

### 6. Multi-select selection cap: `ceil(n/2)`, frontend-only

**Decision**: every multi-select question additionally caps how many of its own options a respondent may *select* (distinct from Decision 5's cap on how many options are *offered*) at `ceil(n/2)`, where `n` is that question's own option count. With every multi-select at 7 or 8 options (Decision 5), this works out to 4 selections everywhere — computed via `maxSelections()` in `lib/survey-schema-v2.ts`, not hardcoded, so it stays correct if an option list's length ever changes.

**This is a frontend-only UX nudge — the backend enforces no constraint on these fields.** Concretely:
- `lib/survey-schema-v2.ts`'s array fields keep `min(1)` (still required — answer *something*) but carry **no `.max()`** — the Zod schema is what `app/api/survey-v2/route.ts` validates against, so omitting `.max()` there means the API route will accept any number of selections.
- The cap is enforced only in `SurveyFormV2.tsx`'s checkbox handlers (`toggleCapped`, computed per-question via `maxSelections(copy.xOptions.length)`) and surfaced as a `(max. N)` hint next to the question, via `labels-v2.ts`'s `maxSelectionsLabel(n)`.
- `design/spec-survey-sender-v2-backend.md` says explicitly that these array fields have no max — the backend doesn't need to (and shouldn't) replicate this rule.

Alternative considered: enforce the cap in the Zod schema too (defense in depth). Rejected per explicit product direction — the backend/API layer is deliberately not constrained here, only the UI nudges toward a shorter answer.

## Risks / Trade-offs

- **v1's URL changes**: `/sondaj/expeditori` now serves v2; the old form only exists at the new `/sondaj/expeditori-v1`. → Mitigation: the page is `noindex, nofollow` and its own code comment already calls it "transient"; no known external backlinks depend on the old URL.
- **RU/FR copy not yet authored**: the labels structure has the slots, but real translated text doesn't exist yet. → Mitigation: ship RO/EN now (falls back to EN for RU/FR internally until translated), treat RU/FR content as a fast-follow — flagged as an open question below.
- **Content risk**: the merged/trimmed question list is my synthesis, not a verbatim copy of either source doc, especially after the Q7/Q8 merge and the 8-option trims. → Mitigation: this is a living OpenSpec change — easy to amend before implementation locks it in.
- **Two parallel survey stacks to maintain** (v1 + v2 schema/component/route/API/collection). → Mitigation: intentional, time-boxed — v1 gets no further investment; once v2 proves out, a future change can formally retire v1.
- **Backend dependency**: v2 submissions would 404/502 until the backend shipped `survey-sender-v2` and granted token permission (same failure mode `design/spec-survey-backend.md` already documented for v1's launch). → **Resolved 2026-07-23**: backend merged, deployed, and permissioned; verified live with a real `201` against `https://steadfast-bell-433fdd1ac5.strapiapp.com`.

## Migration Plan

1. Build the backend hand-off spec first (this change's `specs/` artifact) and hand it to the backend agent/repo.
2. Move `app/(marketing)/sondaj/expeditori/page.tsx` → `app/(marketing)/sondaj/expeditori-v1/page.tsx` verbatim (no behavior change). Confirm v1 still works at its new URL.
3. Build the v2 frontend stack (schema, component, labels, API route) and wire it into the now-freed `app/(marketing)/sondaj/expeditori/page.tsx`.
4. Verify against a real (or staged) `survey-sender-v2` endpoint per the spec's acceptance checks before this lands on the default branch — since no CTA changes are needed, the page swap itself is what exposes v2 to real traffic.
5. Rollback: revert the page-swap commit (v2 page reverts to v1's content, v1 stays at `-v1`) — no data-path entanglement since v1's collection was never touched.

## Open Questions

- RU/FR translated copy: should I draft a first-pass machine translation for the labels object now (fast, but needs native review before going live), or leave those locales as EN-fallback until real copy is supplied?
- Confirm the `/sondaj/expeditori-v1` interpretation (flat suffix) is correct, versus a literal nested `/sondaj/expeditori/v1` — see Decision 1.
- Strapi plural API id for `survey-sender-v2`: **resolved and confirmed** — `survey-sender-v2s` (Strapi's default pluralizer, no custom override), verified 2026-07-23 against the backend repo's own schema and its schema test (`tests/schemas/survey-sender-v2.test.js`). Matches what `lib/survey-v2.ts` already assumed; no frontend change needed.
- Backend schema fully verified compatible and **live** (2026-07-23) — `feat/survey-sender-v2` merged, deployed to `https://steadfast-bell-433fdd1ac5.strapiapp.com`, permissioned, and confirmed with a real `201` submission through this repo's own `/api/survey-v2` route. One notable, harmless adaptation: `searchDuration` is a plain Strapi `string` rather than an `enumeration`, because 3 of its 7 canonical values start with a digit and Strapi's enum validator unconditionally rejects that (GraphQL naming rule) — their own `design.md` DEC-4 documents it. No action needed on this side.
