# Spec — Survey Response v2 (Strapi backend)

**Status: LIVE and verified end-to-end (2026-07-23).** Implemented on the
backend repo's `feat/survey-sender-v2` branch (changes `survey-sender-v2-backend`
+ `survey-sender-v2-permissive-choice-limits`, both archived there), merged to
`main` via PR #12, deployed, and permissioned. Confirmed with a real POST
against the deployed instance —
`https://steadfast-bell-433fdd1ac5.strapiapp.com/api/survey-sender-v2s` →
`201`, `documentId: i1sfk1tewt3qqndy3dpgjbun` — both directly and through this
repo's own `app/api/survey-v2/route.ts`.

**Note for whoever owns DNS/custom domains:** `NEXT_PUBLIC_STRAPI_URL=https://api.hulubul.com`
(the value in `.env.example`) returned `401` for the same token that worked
fine against `https://steadfast-bell-433fdd1ac5.strapiapp.com` — the custom
domain likely isn't pointed at this Strapi Cloud instance (or points at a
different/stale one). Local `.env.local` now uses the `.strapiapp.com` URL
directly; `.env.example` wasn't changed since fixing the custom domain is an
infra/DNS matter, not a repo one.

**Confirmed compatible, with one notable adaptation**: `searchDuration` shipped
as a plain Strapi `string`, not an `enumeration` — Strapi's content-type
validator unconditionally rejects enum values without a letter before their
first digit (a GraphQL enum-naming rule), and 3 of this field's 7 canonical
values (`5_15_min`, `15_30_min`, `30_60_min`) trip that. Their `design.md`
(DEC-4) documents this; the canonical value set is a contract, not a
schema-enforced constraint — harmless here since only this frontend's Zod
schema ever writes to it. Every other field matches exactly, including the
plural API id (`survey-sender-v2s`, confirmed by their own schema test,
matching what `lib/survey-v2.ts` already assumed — no frontend change needed).

## Why we need it

Product is replacing the sender questionnaire with a shorter, sharper v2
(see `openspec/changes/sender-questionnaire-v2/` for the full proposal/design).
v1 (`survey-sender`) keeps running unmodified at `/sondaj/expeditori-v1` — v2
is **additive**, not a migration. This is a **new, separate** collection, not
an extension of `survey-sender`: the question sets and enums diverge enough
(structured multi-select caps, a 2-city route instead of free text, a merged
channel/switch-reasons question) that coupling them would make both harder to
evolve independently.

## Strapi content type

Collection-type, name `survey-sender-v2`. Public create disabled; the
frontend posts via the same Bearer token (`STRAPI_API_TOKEN`) already used
for `survey-sender` and `waitlist-submission` — just grant it `create` on
this new collection too, no separate token needed.

**Plural API id**: no naming preference from product — use whatever Strapi's
default pluralizer produces for `survey-sender-v2` (the frontend currently
assumes `survey-sender-v2s`; if Strapi's actual default differs, tell us and
we'll adjust `lib/survey-v2.ts`'s one path string — it's an isolated change).

### Attributes

The shape mirrors `lib/survey-schema-v2.ts` exactly. Enums must match
character-for-character or the frontend's POST will 400.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string (200) | yes | |
| `email` | email | yes | |
| `routeCities` | json (array, exactly 2 strings) | yes | `[origin, destination]` — free-text city names (autocomplete-assisted client-side, not validated against a gazetteer server-side) |
| `sendingFrequency` | enum | yes | `niciodata`, `rar`, `cateva_ori_pe_an`, `la_2_3_luni`, `lunar_sau_mai_des` |
| `howFindTransporter` | json (array, min 1) | yes | `transportator_cunoscut`, `recomandare_prieteni`, `facebook`, `whatsapp_telegram`, `google_site`, `nu_am_trimis`, `altcineva_organizeaza`, `altceva` |
| `howFindTransporterOther` | text | no | Free-text when `altceva` selected |
| `searchDuration` | enum | yes | `sub_5_min`, `5_15_min`, `15_30_min`, `30_60_min`, `cateva_ore`, `o_zi_sau_mai_mult`, `nu_se_aplica` |
| `difficulties` | json (array, min 1, no max) | yes | `nu_gasesc_rapid`, `nu_primesc_raspuns`, `repet_informatii`, `nu_e_de_incredere`, `pret_neclar`, `intarzieri_preluare_livrare`, `fara_informatii_status`, `altceva` |
| `difficultiesOther` | text | no | Free-text when `altceva` selected |
| `decisionCriteria` | json (array, min 1, no max) | yes | `siguranta`, `pretul`, `rapiditatea`, `disponibilitatea`, `reputatia`, `l_am_mai_folosit`, `comunicarea`, `altceva` |
| `decisionCriteriaOther` | text | no | Free-text when `altceva` selected |
| `trustSignals` | json (array, min 1, no max) | yes | `recomandare_cunoscut`, `transportator_verificat`, `recenzii_reale`, `pret_clar`, `tracking_confirmare`, `suport_problema`, `altceva` |
| `trustSignalsOther` | text | no | Free-text when `altceva` selected |
| `switchReasons` | json (array, min 1, no max) | yes | `prefer_mesaje`, `o_singura_cerere`, `ajunge_la_relevanti`, `alternative_automate`, `compar_usor`, `tracking_notificari`, `nimic_prefer_direct`, `altceva` — this is the merged former "preferred channel" + "why switch" question |
| `switchReasonsOther` | text | no | Free-text when `altceva` selected |
| `mostImportantThing` | text | yes | Single free-text answer |
| `wantsToTest` | enum | yes | `da`, `posibil`, `nu` — pre-launch testing opt-in |
| `testPhone` | string | no | Required by the frontend's own validation when `wantsToTest !== "nu"`; not enforced server-side |
| `testConsent` | boolean | no | Required by the frontend's own validation when `wantsToTest !== "nu"`; not enforced server-side |

**No max on the array fields is intentional**, not an oversight: the frontend shows a UX-only
selection limit (`ceil(n/2)` of each question's own option count) purely to keep the survey quick
to fill, but that limit is enforced only in the browser. Please don't add a max-length constraint
on these `json` array fields in Strapi — a client bypassing the UI (or a future frontend revision)
should still be able to submit more entries without hitting a backend rejection.

`draftAndPublish: false` (responses are immediately persisted; no editorial
review) — same as `survey-sender`.

## Permissions

`STRAPI_API_TOKEN` (the same one used for `survey-senders` and
`waitlist-submissions`) must additionally gain `create` permission on
`survey-sender-v2`. No public/anonymous create — the token always proxies
through `app/api/survey-v2/route.ts`.

## Frontend integration (already built, pending this collection)

- `lib/survey-schema-v2.ts` — Zod schema (canonical contract; this spec
  mirrors it).
- `lib/survey-v2.ts` — `submitSurveyV2()` POSTs to
  `${STRAPI}/api/survey-sender-v2s` with Bearer auth.
- `app/api/survey-v2/route.ts` — validates with Zod, forwards to Strapi,
  returns 201 on success or maps Strapi 4xx/404 → user-facing 502.
- `components/survey/SurveyFormV2.tsx` — the form on `/sondaj/expeditori`
  (v1 relocated to `/sondaj/expeditori-v1`, unmodified).

No frontend changes are needed once the content type ships and permissions
are granted — the next deploy will work.

## Acceptance

1. `GET https://steadfast-bell-433fdd1ac5.strapiapp.com/api/survey-sender-v2s`
   (or the actual resolved plural path) returns `200` with `{ data: [], meta:
   ... }` (instead of today's `404`).
2. A POST with the canonical payload from a successful frontend submission
   returns `201` and the row appears in Strapi admin under a "Survey
   Response v2" (or similarly named) collection.
3. Submitting the form on `/sondaj/expeditori` shows the success state, and
   the response is visible in admin.
4. A POST without the Bearer token returns `403` (matching `survey-sender`'s
   existing access rule).

## Out of scope

- No changes to the existing `survey-sender` collection or its data — v1 is
  untouched.
- No per-role question branching (same as v1's own "out of scope").
- No server-side enforcement of the `testPhone`/`testConsent` gating beyond
  what's listed as "not enforced server-side" above — the frontend's Zod
  schema is the only gate for now, matching how `wantsCallback`/
  `callbackPhone` works for `survey-sender` today.
