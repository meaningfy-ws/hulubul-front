# Waitlist — Frontend Spec

> Date: 2026-04-27
> Scope: full frontend contract for the waitlist sign-up.
> Files: `components/landing/SignupForm.tsx`,
> `components/landing/CitiesQuestion.tsx` (new),
> `components/routes/CityTagInput.tsx` (reused, extended),
> `lib/waitlist-schema.ts`, `lib/strapi.ts::submitWaitlist`,
> `app/api/waitlist/route.ts`, `lib/remember-me.ts`.
> Companion doc: `design/spec-waitlist-backend.md`.
> Related: `design/spec-routes-manipulation.md` (source of `CityTagInput`),
> `design/epic-survey/post-waitlist.md` (post-success CTA target).

---

## 1. Goal

Capture diaspora-side intent to use Hulubul before launch, with a form that:

- collects identity (`name`, `email`, optional `whatsapp`),
- captures **role** (sender / transporter / receiver),
- captures a **role-aware ordered list of cities** with European-city
  autocomplete and drag-to-reorder,
- offers **remember-me** so returning visitors don't re-type their identity,
- on success, **invites** the visitor to a 3-minute follow-up survey at
  `/sondaj/expeditori`.

This iteration's headline change is replacing the free-text "rute" field with
a structured `cities` chip list whose semantics adapt to the chosen role.

---

## 2. Scope

In scope:

- The `<SignupForm>` rendered by the landing page.
- The `cities` capture (new `CitiesQuestion` wrapper around `CityTagInput`).
- Zod schema, route handler, Strapi fetcher, all error states.
- Remember-me prefill for identity fields.
- Survey CTA on success state.

Out of scope (see §13).

---

## 3. UX

### 3.1 Form layout (top to bottom)

1. **Name** — text input. Required.
2. **Email** — email input. Required. Hint: "Aici îți trimitem anunțul de lansare."
3. **WhatsApp** — tel input. Optional. Hint: "Opțional — mai rapid pentru anunțuri scurte."
4. **Role** — radio group: "Trimit pachete" / "Transport pachete" / "Primesc pachete". Required.
5. **Cities question** — role-driven label + `<CityTagInput>`. Required (≥ 1 city).
6. **Location prompt** — small panel asking "Pot afla locația ta aproximativă?" with two buttons: *"Da, partajează"* (triggers browser geolocation prompt) and *"Nu, ascunde"* (sets `locationConsent: denied`). See §3.7.
7. **Remember me** — checkbox, default checked. Hint about local-only storage.
8. **GDPR consent** — required checkbox: *"Sunt de acord cu [politica de confidențialitate](/privacy) și cu prelucrarea datelor mele pentru anunțul de lansare Hulubul."* Submit is disabled until this is ticked.
9. **Submit** button — full-width.
10. **Privacy note** — small text below submit, sourced from CMS `privacyNote`.

**Hidden fields** (not shown in UI; populated by client/server, sent in payload):

- `location` — see §3.7.
- `locationConsent` — `granted` / `denied` / `not_asked`.
- `utm` — captured from URL on first paint, persisted in sessionStorage. See §3.8.
- `client.viewport`, `client.timezone` — set on submit; merged with header-derived `device` server-side.
- `gdprConsentAt`, `gdprConsentVersion` — set client-side at the moment the box is ticked.

### 3.2 Role-driven cities question

| Role | Label | Hint | Origin/destination badges |
|---|---|---|---|
| `expeditor` | "De unde trimiți și unde trebuie să ajungă pachetul?" | "Primul oraș = de unde pleacă pachetul. Ultimul = unde trebuie să ajungă. Adaugă escale dacă vrei." | Yes (first chip = "Plecare", last = "Destinație"). |
| `destinatar` | "De unde pleacă pachetul tău și unde trebuie să ajungă?" | "Primul oraș = de unde pleacă pachetul. Ultimul = unde îl primești." | Yes. |
| `transportator` | "De unde pleci și prin ce orașe livrezi pachete?" | "Primul oraș = de unde pleci. Ordinea contează — adaugă orașele în ordinea aproximativă a rutei tale." | Yes (first chip = "Plecare", last = "Destinație"). |

For **all three roles**, the `cities` array is **ordered**: index 0 is the
origin / start of the trip, the last index is the destination / end. Middle
indices are waypoints in the approximate order travelled. The semantics are
the same; only the framing copy differs.

Switching role **preserves** entered cities and their order — only labels and
hints re-render. Clearing was considered and rejected: people self-correct,
and losing a list is worse than mismatched copy for one second.

### 3.3 Cities chip list — interaction model

The list is rendered by the shared `CityTagInput` (see §6). The waitlist uses
it with role-driven props. Behaviour summary (full detail in §6):

- **Add** — type ≥ 2 chars in the trailing input → debounced 300 ms call to
  `/api/geocode-suggest` → dropdown of up to 5 European-city suggestions →
  click or `↓` + `Enter` to insert. `Escape` cancels.
- **Insert between** — click the thin gap between two chips. An inline
  autocomplete input mounts at that index.
- **Remove** — click the `×` on a chip, or focus a chip and press `Backspace`.
- **Reorder** — drag a chip (mouse or touch). Keyboard equivalent:
  `Alt + ArrowLeft` / `Alt + ArrowRight` swaps the focused chip with its
  neighbour.
- **Hard caps** — max 10 chips (matches backend).

### 3.4 Remember me

- Default: checked.
- On successful submit with checkbox checked: persist
  `{ name, email, whatsapp? }` to `localStorage` via `lib/remember-me.ts`.
- On next mount: prefill identity fields from `localStorage`. Show a small
  "Nu ești tu? Șterge." link near the name field that clears the stored
  identity and the form fields.
- Cities and role are **never** remembered. People's needs change between
  visits; identity does not.

### 3.5 Submit, success, error

- Submit button text: CMS-driven; falls back to "Anunță-mă la lansare".
- While submitting: button shows "Se înscrie..." and is disabled.
- On 201: form is replaced by the success card:
  - Title: CMS `successTitle`. Body: CMS `successMessage`.
  - Primary CTA: link to `/sondaj/expeditori` labelled "Împărtășește experiența ta de expeditor (3 min)". Click sets `sessionStorage["hulubul:from-waitlist"] = "1"` so the survey can prefill identity and tag `source: "waitlist_followup"`.
  - Secondary link: "Rămâi pe pagina principală" → `/`.
- On 4xx/5xx: inline error under the submit button, role=alert, message taken
  from response `{ error }` if present, else a generic RO message.

### 3.6 URL prefill

`?role=expeditor|transportator|destinatar` prefills the role radio. Other
fields are not URL-prefillable (PII concern + URL-share leakage).

### 3.7 Location prompt

A small panel sits between the cities question and the remember-me checkbox:

```
┌────────────────────────────────────────────────────┐
│ 🌍 Pot afla locația ta aproximativă?                │
│ Ne ajută să prioritizăm orașele de pornire.         │
│                                                    │
│ [ Da, partajează ]   [ Nu, ascunde ]                │
└────────────────────────────────────────────────────┘
```

Behaviour:

- Initial state: panel visible, `locationConsent === "not_asked"`,
  `location === null`.
- *"Da, partajează"* — calls `navigator.geolocation.getCurrentPosition`. On
  success: `location = { source: "geolocation", lat, lon, accuracyMeters }`,
  `locationConsent = "granted"`, panel collapses to a small chip showing
  "Locație partajată ✓ [Ascunde]". The "Ascunde" link reverts to
  `locationConsent = "denied"`, `location = null`.
- *"Nu, ascunde"* — `locationConsent = "denied"`, `location = null`, panel
  collapses to a one-line note: "Locație ascunsă. [Schimbă]". "Schimbă"
  reopens the panel.
- Browser-denied or unavailable geolocation — same as user clicking "Nu":
  consent becomes `denied`, panel shows the collapsed note + a small
  "Browser-ul a respins cererea" hint.
- The user can still submit the form regardless of the choice — location
  never blocks submission.

The server's IP-based fallback (see backend §6) only fires when
`locationConsent === "not_asked"`, i.e. the user submitted without
interacting with the panel. For users who explicitly chose, we honour their
choice exactly.

### 3.8 UTM capture

On the first mount of the landing page (any route under `/`) we read
`window.location.search` and `document.referrer` and persist them to
`sessionStorage["hulubul:utm"]`:

```ts
{
  utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?,
  gclid?, fbclid?, referrer?
}
```

Empty fields are omitted. On waitlist submit, the form reads from
sessionStorage and includes `utm` in the payload (or omits it entirely if
nothing was captured). The capture happens in a small client utility
`lib/utm.ts` invoked from the landing-page client wrapper, so it runs once
per session regardless of which page the user lands on first.

### 3.9 GDPR consent

- Checkbox is **unticked** by default. Submit button is `disabled` until it's
  ticked.
- Ticking the box sets `gdprConsentAt = new Date().toISOString()`.
- `gdprConsentVersion` is a build-time constant exported from
  `lib/gdpr-consent.ts` (e.g. `export const GDPR_CONSENT_VERSION = "2026-04-27";`).
  Bumped whenever the privacy text changes materially.
- The label includes a link to `/privacy`. Clicking it opens in a new tab so
  the form state is not lost.

---

## 4. Validation (Zod)

`lib/waitlist-schema.ts`:

```ts
import { z } from "zod";

export const Role = z.enum(["expeditor", "transportator", "destinatar"]);
export type Role = z.infer<typeof Role>;

const City = z.string().trim().min(1).max(120);

const LocationGranted = z.object({
  source: z.literal("geolocation"),
  lat: z.number(),
  lon: z.number(),
  accuracyMeters: z.number().nonnegative(),
});
const LocationIp = z.object({
  source: z.literal("ip"),
  city: z.string().nullable(),
  country: z.string().length(2).nullable(),
});
const Location = z.union([LocationGranted, LocationIp]);

const Utm = z
  .object({
    utm_source: z.string().max(256).optional(),
    utm_medium: z.string().max(256).optional(),
    utm_campaign: z.string().max(256).optional(),
    utm_term: z.string().max(256).optional(),
    utm_content: z.string().max(256).optional(),
    gclid: z.string().max(256).optional(),
    fbclid: z.string().max(256).optional(),
    referrer: z.string().max(2048).optional(),
  })
  .optional();

export const waitlistSchema = z.object({
  name: z.string().trim().min(1, "Numele este obligatoriu"),
  email: z
    .string()
    .trim()
    .min(1, "Email-ul este obligatoriu")
    .email("Email invalid — verifică și încearcă din nou"),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  role: Role,
  cities: z.array(City).min(1, "Adaugă cel puțin un oraș.").max(10),
  source: z
    .enum(["landing", "qr_event", "referral", "other"])
    .optional()
    .default("landing"),

  // Consent
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Trebuie să accepți politica de confidențialitate." }),
  }),
  gdprConsentAt: z.string().datetime(),
  gdprConsentVersion: z.string().min(1).max(64),

  // Optional analytics
  location: Location.nullable().optional(),
  locationConsent: z
    .enum(["granted", "denied", "not_asked"])
    .optional()
    .default("not_asked"),
  utm: Utm.nullable(),
  client: z
    .object({
      viewport: z.object({ w: z.number().int(), h: z.number().int() }).optional(),
      timezone: z.string().max(64).optional(),
    })
    .optional(),
});

export type WaitlistPayload = z.infer<typeof waitlistSchema>;
```

Notes:

- We accept `cities.length === 1` for senders/receivers. The hint copy
  recommends two; we do not hard-block. Avoids dead-ends when users only know
  one side of the trip.
- The legacy `routes` field is no longer in the schema.
- `source` defaults to `landing`; future channels (QR codes, referrals) pass
  a different value.

---

## 5. Architecture

```
components/
  landing/
    SignupForm.tsx          ← updated: role-aware cities, no `routes`,
                              survey CTA on success
    CitiesQuestion.tsx      ← NEW: picks label/hint per role,
                              renders <CityTagInput> with right props,
                              owns the array state passed up to SignupForm

components/routes/
  CityTagInput.tsx          ← reused; extended with
                              `originDestinationLabels` prop,
                              drag-to-reorder, insert-between (see §6)

components/
  landing/
    LocationPrompt.tsx      ← NEW: panel for geolocation consent (§3.7)
    GdprConsent.tsx         ← NEW: required checkbox + version stamp (§3.9)

lib/
  waitlist-schema.ts        ← new role enum, `cities` array, `source`,
                              consent + location + utm + client fields
  remember-me.ts            ← unchanged: stores identity only
  utm.ts                    ← NEW: capture from URL, persist to sessionStorage,
                              read on submit
  geolocation.ts            ← NEW: thin wrapper over navigator.geolocation
                              with promise + error mapping
  gdpr-consent.ts           ← NEW: exports GDPR_CONSENT_VERSION constant
  strapi.ts                 ← unchanged contract; `submitWaitlist(payload)`

app/api/
  waitlist/route.ts         ← validates new payload via Zod; builds `device`
                              from headers + client hints; resolves IP-based
                              location when locationConsent === "not_asked"
  geocode-suggest/route.ts  ← reused from routes feature
```

`CityTagInput` lives in `components/routes/` because that's where the routes
feature put it. We do not move it; it's a shared component used by both the
waitlist and the routes admin/public pages. A short ADR-style note at the
top of the file documents the dual ownership.

---

## 6. `CityTagInput` (shared)

Already specified in `design/spec-routes-manipulation.md` §6. This spec adds
the following without breaking existing callers:

### 6.1 New props

```tsx
interface CityTagInputProps {
  value: string[];
  onChange: (cities: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  originDestinationLabels?: boolean;   // default: true
  maxCities?: number;                  // default: 10
}
```

### 6.2 Drag-to-reorder

- Each chip is `draggable`. While dragging, a thin highlighted line appears
  between siblings as a drop target.
- Drop reorders the array; `onChange` fires with the new ordering.
- Mouse + touch supported. Keyboard equivalent in §6.4.

### 6.3 Insert between

- Clicking a thin gap between two chips mounts a focused autocomplete input
  at that index.
- Picking a suggestion inserts a new chip there. `Escape` cancels.
- The trailing input remains the default (cursor lands after the last chip
  when there is no positional click).

### 6.4 Keyboard

- `←` / `→` move focus between chips.
- `Alt + ArrowLeft` / `Alt + ArrowRight` swap the focused chip with its
  neighbour.
- `Enter` on a focused gap opens an inline input at that position.
- `Backspace` on an empty trailing input removes the last chip (existing
  behaviour, kept).

### 6.5 Origin/destination badges

When `originDestinationLabels === true` (default): first chip shows
"Plecare", last chip shows "Destinație", single chip shows "Plecare".
When `false`: no badges. The waitlist passes `true` for **all three roles**
(order is meaningful for every role — see §3.2). The prop exists for future
callers that may want a flat list, but the waitlist never uses it.

### 6.6 Autocomplete fallback

If `/api/geocode-suggest` errors or returns empty, the dropdown shows
"Nu s-au găsit sugestii". The user can still press `Enter` on the typed
text to insert it as a chip — we never block on a flaky upstream.

---

## 7. Network contract

POST to `/api/waitlist`:

```http
POST /api/waitlist
Content-Type: application/json

{
  "name": "Ana Popescu",
  "email": "ana@example.com",
  "whatsapp": "+352 621 123 456",
  "role": "expeditor",
  "cities": ["Luxembourg", "Chișinău"],
  "source": "landing",
  "gdprConsent": true,
  "gdprConsentAt": "2026-04-27T15:42:11.000Z",
  "gdprConsentVersion": "2026-04-27",
  "location": { "source": "geolocation", "lat": 49.61, "lon": 6.13, "accuracyMeters": 32 },
  "locationConsent": "granted",
  "utm": { "utm_source": "fb", "utm_medium": "cpc", "utm_campaign": "lux-launch" },
  "client": { "viewport": { "w": 1280, "h": 800 }, "timezone": "Europe/Luxembourg" }
}
```

Responses (mapped to UI state):

| Status | Body | UI state |
|---|---|---|
| 201 | `{ ok: true }` | Success card. |
| 400 | `{ error: "<message>" }` | Inline error (`role=alert`). |
| 502 | `{ error: "<message>" }` | Inline error (`role=alert`). |
| network failure | – | Inline error with generic RO message. |

Backend contract is documented in `design/spec-waitlist-backend.md`.

---

## 8. CMS-driven copy (Strapi `landing-page`)

The form pulls these from `landing-page.signup`:

| Field | Used as | Fallback |
|---|---|---|
| `nameLabel`, `nameHint`, `namePlaceholder` | Name field. | "Numele tău", "Cum să ți ne adresăm." |
| `contactLabel` | Email label (legacy name; we treat it as email). | "Email" |
| `roleLabel` | Role radio group label. | "Tu cum vrei să folosești Hulubul?" |
| `roleOptions` | Role radio items (`{value, label}`). | `expeditor / transportator / destinatar` defaults. |
| `roleDefault` | Initial role when no URL param. | `expeditor` |
| `submitLabel` | Submit button. | "Anunță-mă la lansare". |
| `successTitle`, `successMessage` | Success card. | RO defaults. |
| `privacyNote` | Below submit. | empty (omits the line). |

The CMS must be updated to:

- Replace the old single "rute" labels with **no** copy at all (the cities
  question now uses hardcoded role-driven copy in the component — see §3.2).
  Reason: that copy depends on role; pulling three variants from the CMS adds
  editorial overhead without value.
- Update `roleOptions` to `[{value:"expeditor",label:"Trimit pachete"},
  {value:"transportator",label:"Transport pachete"},
  {value:"destinatar",label:"Primesc pachete"}]`.

The CMS update is an ops step (STORY 6); the frontend ships defaults so a
late CMS update doesn't block the release.

---

## 9. Stories (TDD order)

### STORY 1 — Schema + types

`lib/waitlist-schema.ts` switches to the new shape. Update
`tests/lib/waitlist-schema.test.ts`:

- valid each role × `cities` length 1, 2, 5, 10.
- rejects empty `cities`, length 11, blank-string entries, > 120 chars.
- rejects `ambele`.
- accepts `source` omitted; default fills in `landing`.

**Acceptance:** parser tests green; `routes` removed; `cities` and new role
enum present.

### STORY 2 — `CityTagInput` enhancements

Add `originDestinationLabels` prop, drag-to-reorder, insert-between, keyboard
swap. Existing tests stay green; new tests cover each behaviour
(see §6). Routes admin page is unaffected (defaults preserve old behaviour).

### STORY 3 — `CitiesQuestion` wrapper

New small client component:

```tsx
interface CitiesQuestionProps {
  role: Role;
  value: string[];
  onChange: (cities: string[]) => void;
}
```

Picks label/hint per role from a static map. Always passes
`originDestinationLabels = true` to `CityTagInput` — order matters for every
role (see §3.2). Pure UI, no fetch.

**Acceptance:** RTL tests for each role's label/hint; role flip preserves
the value and its order; "Plecare"/"Destinație" badges render for every role.

### STORY 4 — `LocationPrompt`, `GdprConsent`, `lib/utm.ts`, `lib/geolocation.ts`

Self-contained primitives:

- `lib/utm.ts` — `captureUtmFromUrl()` and `readStoredUtm()`. Unit-tested
  for query-string parsing, sessionStorage round-trip, missing keys.
- `lib/geolocation.ts` — `requestLocation(): Promise<LocationGranted | null>`.
  Wraps `navigator.geolocation.getCurrentPosition` in a promise; maps
  permission-denied / unavailable to `null`.
- `<LocationPrompt>` — renders the panel; owns the `locationConsent`/`location`
  state lifted to a callback prop. Tests cover the three states (initial,
  granted, denied) + the "Schimbă" / "Ascunde" toggles + browser-denied.
- `<GdprConsent>` — required checkbox; emits `{ consent: boolean,
  consentAt: string | null, version: string }`. Tests cover initial unticked,
  tick → consentAt set, untick → consentAt cleared.

### STORY 5 — `SignupForm` rewire

- Replace the `routes` text input with `<CitiesQuestion>`.
- Drop `ambele` from local fallback role list; add `destinatar`.
- Mount `<LocationPrompt>` between cities and remember-me.
- Mount `<GdprConsent>` above the submit button; bind submit `disabled` to
  consent state.
- On mount, call `captureUtmFromUrl()`.
- On submit, build the payload including `location`, `locationConsent`, `utm`,
  `gdprConsent*`, `client.viewport`, `client.timezone`.
- Keep remember-me, prefill, success card, and survey CTA unchanged in
  shape; verify by tests.

`tests/components/SignupForm.test.tsx`:

- happy path per role,
- role switch preserves cities,
- submit posts `{ ..., cities: [...], source: "landing", gdprConsent: true, ... }` and not `routes`,
- submit disabled until GDPR consent ticked,
- LocationPrompt → granted appends `location: { source: "geolocation", ... }` to payload,
- LocationPrompt → denied appends `locationConsent: "denied"` and `location: null`,
- UTM in sessionStorage flows into payload,
- remember-me prefill still populates name/email/whatsapp,
- "Nu ești tu? Șterge." clears identity and the form,
- success card shows, survey CTA sets `sessionStorage["hulubul:from-waitlist"]`,
- error response shows inline error.

### STORY 6 — Route handler & Strapi fetcher

`app/api/waitlist/route.ts`:

- validates the new payload via Zod,
- builds `device` from `request.headers` (`user-agent`, `accept-language`,
  `dnt`, `sec-ch-ua-platform` if present) merged with `client.viewport` and
  `client.timezone`,
- when `locationConsent === "not_asked"`, resolves an IP-based location from
  request headers (`cf-ipcountry`, `x-vercel-ip-country`, `x-forwarded-for`)
  and stores `{ source: "ip", city, country }`. No external lookup if those
  headers are absent — store `null`.

Tests:

- accepts new shape; persists `device` built server-side,
- rejects legacy `routes`-only shape with 400,
- rejects payload missing `gdprConsent` with 400,
- IP-fallback fires only when consent is `not_asked`,
- `device.userAgent` truncated to 512 chars.

`lib/strapi.ts::submitWaitlist` MSW test asserts `data.cities`,
`data.source`, `data.gdprConsent`, `data.location`, `data.utm`, `data.device`
are all forwarded.

### STORY 7 — CMS update (no code change)

Operator updates `landing-page.signup.roleOptions` in Strapi to the three
new roles. Tracked in `design/strapi-runbook.md` §3.

### STORY 8 — Cross-reference into the survey epic

Add a one-line pointer in `design/epic-survey/post-waitlist.md` to
`design/spec-waitlist-backend.md` so the role-enum coordination is visible.

---

## 10. Testing strategy

Mapped to `design/testing-strategy.md` §4.

| Layer | What | Count |
|---|---|---|
| Unit — `lib/waitlist-schema.ts` | role enum, cities bounds, rejects `ambele`/`routes`, `source` default, consent fields, location union, utm shape | ~12 |
| Unit — `lib/utm.ts` | URL parsing, sessionStorage round-trip, missing keys, max length | ~4 |
| Unit — `lib/geolocation.ts` | success → LocationGranted, permission denied → null, unavailable → null | ~3 |
| Unit — `CityTagInput` | drag reorder, insert-between, keyboard swap, label suppression | ~5 |
| Component — `CitiesQuestion` | per-role label/hint, value preserved across role switch, badge toggle | ~4 |
| Component — `LocationPrompt` | initial state, grant flow, deny flow, browser-denied, "Schimbă" toggle | ~5 |
| Component — `GdprConsent` | unticked initial, tick sets consentAt, untick clears it | ~3 |
| Component — `SignupForm` | per-role happy path, role switch preserves cities, payload shape, prefill, success CTA, error inline, GDPR-disables-submit, location flow into payload, UTM flow into payload | ~10 |
| Route handler — `/api/waitlist` | accepts new shape; rejects legacy `routes`-only shape; rejects missing consent; builds `device`; IP-fallback only when not_asked; 502 on Strapi 4xx; 400 on bad JSON | ~7 |
| MSW — `submitWaitlist` | forwards `data.cities` + `data.source` + `data.gdprConsent` + `data.location` + `data.utm` + `data.device`; surfaces 401/403 with runbook pointer | ~3 |

Target: ~56 new/updated test cases. No E2E added in this spec; landing-page
Playwright happy-path (if any) covers the rendered form.

**Anti-coverage** (we deliberately don't test):

- Photon's response shape — that's `geocode-suggest` route handler's job.
- Drag-and-drop pixel-level visuals — keyboard equivalents are the contract.
- Strapi enum values — the backend owns those; our Zod mirrors them so drift
  surfaces as a parser test failure on our side.

---

## 11. Accessibility

- Each form field has a real `<label>`. Hints are inside the label, styled
  smaller, not `aria-describedby` (current pattern; works with screen
  readers).
- Role radios use a `<div role="radiogroup">` wrapper.
- The chip list uses real `<button>` elements for chips; `×` is a button.
- Drag-and-drop has full keyboard parity (`Alt + Arrow` reorder, `Enter` to
  open positional input). Drag is an enhancement, not the only path.
- Errors are `role="alert"` so they announce on appearance.
- Focus management: after submit success, focus moves to the success card
  heading; after submit error, focus moves to the error message.

---

## 12. Acceptance criteria

- [ ] All four identity fields (name/email/whatsapp/role) work as today.
- [ ] Selecting "Trimit pachete" shows the sender question with
      "Plecare"/"Destinație" badges.
- [ ] Selecting "Primesc pachete" shows the receiver question with the same
      badges.
- [ ] Selecting "Transport pachete" shows the route question
      ("De unde pleci și prin ce orașe livrezi pachete?") with
      "Plecare"/"Destinație" badges.
- [ ] Switching role does not clear chips.
- [ ] Typing 2+ chars triggers Photon autocomplete (debounced 300 ms);
      clicking a suggestion inserts a chip.
- [ ] Clicking between chips opens an input at that position; choosing a
      suggestion inserts there.
- [ ] Dragging a chip reorders the list.
- [ ] `Alt + Arrow` keyboard reorder works.
- [ ] Submitting with one city succeeds for any role; with zero cities shows
      an inline error and does not POST.
- [ ] POST body contains `cities: string[]` and `source: "landing"`; **no**
      `routes` key.
- [ ] Remember-me prefill works for `name`/`email`/`whatsapp`.
- [ ] "Nu ești tu? Șterge." clears identity locally and from the form.
- [ ] Success card shows survey CTA; clicking it sets
      `sessionStorage["hulubul:from-waitlist"]` and navigates to
      `/sondaj/expeditori`.
- [ ] `?role=destinatar` URL prefill selects the right radio.
- [ ] Network failure shows an inline error and keeps the form data intact.
- [ ] Submit button is disabled until the GDPR consent checkbox is ticked.
- [ ] Ticking the GDPR checkbox stamps `gdprConsentAt` with the current ISO time and `gdprConsentVersion` with the constant from `lib/gdpr-consent.ts`.
- [ ] Submitting without consent (e.g. via JS bypass) is rejected by the route handler with 400.
- [ ] LocationPrompt → "Da, partajează" → granted → payload contains `location: { source: "geolocation", lat, lon, accuracyMeters }` and `locationConsent: "granted"`.
- [ ] LocationPrompt → "Nu, ascunde" → payload contains `location: null` and `locationConsent: "denied"`; server-side IP fallback does not run.
- [ ] LocationPrompt left untouched → payload omits `location` (or sends `null`); server resolves IP-based city/country from headers when present.
- [ ] User can toggle from granted → denied with the "Ascunde" link in the collapsed chip.
- [ ] UTM parameters present on the landing URL flow through sessionStorage into the payload.
- [ ] Direct visit (no UTM in URL, no referrer) → payload omits `utm`.
- [ ] `client.viewport` and `client.timezone` are populated on submit and merged into the persisted `device` server-side.
- [ ] Full test suite green, typecheck clean, production build passes.

---

## 13. Out of scope

- Multi-trip submissions (one ordered list per submission). Multi-trip is a
  follow-up if data shows it matters.
- A "secondary role" field for people who both send and transport.
- Linking the submission to the `route` collection.
- i18n (EN/FR) — copy is RO-only for now.
- Drag-and-drop polish on touch devices below ~360 px wide; keyboard reorder
  is the documented fallback there.
- Geocoding the submitted cities to lat/lon (the routes domain owns
  canonical coordinates).
- Spam/abuse protection (rate limiting, CAPTCHA). Acceptable risk pre-launch;
  revisit if traffic patterns demand.
- Editing or deleting an already-submitted waitlist entry from the frontend.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Photon flakiness blocks the form. | `Enter` on typed text adds a chip even without a suggestion. |
| Drag-and-drop is fiddly across browsers. | Native HTML5 DnD; keyboard reorder ships in the same story so a11y is never blocked. |
| CMS `roleOptions` not updated → form shows stale `ambele`. | Frontend has hard-coded fallback role list; if CMS returns `ambele`, the radio renders it but Zod rejects on submit with a clear error. Brief window only. |
| Users with `ambele` in remembered identity. | Identity prefill stores only name/email/whatsapp; role isn't remembered. Cannot happen. |
| Role enum drift between waitlist and survey. | Backend spec §8 calls out coordination; survey epic gets a pointer note (STORY 7). |
| `routes` field still expected by some test or CMS field. | Tests updated in STORY 1/4/5; CMS field becomes ignored copy. No code path reads it. |
