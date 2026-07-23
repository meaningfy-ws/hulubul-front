## Why

The current sender survey (`/sondaj/expeditori`) is a long discovery instrument (20+ optional fields). Product has two field-tested question sets to replace it with a shorter, sharper v2 (~9 questions, ~3 min) that also recruits Alpha testers more deliberately — without losing the v1 dataset or breaking its pipeline.

## What Changes

- New page `/sondaj/expeditori-v2` + new `SurveyFormV2` component: a merged ~9-question flow built from two Google Doc proposals (the shorter, casual draft — preferred — cross-checked against the more structured "Discovery" draft for question gaps and answer-option completeness). **Note:** the plain `/sondaj/expeditori` slug will end up serving v2 (see below) — `/sondaj/expeditori-v2` is where it's built/verified before the swap.
- Route capture simplified to two fields (from / to), reusing the existing city-autocomplete component (`components/routes/CityTagInput.tsx`, the same one used in the waitlist "stay in touch" form) — **not** a 4-field country/locality form.
- Every field, question, and answer option is authored as translatable content (RO/EN shipped at launch; RU/FR structurally ready, pending translated copy).
- Multi-select questions capped at 8 options (7 + "Altceva"), merging near-duplicate options to reduce cognitive load.
- The old separate "channel preference" and "why switch" questions are merged into one multi-choice question.
- Adds an explicit "want to test the platform before launch?" question, gated the same way `wantsCallback`/`callbackPhone` already works in `lib/survey-schema.ts` (opt-in → conditional phone → explicit consent checkbox).
- **v1 moves, not deleted: `/sondaj/expeditori` (today's form, component, schema, API route) relocates to `/sondaj/expeditori-v1`, byte-for-byte unchanged in behavior.** The plain `/sondaj/expeditori` slug is freed up for v2 — since every existing CTA already points at that plain slug, **no CTA/link changes are needed**; they'll simply start serving v2 once the swap ships.
- New frontend submission path, parallel to the v1 one: `lib/survey-schema-v2.ts`, `lib/survey-v2.ts`, `app/api/survey-v2/route.ts` — posts to a new Strapi collection.
- **Backend, spec-only (not implemented in this repo)**: new Strapi content type `survey-sender-v2`, sibling to the existing `survey-sender`, with `create` permission for the shared API token — no changes to the v1 collection. The field/enum contract is written as a hand-off spec (same format as `design/spec-survey-backend.md`) for the backend repo's agent.

## Capabilities

### New Capabilities
- `sender-questionnaire-v2`: the v2 sender survey — merged question set, structured route capture, Alpha opt-in with consent, new page route, new Zod schema, new submission pipeline to a new (spec-only) backend collection.

### Modified Capabilities
None — the v1 survey has no existing spec under `openspec/specs/` and is not being changed.

## Impact

- **Frontend (implemented here):** the old `app/(marketing)/sondaj/expeditori/page.tsx` relocates to `app/(marketing)/sondaj/expeditori-v1/page.tsx` unchanged; the plain path gets a new v2 page. New `components/survey/SurveyFormV2.tsx`, `lib/survey-schema-v2.ts` + `lib/survey-v2.ts`, `app/api/survey-v2/route.ts`. No CTA/link edits required — they already target the plain slug.
- **Backend (separate repo, spec hand-off only):** new `survey-sender-v2` content type + token permission, no changes to the v1 collection. See `design.md`'s backend section — to be copied to the backend agent, not executed here.
- **Untouched behavior:** `survey-sender` collection, `lib/survey-schema.ts`, `lib/survey.ts`, `app/api/survey/route.ts`, and `SurveyForm.tsx` — the v1 pipeline keeps running exactly as today, just at its new URL.
