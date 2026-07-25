# Spec — Add `location` to Survey Response v2 (Strapi backend)

**Status: UNVERIFIED against real production — correction, 2026-07-26.**
Everything below this notice was verified against
`https://steadfast-bell-433fdd1ac5.strapiapp.com`, which a separate
2026-07-26 investigation established is a **Strapi Cloud sandbox project,
not the Strapi that serves `hulubul.com`**. Production Strapi is
self-hosted at `api.hulubul.com` (see `docs/DEPLOYMENT.md`). The
"ALREADY LIVE" conclusion below does not carry over — it was true of the
sandbox, not proven true of production.

**What IS confirmed on real production (2026-07-26):** a POST through
`https://hulubul.com/api/survey-v2` with a populated `location` field
returned `201` (row would be tagged `name:
"prod-location-repro-2026-07-26"`). That only proves the request didn't
error — Strapi returns `201` whether it stored an unrecognized field or
silently dropped it, and this investigation has no admin/token access to
the self-hosted instance to tell those apart by reading the row back.
**Open action:** check Strapi admin (or query with a valid production
token) for whether that row's `location` column has the submitted value or
is empty/absent. If it's genuinely missing the column, the original ask in
this spec — add `location: json` to `survey-sender-v2` — still needs doing,
just against the *real* backend this time.

**Date:** 2026-07-25 (drafted as a hand-off request, then wrongly marked
resolved same day against the wrong instance); corrected 2026-07-26.
**Amends:** `design/spec-survey-sender-v2-backend.md` (see that file's own
2026-07-26 correction — same sandbox-vs-production mixup applies there).

## Why this was thought to be needed

`/sondaj/expeditori` (SurveyFormV2) gained silent, best-effort location
capture — the same mechanism the landing waitlist form already uses
(`lib/geolocation.ts` + IP fallback), requested with no visible consent UI
and no prompt-driven copy. The attribute table in the amended spec
(`design/spec-survey-sender-v2-backend.md`) never listed `location`, so the
assumption going in was that Strapi would silently drop the field. The
Strapi Cloud sandbox check disproved that for the sandbox; production
remains to be confirmed (see the top-of-file correction).

**Explicitly not doing:** a `locationConsent` field. Because the request is
silent (no prompt UI, no "reține locația" checkbox), the only two outcomes
are "browser gave coordinates" or "it didn't, so we used something else" —
and the `location.source` discriminant (`"geolocation"` vs `"ip"`) already
carries that distinction. A separate consent enum would just restate
`location === null` in a second field. If a future revision adds a visible
consent UI to this form, add `locationConsent` then, matching
`waitlist-submission`'s existing shape — not before.

## Strapi content type — shape confirmed on the sandbox only

Collection-type `survey-sender-v2` (plural API id `survey-sender-v2s`) had
this attribute **on the Strapi Cloud sandbox** — production status unknown,
see the top-of-file correction:

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

Confirmed sufficient **on the sandbox**. Production's `create` permission
on `survey-sender-v2` is separately known-good (it's how every real survey
submission already reaches production Strapi at all) — but that says
nothing about whether production's schema has the `location` column, which
is the actual open question here.

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

## Acceptance

1. ✅ **Sandbox**: `GET .../api/survey-sender-v2s` returns `200`; all 4
   pre-existing rows carry `location: null`.
2. ✅ **Production**: a POST without `location` succeeds (`201`) —
   confirmed 2026-07-26 against `https://hulubul.com/api/survey-v2`.
3. ✅ **Sandbox**: a POST with `location: { source: "geolocation", lat:
   49.611, lon: 6.131, accuracyMeters: 25 }` returned `201`; the value is
   visible, unmodified, on row id 5 (`documentId:
   du9ydi1a4s5dxpkkvvhwd3od`).
   ⬜ **Production**: same POST shape returned `201` via
   `https://hulubul.com/api/survey-v2` (row tagged
   `prod-location-repro-2026-07-26`), but whether the value actually landed
   in the `location` column is **unverified** — needs a look via Strapi
   admin or a production-scoped token.
4. Not separately tested — covered by #1/#2.

**Housekeeping:** two test rows now exist that the frontend's `create`-only
tokens can't delete themselves — sandbox row id 5 (`name:
"location-verify-2026-07-25"`) and a production row (`name:
"prod-location-repro-2026-07-26"`, plus an earlier `prod-repro-2026-07-26`
without a location field from the same investigation). All self-labeled as
test data to delete; harmless to leave otherwise.

## Out of scope

- No `locationConsent` field (see "Explicitly not doing" above) — still
  correctly absent from the live schema; nothing to add.
- No change to `survey-sender` (v1) or `waitlist-submission` — this
  concerned only `survey-sender-v2`, and no change was needed there either.
