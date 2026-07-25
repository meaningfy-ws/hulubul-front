# Spec — Add `location` to Survey Response v2 (Strapi backend)

**Status: ALREADY LIVE — no backend action needed.** Verified 2026-07-25:
the `location` field was already present on `survey-sender-v2` before this
spec was even drafted (confirmed via `GET /api/survey-sender-v2s` — all 4
pre-existing rows, dated 2026-07-23, already carry a `location: null` key,
which Strapi only serializes for attributes actually defined in the
content-type's schema). Write path also confirmed end-to-end: a real POST
through `app/api/survey-v2/route.ts` against the live instance
(`https://steadfast-bell-433fdd1ac5.strapiapp.com`) with
`location: { source: "geolocation", lat: 49.611, lon: 6.131,
accuracyMeters: 25 }` returned `201`, and the value came back unmodified on
GET (row id 5, `documentId: du9ydi1a4s5dxpkkvvhwd3od`, self-labeled as test
data to delete). This document is kept as the verification record, not a
pending ask — nothing below requires backend work.

**Date:** 2026-07-25 (drafted as a hand-off request; downgraded to a
verification record same day once the live check ran).
**Amends:** `design/spec-survey-sender-v2-backend.md` (the `survey-sender-v2`
collection, LIVE since 2026-07-23) — turns out that spec's original
implementation already included this field, just undocumented in its own
attribute table.

## Why this was thought to be needed

`/sondaj/expeditori` (SurveyFormV2) gained silent, best-effort location
capture — the same mechanism the landing waitlist form already uses
(`lib/geolocation.ts` + IP fallback), requested with no visible consent UI
and no prompt-driven copy. The attribute table in the amended spec
(`design/spec-survey-sender-v2-backend.md`) never listed `location`, so the
assumption going in was that Strapi would silently drop the field. The live
check above disproves that: the field was already there.

**Explicitly not doing:** a `locationConsent` field. Because the request is
silent (no prompt UI, no "reține locația" checkbox), the only two outcomes
are "browser gave coordinates" or "it didn't, so we used something else" —
and the `location.source` discriminant (`"geolocation"` vs `"ip"`) already
carries that distinction. A separate consent enum would just restate
`location === null` in a second field. If a future revision adds a visible
consent UI to this form, add `locationConsent` then, matching
`waitlist-submission`'s existing shape — not before.

## Strapi content type — confirmed shape (no change needed)

Collection-type `survey-sender-v2` (plural API id `survey-sender-v2s`)
already has this attribute:

| Field | Type | Required | Notes |
|---|---|---|---|
| `location` | json | no | Optional approximate location of the filler. Either `{ source: "geolocation", lat, lon, accuracyMeters }` (browser permission was already granted — no prompt shown by this form) or `{ source: "ip", city, country }` (server-side IP-based fallback) or `null`/omitted if neither resolved. Same shape as `waitlist-submission.location` (`design/spec-waitlist-backend.md` §6) — confirmed identical by the live write-path test above. |

Add this row to `design/spec-survey-sender-v2-backend.md`'s own attribute
table next time that doc is touched, so it stops being an undocumented gap
between the two specs — not urgent, no functional impact either way.

```ts
type LocationGranted = {
  source: "geolocation";
  lat: number;
  lon: number;
  accuracyMeters: number;
};

type LocationIp = {
  source: "ip";
  city: string | null;
  country: string | null; // ISO-3166-1 alpha-2
};

type Location = LocationGranted | LocationIp | null;
```

Resolution priority, entirely silent — no prompt copy, no checkbox, nothing
rendered in the form:

1. Browser's native geolocation permission is already granted (e.g. from a
   prior visit to the landing page, or the user accepted this form's own
   silent request) → `{ source: "geolocation", lat, lon, accuracyMeters }`.
2. Browser permission denied, unavailable, or the request times out →
   server resolves IP → city/country from request headers (same headers
   and logic as `resolveIpLocation()` in `app/api/waitlist/route.ts`) →
   `{ source: "ip", city, country }`.
3. Neither resolves (no location headers present either) → `null`.

**Privacy invariants (same as waitlist's, minus the consent axis this form
doesn't have):**

- No raw IP address is ever included in the payload — only what the request
  headers already resolve to (city/country), computed server-side.
- No fingerprinting: this is coordinates or coarse city/country, nothing
  device-identifying beyond what `location` already says.
- The field is optional; a submission with `location: null` must succeed
  exactly as one with a populated value.

## Permissions

Confirmed sufficient as-is. `STRAPI_API_TOKEN` (`create`-only on
`survey-sender-v2`) successfully wrote a `location` value in the live test
POST — no additional grant was or is needed.

## Frontend integration (implemented, awaiting this field)

- `lib/survey-schema-v2.ts` has `location: Location.nullable().optional()`
  — reusing the `Location`/`LocationGranted`/`LocationIp` Zod union, now
  extracted to a shared `lib/location.ts` (moved out of
  `lib/waitlist-schema.ts`, which imports it back). `resolveIpLocation()`
  moved the same way, out of `app/api/waitlist/route.ts` into
  `lib/location.ts`, so both flows share one definition instead of two.
- `components/survey/SurveyFormV2.tsx` calls `requestLocation()` from
  `lib/geolocation.ts` (already generic, already used by
  `components/landing/SignupForm.tsx`) silently on mount — no new UI, no
  new copy.
- `app/api/survey-v2/route.ts` mirrors `app/api/waitlist/route.ts`'s
  IP-fallback: if the client sent no `location`, resolve one from request
  headers before forwarding to Strapi.
- `lib/survey-v2.ts` — no change; `submitSurveyV2()` already forwards
  whatever's in the validated payload.

## Acceptance — all confirmed live, 2026-07-25

1. ✅ `GET .../api/survey-sender-v2s` returns `200`; all 4 pre-existing rows
   carry `location: null`.
2. ✅ (implied by existing rows predating this frontend change) — payloads
   without `location` succeed exactly as before.
3. ✅ A POST with `location: { source: "geolocation", lat: 49.611, lon:
   6.131, accuracyMeters: 25 }` returned `201`; the value is visible,
   unmodified, on row id 5 (`documentId: du9ydi1a4s5dxpkkvvhwd3od`).
4. Not separately tested (already covered by #1/#2 — existing rows have
   `location: null` and succeeded).

**Housekeeping:** row id 5 is a test record (`name:
"location-verify-2026-07-25"`, free-text answer self-labeled "a se
ignora/șterge") — the frontend's API token only has `create` permission, so
it can't be deleted from this repo. Delete it from Strapi admin if desired;
harmless to leave otherwise.

## Out of scope

- No `locationConsent` field (see "Explicitly not doing" above) — still
  correctly absent from the live schema; nothing to add.
- No change to `survey-sender` (v1) or `waitlist-submission` — this
  concerned only `survey-sender-v2`, and no change was needed there either.
