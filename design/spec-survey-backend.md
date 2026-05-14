# Spec — Survey Response (Strapi backend)

**Status:** Frontend ready and shipping. Strapi `survey-response` content type
**does not exist yet** — confirmed via `GET /api/survey-responses → 404`. This
blocks all survey submissions from `/sondaj/expeditori`.

Owner: backend repo (separate). Until this content type ships, every survey
submit fails with `Strapi /api/survey-responses failed: 404` (the QA report
labels it 405, but the actual response is 404 — the route doesn't exist).

## Why we need it

The survey is the post-waitlist follow-up that captures shipping behaviour,
pain points, trust signals, and ideal-experience text from senders. Without
the content type, no responses are persisted and Adrian/Andrei have nothing
to read in admin. Killing the survey is **not** the alternative — it stays.

## Strapi content type

Collection-type, name `survey-response`, plural `survey-responses`. Public
create disabled; the frontend posts via the Bearer token (`STRAPI_API_TOKEN`)
just like waitlist submissions.

### Attributes

The shape mirrors `lib/survey-schema.ts` exactly. Enums must match
character-for-character or the frontend's POST will 400.

| Field                         | Type        | Required | Notes                                                        |
|-------------------------------|-------------|----------|--------------------------------------------------------------|
| `name`                        | string (200)| yes      |                                                              |
| `email`                       | email       | yes      |                                                              |
| `whatsapp`                    | string      | no       |                                                              |
| `role`                        | enum        | yes      | `expeditor`, `transportator`, `ambele`                       |
| `routes`                      | string (500)| no       | Free-text route description.                                 |
| `source`                      | enum        | yes      | `waitlist_followup`, `standalone`, `other`                   |
| `sendingFrequency`            | enum        | no       | `niciodata`, `rar`, `cateva_ori_pe_an`, `lunar`, `mai_des`   |
| `packageTypes`                | json (array)| no       | Items from `alimente`, `haine`, `electronice`, `documente`, `altele` |
| `packageTypesOther`           | string      | no       | Free-text when `altele` selected.                            |
| `howFindTransporter`          | json (array)| no       | Items from `grup_facebook`, `recomandare`, `cunosc_personal`, `altul` |
| `howFindTransporterOther`     | string      | no       |                                                              |
| `searchDuration`              | enum        | no       | `sub_o_ora`, `cateva_ore`, `una_doua_zile`, `mai_mult`       |
| `contactedCount`              | enum        | no       | `unul`, `doi_trei`, `mai_multi`                              |
| `selectionCriteria`           | json (array, max 5) | no | Items from `pret`, `siguranta`, `viteza`, `reputatie`, `recomandare` |
| `safetyPriceAttitude`         | enum        | no       | `nu`, `uneori`, `da_depinde`                                 |
| `painPointsStructured`        | json (array)| no       | Items from `gasit_transportator`, `negociere_pret`, `comunicare`, `siguranta`, `intarzieri`, `altele` |
| `painPointDetails`            | text        | no       |                                                              |
| `issuesExperienced`           | json (array)| no       | Items from `intarzieri`, `lipsa_comunicare`                  |
| `trustSignals`                | json (array)| no       | Items from `recomandare_prieteni`, `profil_verificat`, `recenzii`, `altceva` |
| `platformTrustRequirements`   | text        | no       |                                                              |
| `idealExperience`             | text        | no       |                                                              |
| `biggestTimeSaver`            | text        | no       |                                                              |
| `willShipSoon`                | boolean     | no       |                                                              |
| `wantsCallback`               | boolean     | no       |                                                              |
| `callbackPhone`               | string      | no       | Required when `wantsCallback === true` (frontend enforces).  |

`draftAndPublish: false` (responses are immediately persisted; no editorial
review).

## Permissions

`STRAPI_API_TOKEN` (the same one used for `waitlist-submissions`) must gain
`create` permission on `survey-response`. No public/anonymous create — the
token always proxies through `app/api/survey/route.ts`.

## Frontend integration (already shipped)

- `lib/survey-schema.ts` — Zod schema (canonical contract; this spec mirrors it).
- `lib/survey.ts` — `submitSurvey()` POSTs to `${STRAPI}/api/survey-responses`
  with Bearer auth.
- `app/api/survey/route.ts` — validates with Zod, forwards to Strapi, returns
  201 on success or maps Strapi 4xx → user-facing error.
- `components/survey/SurveyForm.tsx` — the form on `/sondaj/expeditori`.

No frontend changes are needed once the content type ships and permissions
are granted — the next deploy will work.

## Acceptance

1. `GET https://steadfast-bell-433fdd1ac5.strapiapp.com/api/survey-responses`
   returns `200` with `{ data: [], meta: ... }` (instead of today's `404`).
2. A POST with the canonical payload from a successful frontend submission
   returns `201` and the row appears in Strapi admin under "Survey Responses".
3. Submitting the form on `/sondaj/expeditori` shows the success state, and
   the response is visible in admin.

## Out of scope

- Per-role question branches (transporter / "ambele"). Pending product input
  on the question content; the form currently shows sender-focused questions
  for all roles (see QA Issue "Survey questions do not change based on
  selected user role").
