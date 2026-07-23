## 1. Backend hand-off spec (this repo only — no backend implementation here)

- [x] 1.1 Write `design/spec-survey-sender-v2-backend.md`, mirroring `design/spec-survey-backend.md`'s format: collection name `survey-sender-v2`, full field/enum table matching `lib/survey-schema-v2.ts` (task 3.1), permissions (shared `STRAPI_API_TOKEN`, `create` only, no public create, default pluralization), and acceptance checks.
- [x] 1.2 Share the spec doc with the user for hand-off to the backend repo/agent; do not proceed to task 4 (the page swap) until backend confirms the collection exists and accepts a real submission. **Resolved 2026-07-23:** backend implemented it (`strapi-cloud-template-blog-18c70c3ea8`, PR #12 merged to `main`), permission granted, and **verified live** with a real POST against the deployed instance (`https://steadfast-bell-433fdd1ac5.strapiapp.com/api/survey-sender-v2s` → `201`, `documentId: i1sfk1tewt3qqndy3dpgjbun`). Note: `NEXT_PUBLIC_STRAPI_URL=https://api.hulubul.com` from `.env.example` did NOT reach this instance (401 with a token that worked fine against the `.strapiapp.com` URL) — worth a heads-up to whoever owns the custom-domain/DNS setup, but out of scope here.

## 2. Relocate v1 (no behavior change)

- [x] 2.1 Before touching anything, run `impact({target: "SurveyForm", direction: "upstream"})` and `impact({target: "SenderSurveyPage", direction: "upstream"})` to reconfirm both are still isolated (LOW risk, single caller / zero callers) before moving files.
- [x] 2.2 Move `app/(marketing)/sondaj/expeditori/page.tsx` to `app/(marketing)/sondaj/expeditori-v1/page.tsx` verbatim — same `SurveyForm` import, same metadata, same copy. No other file changes.
- [x] 2.3 Update `tests/app/noindex.test.ts`'s import path (`@/app/(marketing)/sondaj/expeditori/page` → `.../expeditori-v1/page`) so the "still noindex" assertion targets the relocated v1 page.
- [x] 2.4 Confirm `/sondaj/expeditori-v1` renders and submits identically to the old `/sondaj/expeditori` (manual check). Verified: 200 render, and a real POST through `/api/survey` → `201` against the live Strapi (`survey-senders` collection, unaffected by any of this change).

## 3. v2 schema

- [x] 3.1 Create `lib/survey-schema-v2.ts`: Zod schema per design.md Decision 5 — identity (`name`, `email`), `routeCities: z.array(City).length(2)` (reuse the `City` shape from `lib/waitlist-schema.ts`), the 9 questions with their enums, the 8-option cap on every multi-select, max-3 caps on the difficulties/decision-criteria/channel-switch questions, and the pre-launch-testing opt-in with the phone+consent refinement (mirrors `wantsCallback`/`callbackPhone`).
- [x] 3.2 Create `components/survey/labels-v2.ts`: `Record<"ro"|"en"|"ru"|"fr", ...>` for every question, option, and hint. Author `ro` and `en` content now; `ru`/`fr` fall back to `en` until real translations exist (flag with a `// ponytail:`-style comment noting the fallback and what unblocks it).
- [x] 3.3 Add `tests/lib/survey-schema-v2.test.ts` covering: missing required fields rejected, `routeCities` must have exactly 2 entries, multi-select cap enforcement, and the alpha-consent refinement (phone without consent rejected; opting out skips phone entirely).

## 4. v2 submission pipeline

- [x] 4.1 Create `lib/survey-v2.ts`: `submitSurveyV2()` POSTing to the new Strapi collection (path resolved from task 1's spec), following `lib/survey.ts`'s existing pattern.
- [x] 4.2 Create `app/api/survey-v2/route.ts`: validate with the v2 schema, strip consent metadata before forwarding (as the v1 route does), forward to `submitSurveyV2()`, dispatch the existing `survey_submit` tracking event, map Strapi 4xx/404 to a 502 user-facing error.
- [x] 4.3 Add `tests/api/survey-v2-route.test.ts` mirroring `tests/api/survey-route.test.ts`'s coverage (valid submission, validation failure, Strapi error mapping).

## 5. v2 form + page (this replaces the freed `/sondaj/expeditori` slug)

- [x] 5.1 Run `impact({target: "CityTagInput", direction: "upstream"})` before wiring it in, to confirm the reuse plan is additive-only (no edits to `CityTagInput.tsx` itself) — it's a HIGH-risk shared symbol (admin routes + landing signup also depend on it).
- [x] 5.2 Create `components/survey/SurveyFormV2.tsx`: controlled-state form for the merged question set, rendering `<CityTagInput maxCities={2} originDestinationLabels />` for the route field, reading `?lang=` (via `useSearchParams`, same mechanism as `?role=` in `SurveyForm.tsx`) to select from `labels-v2.ts`, reusing `useConsent`, `humanizeFormError`, `FORM_STATUS`/`FormStatus`, and `trackSurveySubmit` exactly as `SurveyForm.tsx` does.
- [x] 5.3 Create the new `app/(marketing)/sondaj/expeditori/page.tsx` (the now-freed slug): same structure as v1's page (metadata with `robots: noindex,nofollow`, header copy reflecting the shorter flow), renders `<SurveyFormV2 />`.
- [x] 5.4 Add `tests/components/SurveyFormV2.test.tsx` mirroring `tests/components/SurveyForm.test.tsx`'s coverage, plus the new v2-specific flows (route autocomplete, 8-option caps, merged channel/switch question, pre-launch opt-in consent gating, `?lang=` locale switch).

## 6. Verification

- [x] 6.1 Run `detect_changes()` and confirm it only reports the expected new/moved symbols (v1's move, v2's new files) — no unexpected fan-out into `CityTagInput`, `SignupForm`, or admin routes. Ran with `scope: "staged"` (untracked files are invisible to plain `git diff`/`compare`) after a full reindex — confirmed: every affected process is within the new v2 files, the two page.tsx swaps, or the shared `strapi-client.ts` helpers (as a new caller, unmodified). No edges into `SignupForm`, `Signup`, `RoutesAdmin`, or `AdminRutePage`.
- [x] 6.2 Run the full test suite; confirm v1 tests (`tests/components/SurveyForm.test.tsx`, `tests/api/survey-route.test.ts`, `tests/lib/survey-schema.test.ts`, `tests/lib/survey.test.ts`) are unchanged and still passing (just at the relocated import path where applicable). All 598 tests pass; `tsc --noEmit` and `next lint` clean (no new warnings).
- [x] 6.3 Manually load `/sondaj/expeditori` (now v2) and `/sondaj/expeditori-v1` (relocated v1) in a browser; submit both end-to-end against a real/staged backend once available. Try `?lang=en` on v2. **Done** — both pages render (200, including a real user exercising the city-autocomplete field live); both `/api/survey-v2` and `/api/survey` return `201` against the real deployed Strapi. `?lang=en` not separately re-verified after this pass but was covered by the component test suite.
- [x] 6.4 Confirm the footer link, post-signup CTA, editorial-fallback links, and the `/sondaj` redirect all land on v2 with zero code changes to those files. Verified by grep: `Footer.tsx`, `SignupForm.tsx`, `editorial-fallback.ts`/`-en.ts`, and `sondaj/page.tsx`'s redirect all still say `/sondaj/expeditori` unchanged.
