# EPIC: Silent location capture for the sender questionnaire v2

> **Addendum (2026-07-25, post-verification):** the assumption below that
> `survey-sender-v2` has no `location` column was wrong — a live check
> against the deployed Strapi instance (both read: existing rows already
> carry the key; and write: a real POST round-tripped a value unmodified)
> confirmed the field already exists and already works. DEC-5 and the
> "backend dependency" framing throughout this EPIC are therefore moot —
> not an open dependency, just a wrong premise corrected the same day.
> `design/spec-survey-sender-v2-location-backend.md` is kept as the
> verification record. Left the rest of this document as originally shaped
> rather than rewriting history — read the original text below with that
> correction in mind.

## Appetite

Small. One existing, generic client helper (`requestLocation()`) reused as-is;
one Zod field extracted and shared rather than duplicated; one route handler
gains a fallback it can copy near-verbatim from a sibling route. No new UI,
no new copy, no new consent surface.

## Why

The landing waitlist form already captures approximate location silently
(browser geolocation, IP fallback, no visible prompt) and forwards it to
Strapi. The sender questionnaire v2 (`/sondaj/expeditori`) has no location
signal at all today — product wants the same passive context on survey
responses that the waitlist submissions already carry, without adding any
new friction or consent UI to a form that's already deliberately short.

## Solution outline

`SurveyFormV2` requests the browser's location silently on mount, exactly
the way `SignupForm` (landing) already does, using the same generic
`requestLocation()` helper — no duplicated logic. Whatever comes back (or
doesn't) rides along in the survey submission payload. On the server side,
`app/api/survey-v2/route.ts` gains the same "resolve from request headers if
the client sent nothing" fallback that `app/api/waitlist/route.ts` already
has. Because both flows now need the identical `Location` type and the
identical IP-fallback logic, both get extracted out of the waitlist-specific
files into a shared module so neither flow re-defines them.

Reaching Strapi is the one piece this repo cannot do itself: the
`survey-sender-v2` collection has no `location` column. That backend change
is out of this repo's hands per this project's standing rule (frontend never
implements backend changes) — it is specified as a stand-alone hand-off
document, `design/spec-survey-sender-v2-location-backend.md`, addressed to
whoever owns the Strapi repo. This proposal's own scope is frontend-only;
the backend field is a dependency this change waits on, not work it does.

## Key decisions

- **DEC-1**: No `locationConsent` field, on either side. The request is
  silent — there is no prompt UI to have "consented" to, so a consent enum
  would just restate `location.source` (`"geolocation"` vs `"ip"` vs
  absent) in a second field. Mirrors the reasoning already recorded in
  `design/spec-survey-sender-v2-location-backend.md`.
- **DEC-2**: Reuse `lib/geolocation.ts`'s `requestLocation()` unmodified.
  It's already generic (not landing-specific) — no fork, no survey-specific
  variant.
- **DEC-3**: Extract the `Location`/`LocationGranted`/`LocationIp` Zod union
  and `resolveIpLocation()` out of `lib/waitlist-schema.ts` /
  `app/api/waitlist/route.ts` into a shared module. Both the existing
  waitlist flow and the new survey-v2 flow consume the same definitions —
  no copy-pasted union, no drift between the two over time.
- **DEC-4**: No "remember me" write-back is added to `SurveyFormV2` as part
  of this change. It stays a read-only consumer of `readRemembered()`,
  unchanged. (Decided during exploration — explicitly out of scope, see
  No-gos.)
- **DEC-5** *(moot as of the 2026-07-25 addendum above — kept for record)*:
  The frontend schema/route/component changes ship independently of the
  backend timeline. `location` is optional end to end — Strapi simply
  won't persist it until the field exists there, and the frontend degrades
  to "sends a field Strapi currently ignores" rather than breaking. In
  practice the field was already live, so this graceful-degradation path
  was never exercised in production — still correct as a design property
  (optional field, no hard dependency), just not a live gap in this case.

## Rabbit-holes

- Don't let the shared-module extraction turn into a broader refactor of
  `lib/waitlist-schema.ts`. Pull out exactly the `Location` union and
  `resolveIpLocation()` — nothing else in that file changes shape or moves.
- `resolveIpLocation()` today reads Vercel/Cloudflare-specific headers
  (`x-vercel-ip-country`, `cf-ipcountry`, `x-vercel-ip-city`). Extracting it
  is a move, not a rewrite — resist the urge to "improve" the header
  detection while relocating it.

## No-gos

- No `locationConsent` field or any visible consent/prompt UI on
  `SurveyFormV2` (DEC-1).
- No "remember me" write-back (`saveRemembered()`) added to `SurveyFormV2`
  (DEC-4) — out of scope for this change.
- No changes to `survey-sender` (v1) or its form/route/schema.
- No changes to the landing waitlist flow's behavior — only its `Location`
  type and IP-fallback helper move location (to a shared module); their
  logic is untouched.
- No backend implementation from this repo — only the hand-off spec.
- No backfill of `location` on `survey-sender-v2` rows submitted before this
  ships.

---

## What Changes

- `components/survey/SurveyFormV2.tsx` calls `requestLocation()` silently on
  mount and includes the result in the submit payload.
- `lib/survey-schema-v2.ts` gains an optional `location` field, typed with
  the shared `Location` union (see below).
- `app/api/survey-v2/route.ts` gains IP-based location fallback when the
  client didn't supply one, mirroring `app/api/waitlist/route.ts`.
- New shared module (e.g. `lib/location.ts`) holding the `Location` /
  `LocationGranted` / `LocationIp` Zod union and `resolveIpLocation()`,
  extracted out of `lib/waitlist-schema.ts` and
  `app/api/waitlist/route.ts`; both routes/schemas import from it instead of
  defining their own copies.
- `design/spec-survey-sender-v2-location-backend.md`: drafted as a backend
  hand-off request, then downgraded same-day to a verification record once
  a live check showed the field already existed and already worked — no
  Strapi change was needed or made from this repo.

## Capabilities

### New Capabilities
- `survey-v2-location-capture`: silent client-side location capture and
  transmission for the sender questionnaire v2 submission flow.

### Modified Capabilities
(none — the existing waitlist location capability is relocated to a shared
module, not behaviorally changed; no requirement text changes)

## Impact

- **Frontend code**: `components/survey/SurveyFormV2.tsx`,
  `lib/survey-schema-v2.ts`, `app/api/survey-v2/route.ts`, plus a new shared
  `lib/location.ts` (name TBD in design.md) replacing the
  waitlist-private `Location` union and `resolveIpLocation()`.
- **Indirectly touched**: `lib/waitlist-schema.ts` and
  `app/api/waitlist/route.ts` (import from the new shared module instead of
  defining locally; no behavior change).
- **Backend (Strapi)**: not touched by this repo — and, per the addendum
  above, no change was needed. `survey-sender-v2` already had the
  `location: json` field; a live POST confirmed it persists values
  unmodified.
- **Tests**: `tests/components/SurveyFormV2.test.tsx` and any
  `tests/lib/waitlist-schema.test.ts` / new shared-module test need updates
  for the extraction and the new field.
