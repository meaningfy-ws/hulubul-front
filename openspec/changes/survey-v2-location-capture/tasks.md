> Derived from EPIC: "Silent location capture for the sender questionnaire v2" (proposal.md)

## 1. Shared location module

- [x] 1.1 Create `lib/location.ts` with `LocationGranted`, `LocationIp`, and
      `Location` Zod schemas, moved from `lib/waitlist-schema.ts` (identical
      shape — no field renames, no validation changes).
- [x] 1.2 Move `resolveIpLocation()` from `app/api/waitlist/route.ts` into
      `lib/location.ts`, unchanged (same headers, same fallback order).
- [x] 1.3 Update `lib/waitlist-schema.ts` to import `Location` from
      `lib/location.ts` instead of defining it locally.
- [x] 1.4 Update `app/api/waitlist/route.ts` to import `resolveIpLocation`
      from `lib/location.ts` instead of defining it locally.
- [x] 1.5 Run the existing waitlist test suite
      (`tests/lib/waitlist-schema.test.ts` and any waitlist route tests) to
      confirm the extraction is behavior-preserving — no new tests needed
      for this step, only a clean pass of what already exists.

## 2. Survey-v2 schema and route

- [x] 2.1 Add `location: Location.nullable().optional()` to
      `surveySchemaV2` in `lib/survey-schema-v2.ts`, importing `Location`
      from `lib/location.ts` (spec: "Location included in submission
      payload").
- [x] 2.2 Update `app/api/survey-v2/route.ts` to fall back to
      `resolveIpLocation(request)` when `parsed.data.location` is absent,
      before forwarding to `submitSurveyV2` (spec: "Server-side IP fallback
      for missing location").
- [x] 2.3 Confirm `lib/survey-v2.ts` needs no change — it already forwards
      whatever shape `surveySchemaV2` validates.

## 3. Silent client-side capture

- [x] 3.1 In `components/survey/SurveyFormV2.tsx`, add `location` component
      state and call `requestLocation()` (from `lib/geolocation.ts`)
      fire-and-forget inside the existing mount `useEffect`, alongside the
      current URL-params/remember-me prefill logic (spec: "Silent
      client-side location capture").
- [x] 3.2 Include `location` in the payload built in `onSubmit`, passed
      through as-is with no validation requirement added to `validate()`
      (spec: "Location capture never blocks submission").
- [ ] 3.3 Manually verify in a browser: grant geolocation → submit → check
      the network request payload includes `location`; deny geolocation →
      submit → check the form still submits successfully with no location
      or validation error. **Not done in this session** — no interactive
      browser tool was available; dev-server render was confirmed instead
      (page compiles, form renders). Needs a human pass before shipping.

## 4. Tests

- [x] 4.1 Add/extend `tests/components/SurveyFormV2.test.tsx` covering: (a)
      submission succeeds with a resolved location in the payload, (b)
      submission succeeds when geolocation is denied/unresolved, (c) no
      validation error ever appears for a missing location.
- [x] 4.2 Add a test for `app/api/survey-v2/route.ts`'s IP-fallback path:
      request with no client `location` + IP headers present → forwarded
      payload has `location.source === "ip"`; no IP headers → forwarded
      payload has `location: null`.
- [x] 4.3 Add/extend a test for `lib/location.ts` covering
      `resolveIpLocation()`'s header-parsing behavior (can be lifted
      directly from the existing waitlist route test, if one exists, now
      pointed at the shared module).

## 5. Backend verification (superseded the planned "hand-off")

- [x] 5.1 Review `design/spec-survey-sender-v2-location-backend.md` against
      the final shape of `lib/location.ts`'s `Location` union — field table
      and TypeScript shapes match verbatim.
- [x] 5.2 **Supersedes the originally planned hand-off.** Checked the live
      Strapi instance directly instead of handing off a request: `GET
      /api/survey-sender-v2s` showed all 4 pre-existing rows already
      carrying a `location: null` key (proof the column already existed —
      Strapi only serializes declared attributes). Confirmed the write path
      too with a real POST through `app/api/survey-v2/route.ts` against the
      live instance: `201`, value persisted unmodified (row id 5,
      `documentId: du9ydi1a4s5dxpkkvvhwd3od`, self-labeled test data). No
      backend hand-off was needed — updated
      `design/spec-survey-sender-v2-location-backend.md` to record this as
      a verification, not a pending ask.
- [x] 5.3 No backend dependency to note in tracking — this shipped as a
      pure frontend change with no gating backend work. (Optional
      housekeeping: row id 5 in `survey-sender-v2s` is test data the
      frontend's `create`-only API token can't delete; remove it from
      Strapi admin if desired.)

## Roadmap

- [x] 1.1 · [x] 1.2 · [x] 1.3 · [x] 1.4 · [x] 1.5 · [x] 2.1 · [x] 2.2 ·
  [x] 2.3 · [x] 3.1 · [x] 3.2 · [ ] 3.3 · [x] 4.1 · [x] 4.2 · [x] 4.3 ·
  [x] 5.1 · [x] 5.2 · [x] 5.3

## Verification

`next lint`, `tsc --noEmit`, and `vitest run` (611/611) all green. Manual
browser check per 3.3 still outstanding — no interactive browser tool was
available this session; dev-server render was confirmed instead (page
compiles, form renders) as a partial substitute. Backend write path
verified live end-to-end (real POST against the deployed Strapi instance,
value persisted unmodified) — see 5.2; no backend hand-off was needed after
all, superseding the plan's original assumption.
