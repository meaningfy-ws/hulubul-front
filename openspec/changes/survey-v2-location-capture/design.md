> Parent: `proposal.md` (EPIC: Silent location capture for the sender questionnaire v2)

## Context

The landing waitlist form (`components/landing/SignupForm.tsx`) already
captures approximate location silently and forwards it to Strapi:

- Client: `requestLocation()` (`lib/geolocation.ts`) calls
  `navigator.geolocation.getCurrentPosition` with no in-form prompt, timeout
  8s, `enableHighAccuracy: false`. Resolves `LocationGranted | null`.
- Server: `waitlistSchema` (`lib/waitlist-schema.ts`) defines the
  `Location = LocationGranted | LocationIp` union and validates it.
  `app/api/waitlist/route.ts`'s `resolveIpLocation()` reads
  `x-vercel-ip-country` / `cf-ipcountry` / `x-vercel-ip-city` headers as a
  fallback when the client sent nothing and consent was never asked.
- Strapi: `waitlist-submission` already has `location` (json) and
  `locationConsent` (enum) columns (`design/spec-waitlist-backend.md` §6).

`survey-sender-v2` (`lib/survey-schema-v2.ts`, `app/api/survey-v2/route.ts`,
`components/survey/SurveyFormV2.tsx`) had none of this on the frontend side.
**Correction (2026-07-25):** the assumption that the Strapi collection was
closed to this field was wrong — a live check (GET showing `location: null`
on all 4 pre-existing rows, then a real POST round-tripping a value
unmodified) confirmed `survey-sender-v2` already had a `location` column.
See `design/spec-survey-sender-v2-location-backend.md` for the verification
record. This design proceeds as frontend-only work with no backend
dependency, not "frontend work waiting on a backend spec."

## Goals / Non-Goals

**Goals:**
- `SurveyFormV2` silently attempts location capture on mount, same UX as
  the landing form (no prompt copy, no checkbox).
- The survey-v2 submission payload carries an optional `location`, typed
  identically to the waitlist one.
- `app/api/survey-v2/route.ts` falls back to IP-based location when the
  client didn't supply any, mirroring the waitlist route.
- The `Location` union type and IP-fallback resolver exist in exactly one
  place, imported by both flows.

**Non-Goals:**
- No `locationConsent` field or state (EPIC DEC-1).
- No UI, copy, or consent flow changes to `SurveyFormV2` beyond the silent
  capture itself.
- No change to `survey-sender` (v1).
- No backend/Strapi implementation from this repo — moot as of the
  2026-07-25 correction above: the field already existed, so there was
  nothing to hand off. `design/spec-survey-sender-v2-location-backend.md`
  is kept as the verification record, not an outstanding ask.
- No change to what the waitlist flow sends or how it behaves — only where
  its shared types/helpers physically live.

## Decisions

Settled in the EPIC (cited, not re-argued here): DEC-1 (no consent field),
DEC-2 (reuse `requestLocation()` unmodified), DEC-3 (extract shared
module), DEC-4 (no remember-me write-back), DEC-5 (frontend ships
independent of backend timeline).

New, design-level decisions:

- **Shared module location and name**: `lib/location.ts`. Exports the
  `Location` / `LocationGranted` / `LocationIp` Zod schemas (renamed from
  their current private-to-waitlist versions, behavior unchanged) and a
  `resolveIpLocation(request: Request)` function moved verbatim from
  `app/api/waitlist/route.ts`. Chosen over `lib/geolocation.ts` because that
  file is client-only (uses `navigator`), while the union type and the
  IP-resolution function are used by server code (API routes) and Zod
  schemas on both client and server — keeping them separate avoids ever
  importing `navigator`-touching code into a route handler by accident.
- **`lib/waitlist-schema.ts` re-exports, doesn't just delete**: to avoid a
  churny diff across every existing waitlist import site, `waitlist-schema.ts`
  imports `Location` from `lib/location.ts` and keeps using it locally;
  it does not need to re-export it unless another module outside this change
  already imports `Location` from `waitlist-schema.ts` (verify at
  implementation time; if nothing else imports it, no re-export needed).
- **Field name in `surveySchemaV2`**: `location`, matching the waitlist
  field name exactly (no survey-specific renaming) — consistent naming
  across both collections' identical concept.
- **Payload shape sent to `submitSurveyV2`**: `location` rides inside the
  same top-level payload object Zod already validates, exactly like every
  other field in `SurveyPayloadV2` — no separate enrichment step is needed
  client-side (contrast with the waitlist route, which enriches
  server-side with `device`; survey-v2 only needs the fallback, not a
  device signature, per the EPIC's scope).

## Algorithm / approach

**Client (`SurveyFormV2.tsx`):**

```
on mount (existing useEffect that already reads URL params + remember-me):
  add: void requestLocation().then((loc) => setLocation(loc))
  // loc is LocationGranted | null; component-local state, not yet in
  // fieldErrors/validate() — location is never required, never blocks submit

on submit, building the payload:
  location: location // LocationGranted | null, passed through as-is
```

No new required-field validation: `location` is always optional, so
`validate()` in `SurveyFormV2.tsx` is untouched.

**Shared module (`lib/location.ts`):**

```
export const LocationGranted = z.object({ source: z.literal("geolocation"), lat, lon, accuracyMeters })
export const LocationIp = z.object({ source: z.literal("ip"), city, country })
export const Location = z.union([LocationGranted, LocationIp])
export function resolveIpLocation(request: Request): LocationIp | null
  // identical body to today's app/api/waitlist/route.ts:100-108
```

**`lib/waitlist-schema.ts`:** deletes its local `LocationGranted` /
`LocationIp` / `Location` definitions, imports `Location` from
`lib/location.ts` instead. No behavior change — same shape, same
validation.

**`app/api/waitlist/route.ts`:** deletes its local `resolveIpLocation()`,
imports it from `lib/location.ts`. No behavior change.

**`lib/survey-schema-v2.ts`:**

```
import { Location } from "@/lib/location";
...
location: Location.nullable().optional(),
```

Added to `surveySchemaV2`'s object, no `.refine()` interaction — it's
independent of every existing field, including the `wantsToTest` gate.

**`app/api/survey-v2/route.ts`:**

```
const parsed = surveySchemaV2.safeParse(json);
...
let location = parsed.data.location ?? null;
if (!location) location = resolveIpLocation(request);
const strapiPayload = { ...rest, location }; // instead of raw parsed.data spread
```

Mirrors the waitlist route's fallback exactly (same condition: try IP
resolution whenever the client-sent value is absent — survey-v2 has no
consent field to gate on, so the condition simplifies to "no location at
all" rather than waitlist's `locationConsent === "not_asked" && !location`).

### Anti-patterns

- ❌ Don't add a `locationConsent` field "for symmetry" with waitlist — the
  EPIC's DEC-1 explicitly rejects this; a silent flow has nothing for it to
  record.
- ❌ Don't make `location` a required field in `surveySchemaV2` — it must
  degrade to `null` cleanly (denied permission, unsupported browser, no IP
  headers present in local dev).
- ❌ Don't duplicate the `Location` union in `lib/survey-schema-v2.ts` "to
  keep the module self-contained" — that's exactly the drift DEC-3 exists
  to prevent.
- ❌ Don't block form submission on the geolocation promise resolving —
  `requestLocation()` can take up to 8s (its own internal timeout); the
  existing waitlist pattern already treats this as fire-and-forget state
  that may or may not have resolved by the time the user submits, and this
  change must follow the same pattern, not await it in `onSubmit`.

## Error matrix

| Failure mode | Expected handling |
|---|---|
| Browser denies/blocks geolocation permission | `requestLocation()` resolves `null` (existing behavior, unchanged); payload sends `location: null`; server IP-fallback attempts to fill it |
| Browser has no `navigator.geolocation` (old browser, non-browser env) | `requestLocation()` resolves `null` immediately (existing guard); same fallback path |
| Geolocation call still pending when user submits | Payload sends whatever `location` state currently holds — `null` if not yet resolved. Not treated as an error; this is the same race the waitlist form already accepts |
| No IP-derived headers present (e.g. local dev, direct `curl`) | `resolveIpLocation()` returns `null` (existing behavior); `location` stays `null` end-to-end; submission still succeeds — field is optional |
| ~~Strapi `survey-sender-v2` doesn't yet have the `location` column~~ | **Resolved 2026-07-25**: it already did. Live POST confirmed `201` + the value persisted unmodified — this row is kept for record, the failure mode never applied. |
| Malformed `location` shape reaches the API route (shouldn't happen client-side, but defense in depth) | `surveySchemaV2.safeParse` rejects it via the `Location` union's discriminated shape; existing 400 error path (`json?.path` → field highlight) already handles unknown-field validation failures the same way every other field does |

## Risks / Trade-offs

- **[Risk]** Extracting `Location`/`resolveIpLocation()` touches
  already-shipped, verified-in-production waitlist code.
  **Mitigation**: pure move, no logic change; existing
  `tests/lib/waitlist-schema.test.ts` and waitlist route tests must pass
  unchanged after the extraction — that's the regression guard, not a
  rewrite.
- ~~**[Risk]** Frontend ships location capture before the Strapi field
  exists, so early submissions "lose" their location data.~~ **Did not
  materialize**: the field was already live when checked (2026-07-25). EPIC
  DEC-5's graceful-degradation design remains correct in principle
  (optional field, no breakage if the backend were behind) but there was no
  actual gap in this instance.
- **[Trade-off]** Not gating on consent means no way to later distinguish
  "we captured this without asking" from "we asked and they said yes" if
  product ever wants that distinction. Accepted: revisit only if a visible
  consent UI is added later (per DEC-1's own escape hatch).

## Open Questions

- ~~Does `survey-sender-v2`'s Strapi permission/webhook config choke on an
  unrecognized `location` key?~~ **Answered 2026-07-25**: no — the field
  already existed and a real POST through `app/api/survey-v2/route.ts`
  against the live instance returned `201` with the value persisted
  unmodified. No open question remains here.
