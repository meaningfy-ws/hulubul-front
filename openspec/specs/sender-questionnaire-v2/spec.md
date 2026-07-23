# sender-questionnaire-v2

## Purpose

The v2 sender survey is a shorter, sharper replacement (~9 questions, ~3 min) for the original long-form sender discovery survey. It takes over the plain `/sondaj/expeditori` slug (with the original relocating unmodified to `/sondaj/expeditori-v1`), reuses the existing city-autocomplete component for route capture, caps multi-select options for cognitive load, adds an Alpha pre-launch testing opt-in with consent gating, and ships translatable, locale-keyed content. Submissions flow through a new API route and Zod schema into a new (spec-only, backend hand-off) Strapi collection, leaving the v1 pipeline untouched.

## Requirements

### Requirement: v1 relocates to `/sondaj/expeditori-v1`, unmodified
The system SHALL relocate the existing sender survey page from `/sondaj/expeditori` to `/sondaj/expeditori-v1`, with no change to its component, schema, or API route.

#### Scenario: v1 keeps working at its new URL
- **WHEN** a user navigates to `/sondaj/expeditori-v1`
- **THEN** the existing v1 form (`SurveyForm`) renders and submits exactly as it did before this change, against the unmodified `survey-sender` collection

### Requirement: v2 sender survey takes over the plain `/sondaj/expeditori` slug
The system SHALL serve the new v2 sender survey at `/sondaj/expeditori` once v1 has moved (see previous requirement). No existing in-app link or CTA needs to change, since they already target this slug.

#### Scenario: v2 page renders at the canonical slug
- **WHEN** a user navigates to `/sondaj/expeditori`
- **THEN** the v2 form renders with the merged question set defined below

#### Scenario: existing CTAs automatically serve v2
- **WHEN** a user clicks the sender-survey link in the footer, the post-signup CTA, an editorial-fallback link, or the `/sondaj` index redirect
- **THEN** they land on the v2 form, with no code change required in any of those callers

### Requirement: v2 route capture reuses the existing city-autocomplete component
The v2 form SHALL capture the sender's route as exactly two cities (origin, destination) using the existing `components/routes/CityTagInput.tsx` component (the same autocomplete-via-`/api/geocode-suggest` field used by the waitlist "stay in touch" form), not a structured country/locality form.

#### Scenario: route is captured as two autocompleted cities
- **WHEN** a respondent types a city name in the route field
- **THEN** they see autocomplete suggestions from `/api/geocode-suggest` and can select exactly one origin and one destination city (first chip = origin, last = destination)

#### Scenario: route is required
- **WHEN** a v2 submission is missing the origin or destination city
- **THEN** the API route returns a 400 validation error

### Requirement: v2 question set and validation
The v2 submission payload SHALL be validated against a dedicated Zod schema (`lib/survey-schema-v2.ts`) requiring: `name`, `email`, `routeCities` (exactly 2 entries), and nine questions — sending frequency, how-they-find-a-carrier, search duration, biggest difficulties, decision criteria, trust signals, a merged channel-and-switch-reasons question, a single free-text "most important thing" question, and a pre-launch testing opt-in. Every multi-select question (how-they-find-a-carrier, difficulties, decision criteria, trust signals, channel-and-switch-reasons) SHALL require at least 1 selection. The backend/API layer SHALL NOT enforce any maximum on how many options are selected for these fields (see the selection-cap requirement below for the frontend-only limit).

#### Scenario: submission missing a required question is rejected
- **WHEN** a v2 submission omits any of the nine required questions or the route
- **THEN** the API route returns a 400 with a validation error identifying the missing field

#### Scenario: a multi-select with zero selections is rejected
- **WHEN** a v2 submission provides an empty array for any multi-select question
- **THEN** the API route returns a 400 validation error

#### Scenario: the API accepts any number of selections
- **WHEN** a v2 submission selects every available option on a multi-select question
- **THEN** the API route does not reject it on that basis (no server-side max)

### Requirement: multi-select options are capped at 8
Every multi-select question in the v2 schema SHALL offer at most 8 options, the last of which is always a free-text "Altceva" (other) option.

#### Scenario: option list stays within the cap
- **WHEN** the v2 form renders any multi-select question
- **THEN** it shows at most 8 selectable options, including "Altceva" as the final one

### Requirement: multi-select selection cap is frontend-only UX, not a validated rule
The v2 form SHALL visually limit how many options a respondent can select on any multi-select question to `ceil(n/2)`, where `n` is that question's own option count, and SHALL show this limit next to the question. This cap SHALL be enforced only in the browser (`SurveyFormV2.tsx`) — neither the Zod schema, the `/api/survey-v2` route, nor the backend SHALL reject a submission for exceeding it.

#### Scenario: the UI blocks a selection past the cap
- **WHEN** a respondent has already selected `ceil(n/2)` options on a multi-select question and clicks another
- **THEN** the new option is not checked and the previously selected options are unaffected

#### Scenario: a payload beyond the UI cap is still accepted server-side
- **WHEN** a v2 submission (e.g. crafted directly against the API, bypassing the UI) selects more than `ceil(n/2)` options on any multi-select question
- **THEN** the API route accepts it — the cap is not re-validated server-side

### Requirement: pre-launch testing opt-in with consent gating
The v2 form's final question SHALL ask whether the respondent wants to test the platform before launch (Da / Posibil / Nu). The system SHALL only collect and submit a contact phone number when the respondent opts in ("Da" or "Posibil") AND explicitly checks a consent checkbox. This mirrors the existing `wantsCallback`/`callbackPhone` requirement pattern in `lib/survey-schema.ts`.

#### Scenario: opt-in without consent checkbox is rejected
- **WHEN** a respondent selects "Da" or "Posibil" and provides a phone number but does not check the consent checkbox
- **THEN** client-side validation blocks submission with a message asking for consent

#### Scenario: opting out skips the phone field entirely
- **WHEN** a respondent selects "Nu în această etapă"
- **THEN** no phone field is shown and no phone number is submitted

### Requirement: v2 content is locale-keyed and translatable
All v2 question text, option labels, and hints SHALL be defined in a locale-keyed data structure (`components/survey/labels-v2.ts`, `Record<"ro" | "en" | "ru" | "fr", ...>`), not hardcoded inline in the component. The page SHALL read the desired locale from a `?lang=` query parameter, defaulting to `ro`.

#### Scenario: Romanian is the default
- **WHEN** a respondent visits `/sondaj/expeditori` with no `lang` parameter
- **THEN** the form renders in Romanian

#### Scenario: English content is selectable
- **WHEN** a respondent visits `/sondaj/expeditori?lang=en`
- **THEN** the form renders using the English entry of the labels structure

#### Scenario: unauthored locales fall back gracefully
- **WHEN** a respondent visits `/sondaj/expeditori?lang=ru` or `?lang=fr` before native translations are authored
- **THEN** the form renders using the English content rather than failing or showing empty labels

### Requirement: v2 submission pipeline
A new API route (`app/api/survey-v2/route.ts`) SHALL validate the payload with the v2 Zod schema and forward it to a new Strapi collection (`survey-sender-v2`), using the existing shared `STRAPI_API_TOKEN`, without touching the v1 `survey-sender` collection or its route.

#### Scenario: valid submission is forwarded and tracked
- **WHEN** a valid v2 payload is submitted
- **THEN** the route POSTs to the Strapi `survey-sender-v2` collection, dispatches the existing survey-submit tracking event, and returns 201 on success

#### Scenario: backend collection not yet available
- **WHEN** the Strapi `survey-sender-v2` collection does not exist yet (404) or the token lacks `create` permission (403)
- **THEN** the route returns a 502 with a user-facing "couldn't submit, try again" message, matching the v1 route's existing error-mapping behavior

### Requirement: Backend contract for `survey-sender-v2` (spec-only, hand-off)
The Strapi backend (separate repo, not implemented in this repo) SHALL expose a collection type `survey-sender-v2` mirroring `survey-sender`'s access pattern: public create disabled, `create` permission granted only to the shared `STRAPI_API_TOKEN`. No changes are made to the existing `survey-sender` collection. This requirement exists to define the contract the frontend depends on; implementing it is out of scope here.

#### Scenario: collection exists and accepts the v2 shape
- **WHEN** the frontend POSTs a valid v2 payload with the shared Bearer token
- **THEN** Strapi returns 201 and the response is visible in the Strapi admin under the `survey-sender-v2` collection

#### Scenario: unauthenticated create is rejected
- **WHEN** a POST to the `survey-sender-v2` collection's resolved API path is made without the Bearer token
- **THEN** Strapi returns 403, matching `survey-sender`'s existing access rule
