# Waitlist — Backend Spec

> Date: 2026-04-27
> Scope: full backend contract for the waitlist on Strapi Cloud.
> Collection: `api::waitlist-submission.waitlist-submission`.
> Companion doc: `design/spec-waitlist-frontend.md`.
> Related: `design/strapi-runbook.md` (admin/edit flow),
> `design/epic-survey/post-waitlist.md` (shares the role enum — see §8).

---

## 1. Goal

Persist diaspora-side interest in Hulubul before launch, with enough structured
detail to drive (a) launch-day announcements, (b) early matching of senders ↔
transporters ↔ receivers, and (c) qualitative analysis of geographic demand.

The primary upgrade in this iteration is replacing the free-text "routes"
field with a structured, role-aware `cities` array, and broadening the role
enum (see §3, §4). Everything else in the contract is documented here so a
new contributor can onboard from this single doc.

---

## 2. Architecture & invariants

```
Browser ──POST {payload}──▶ Next.js /api/waitlist ──Bearer──▶ Strapi /api/waitlist-submissions
```

- The browser **never** talks to Strapi directly. `STRAPI_API_TOKEN` lives on
  the Next.js server only (`lib/strapi.ts`).
- Public `create` on `waitlist-submission` is **disabled** in Strapi (Settings
  → Roles → Public). Only the API token grants `create`.
- `find` on `waitlist-submission` is **disabled** for Public. Submissions are
  not readable from the browser. Editorial reads happen in the Strapi admin.
- The Next.js route handler is a thin proxy + Zod validator + error mapper.
  It never persists state of its own.

---

## 3. Collection schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✓ | Trimmed; ≤ 200 chars. |
| `email` | email | ✓ | Strapi's email type validates shape. Lowercased on the frontend before send. |
| `whatsapp` | string | – | Optional. Free format (+ digits, spaces). Frontend strips obvious formatting noise but does no E.164 validation. |
| `role` | enum | ✓ | See §4. |
| `cities` | json | – | Ordered array of city strings — see §5. Optional at the schema level so partial submissions land; required by the **frontend** Zod schema. |
| `routes` | string | – | **Deprecated** 2026-04-27. Kept for one release cycle for back-compat; see §7. |
| `submittedAt` | datetime | – (auto) | Strapi's `createdAt` is the source of truth — no extra column. |
| `source` | enum | – | Optional analytics tag: `landing` (default) \| `qr_event` \| `referral` \| `other`. Frontend always sends `landing`. Future channels add values. |
| `location` | json | – | Optional approximate location of the filler (see §6). Either `{ lat, lon, accuracyMeters, source: "geolocation" }` (browser permission granted) or `{ city, country, source: "ip" }` (server-side IP-based fallback) or `null` if the user opts out. |
| `locationConsent` | enum | – | `granted` \| `denied` \| `not_asked`. Reflects what the user explicitly chose for the location prompt. Default `not_asked`. |
| `device` | json | – | Browser/device signature collected server-side from request headers (see §7). Shape: `{ userAgent, platform, language, viewport: { w, h } \| null, timezone, dnt: boolean }`. Purely descriptive — no fingerprinting hashes. |
| `gdprConsent` | boolean | ✓ | `true` only if the user ticked the explicit consent checkbox. Submission is rejected when false. |
| `gdprConsentAt` | datetime | ✓ | ISO timestamp of consent (set client-side at the moment the box is ticked; revalidated server-side to be ≤ now and ≥ submit-1h). |
| `gdprConsentVersion` | string | ✓ | Versioned identifier of the consent text shown (e.g. `"2026-04-27"`). Frozen string per release; lets us prove which text the user agreed to. |
| `utm` | json | – | UTM/click parameters captured from the landing URL on first paint, then sent with the form. Shape: `{ utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid, referrer }`. All entries optional; null/empty fields omitted. |

Strapi 5 manages `documentId` automatically — we do not add one.

GDPR consent is now first-class (`gdprConsent` + `gdprConsentAt` +
`gdprConsentVersion`). The privacy note next to the submit button still
exists as the human-readable framing, but the legal record of consent is
the trio of fields above.

---

## 4. Role enum

| Value | RO label (frontend) | Meaning |
|---|---|---|
| `expeditor` | "Trimit pachete" | Sends parcels (typically diaspora → Moldova). |
| `transportator` | "Transport pachete" | Drives / carries parcels for others. |
| `destinatar` | "Primesc pachete" | Receives parcels. The diaspora-vs-Moldova split is derived from `cities`, not the role. |

**Removed:** `ambele`. Migration is described in §7. During the deprecation
window, the enum still legally accepts `ambele` so historical rows stay valid
in the admin UI; the frontend stops emitting it on release day.

---

## 5. `cities` semantics

`cities` is **always a JSON array of trimmed non-empty strings**. The order
encodes meaning *only* for `expeditor` and `destinatar`:

| Role | Order semantics | Min | Max |
|---|---|---|---|
| `expeditor` | `cities[0]` = origin (where they send FROM), `cities[length-1]` = destination. Middle cities = transit waypoints. | 1 | 10 |
| `destinatar` | Same as `expeditor`. `cities[0]` = origin (where the parcel leaves from), last = destination (where they receive it). The role tells us which side of the trip the user is on, not the array. | 1 | 10 |
| `transportator` | `cities[0]` = where they depart from, `cities[length-1]` = end of their route. Middle cities = approximate delivery waypoints in travel order. | 1 | 10 |

**Order is load-bearing for all three roles.** The frontend exposes
`cities[0]` as "Plecare" and `cities[length-1]` as "Destinație" for every
role; analytics consumes the ordering identically.

---

## 6. `location` field

The location field is **optional** and reflects the user's choice. Three
possible shapes:

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
  country: string | null;     // ISO-3166-1 alpha-2
};

type Location = LocationGranted | LocationIp | null;
```

Resolution priority (frontend, see frontend spec §X):

1. If the user grants the browser geolocation prompt → store
   `{ source: "geolocation", lat, lon, accuracyMeters }`.
2. Else if the user **declines** the prompt or hits "ascunde locația mea" →
   store `null` and `locationConsent: "denied"`.
3. Else (prompt not shown / IP-only fallback opted in) → server-side
   resolves IP → city/country via the request headers
   (`x-forwarded-for` / `cf-ipcountry` if behind Cloudflare; otherwise via a
   lightweight server-side lookup). Stored as
   `{ source: "ip", city, country }`. The browser does NOT send IPs in the
   payload.

**Privacy invariants:**

- The browser never bypasses the geolocation API for precise coordinates.
- The IP fallback is computed by Next.js server code from headers; it is
  not derivable from the payload and is never logged elsewhere.
- The user can always submit with `location: null` — the field is optional.

---

## 7. `device` field

Captured at the route handler from request headers, **not** the client
payload (so a malicious client cannot lie about it without intent). Shape:

```ts
interface DeviceSignature {
  userAgent: string;            // raw User-Agent header (truncated to 512 chars)
  platform: string | null;      // e.g. "macOS", "Windows", "Android" — derived
  language: string | null;      // first Accept-Language entry
  viewport: { w: number; h: number } | null; // sent by client (nice-to-have, can lie)
  timezone: string | null;      // sent by client via Intl.DateTimeFormat
  dnt: boolean;                 // Do-Not-Track header present and "1"
}
```

The route handler builds `device` from headers and merges in the optional
`viewport` + `timezone` from the client payload before persisting. **No
canvas/audio fingerprinting; no hashed device IDs** — purely the descriptive
fields above. If `dnt === true`, we still store the signature (it is
diagnostic, not advertising) but do not propagate it to any analytics
pipeline.

**Backend validation (Strapi-level, defensive):**

- Type: JSON array of strings.
- Each string trimmed, ≤ 120 chars.
- Array length 1–10.

**Backend deliberately does not enforce** "min 2 for senders/receivers" — that
rule lives on the frontend where the UI can give a targeted message. The
backend stays permissive so a partial-but-mostly-good submission isn't
discarded over a server-side enum mismatch. Frontend validation is in
`design/spec-waitlist-frontend.md` §4.

---

## 6. API endpoints

### 6.1 Public — Next.js route handler

```
POST /api/waitlist
Content-Type: application/json
Body: WaitlistPayload (see §6.3)

Responses:
  201 { ok: true }                          — created
  400 { error: "<first Zod issue message>" } — Zod validation failed
  502 { error: "<message>" }                — Strapi rejected or unreachable
```

The handler:

1. Parses JSON body — 400 on invalid JSON.
2. `waitlistSchema.safeParse(json)` — 400 on validation failure, surfacing the
   first issue's message.
3. `submitWaitlist(parsed.data)` — wraps Strapi POST.
4. Returns 201 on success, 502 with the error message otherwise.

### 6.2 Internal — Strapi

```
POST {STRAPI_URL}/api/waitlist-submissions
Authorization: Bearer {STRAPI_API_TOKEN}
Content-Type: application/json
Body: { data: WaitlistPayload }
```

A 401/403 from Strapi is mapped to a clear server log pointing at the runbook
(`design/strapi-runbook.md` §4 — token permissions). The browser sees a
generic 502.

### 6.3 Payload contract

```ts
// shared between frontend Zod schema and the Strapi `data` envelope
interface WaitlistPayload {
  name: string;          // trimmed, non-empty
  email: string;         // lowercased + trimmed, valid email
  whatsapp?: string;     // optional; trimmed; absent if blank
  role: "expeditor" | "transportator" | "destinatar";
  cities: string[];      // length 1..10, each trimmed and non-empty
  source?: "landing" | "qr_event" | "referral" | "other";  // optional; defaults to `landing`

  // Consent (required)
  gdprConsent: true;                  // must be exactly true; payload rejected otherwise
  gdprConsentAt: string;              // ISO timestamp set when the box was ticked
  gdprConsentVersion: string;         // e.g. "2026-04-27"

  // Optional analytics / signature
  location?: Location | null;         // see §6
  locationConsent?: "granted" | "denied" | "not_asked";  // default "not_asked"
  utm?: UtmCapture | null;            // see §8
  // device is server-built, not sent verbatim — but the client may include
  // viewport + timezone hints which the server merges:
  client?: { viewport?: { w: number; h: number }; timezone?: string };
}

interface UtmCapture {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;        // Google Ads click ID
  fbclid?: string;       // Meta click ID
  referrer?: string;     // document.referrer at first paint
}
```

The route handler:

- defaults `source` to `landing`,
- defaults `locationConsent` to `not_asked`,
- builds the persisted `device` from request headers + `client` hints,
- **rejects with 400** any payload where `gdprConsent !== true`.

---

## 7. Migration / deprecation timeline

One-shot deploy with a one-release deprecation window for `routes` and
`ambele`.

| Step | Owner | When |
|---|---|---|
| 1. Add `cities` field, add `destinatar` enum value, mark `routes` optional, add `source` enum field. | Strapi admin | Before frontend release. |
| 2. Frontend v2 ships. Stops writing `routes`. Stops emitting `ambele`. Writes `cities` and `source`. | Frontend | Release day. |
| 3. Monitor 1 release cycle (~2 weeks). Confirm no new submissions arrive with `routes` populated and `cities` empty. | Backend | T+2 weeks. |
| 4. Export the historical `routes` strings as CSV (admin → bulk export). Then remove `routes` field from the content type and remove `ambele` from the role enum. | Backend | T+2 weeks. |

**No automatic backfill** of `routes → cities`. The free-text strings are too
inconsistent to parse safely. The CSV export is the historical record.

---

## 8. UTM capture

The frontend captures these query parameters from the **landing URL on first
paint** (not the form-submit URL — they may have been stripped by client-side
navigation):

`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`,
`gclid`, `fbclid`. It also captures `document.referrer` once.

Persistence strategy:

- On first landing-page mount, write the captured values to
  `sessionStorage["hulubul:utm"]`.
- On form submit, read from sessionStorage and include as `utm` in the
  payload.
- Only non-empty entries are sent. If sessionStorage is empty (or the user
  navigated in directly), `utm` is omitted entirely.

Empty `utm` is stored as `null` in Strapi.

---

## 9. Coordination with the survey epic

`design/epic-survey/post-waitlist.md` (status: spec only) currently uses
`Role = z.enum(["expeditor", "transportator", "ambele"])`. When the survey is
implemented, its enum must be updated to match this spec
(`expeditor | transportator | destinatar`). The survey backend collection
(`survey-response`) is separate and is touched at survey-implementation time,
not now.

A one-line cross-reference note will be added to `post-waitlist.md` pointing
here.

---

## 10. Strapi admin steps (for the backend operator)

Run on Strapi Cloud (`design/strapi-runbook.md` §3):

1. **Content-Type Builder → Waitlist submission**
   - Add `cities` (JSON, optional). Description: *"Ordered city array. For all roles: index 0 = origin (departure), last = destination (arrival). Middle indices = waypoints in travel order."*
   - Add `source` (enum: `landing`, `qr_event`, `referral`, `other`). Default `landing`. Description: *"Channel that produced this submission."*
   - Add `location` (JSON, optional). Description: *"Approximate filler location. See spec §6."*
   - Add `locationConsent` (enum: `granted`, `denied`, `not_asked`). Default `not_asked`.
   - Add `device` (JSON, optional). Description: *"Browser/device descriptive signature. See spec §7."*
   - Add `gdprConsent` (boolean, **required**). Default false. Description: *"Must be true to be a valid submission."*
   - Add `gdprConsentAt` (datetime, **required**).
   - Add `gdprConsentVersion` (string, **required**, max 64). Description: *"Versioned identifier of the consent text shown to the user (e.g. '2026-04-27')."*
   - Add `utm` (JSON, optional). Description: *"Captured UTM/click parameters. See spec §8."*
   - Edit `role` enum: add `destinatar`. Keep `ambele` for now (deprecated, removed in step 4 of §7).
   - Edit `routes`: required = false. Description: *"Deprecated 2026-04-27 — see design/spec-waitlist-backend.md §7."*
   - Save & publish.
2. **Settings → API Tokens → STRAPI_API_TOKEN**
   - Verify `create` on `waitlist-submission`. Token permissions are
     per-collection; existing tokens cover the new fields automatically.
3. **Settings → Roles → Public**
   - Confirm: `find` and `create` on `waitlist-submission` remain **off**.
4. **Smoke test** — POST a sample payload through `/api/waitlist` from a
   staging build; confirm a row appears with `cities` populated and `routes`
   null.

---

## 11. Error model

| Cause | Status from Next | Body | Frontend behaviour |
|---|---|---|---|
| Malformed JSON body | 400 | `{ error: "Invalid JSON body" }` | Inline error in the form. |
| `gdprConsent !== true` | 400 | `{ error: "Trebuie să accepți politica de confidențialitate." }` | Inline error on the consent checkbox. |
| Zod validation fails | 400 | `{ error: "<first Zod issue>" }` | Inline error referencing the field. |
| Strapi 401/403 | 502 | `{ error: "Strapi refused …" }` | Generic "încearcă din nou" toast; server log carries the runbook pointer. |
| Strapi 4xx other than auth | 502 | `{ error: "Strapi /api/waitlist-submissions failed: <code>" }` | Generic toast. |
| Network/Strapi unreachable | 502 | `{ error: "<fetch error message>" }` | Generic toast. |
| Success | 201 | `{ ok: true }` | Form shows success state with survey CTA. |

The Next handler **never** leaks Strapi raw response bodies to the browser.

---

## 12. Privacy & retention

Stored fields and their sensitivity:

| Field | Sensitivity | Notes |
|---|---|---|
| `name`, `email`, `whatsapp` | PII | Subject of GDPR consent. |
| `role`, `cities`, `source` | Behavioural | Not PII on its own. |
| `location` (geolocation variant) | Sensitive — precise coords | Only stored if `locationConsent === "granted"`. |
| `location` (ip variant) | Coarse — city-level | Stored when consent is `not_asked` *and* the user did not opt out. |
| `device` | Diagnostic | UA + headers; no fingerprint hash. |
| `utm` | Marketing attribution | Truncated at 256 chars per field. |
| `gdprConsent*` | Legal record | Immutable after write. |

Operating rules:

- The CMS `privacyNote` next to the submit button is the user-facing
  framing; the legal record is the `gdprConsent` trio.
- The consent text version (`gdprConsentVersion`) is bumped whenever the
  privacy note changes materially. Old submissions keep their old version
  string — never rewritten.
- Retention: until launch + 12 months. Submissions whose `email` has not
  become a logged-in user are exported and deleted. Future ops procedure;
  not enforced by Strapi today.
- Subject Access / Delete: handled manually via Strapi admin until a
  SAR/DSR flow exists.
- `dnt: true` submissions: still stored (we are the data controller, and
  storage serves the explicit consented purpose) but excluded from any
  third-party analytics export.

---

## 13. Acceptance criteria

- [ ] Strapi `waitlist-submission` has `cities` (JSON, optional), `source`
      (enum, default `landing`), `location` (JSON, optional),
      `locationConsent` (enum, default `not_asked`), `device` (JSON, optional),
      `gdprConsent` (boolean, required), `gdprConsentAt` (datetime, required),
      `gdprConsentVersion` (string, required), `utm` (JSON, optional). Role
      enum includes `destinatar`.
- [ ] `routes` is marked optional and described as deprecated.
- [ ] Existing rows are unchanged; admin UI displays them without errors.
- [ ] POSTs without `gdprConsent: true` are rejected with 400 and a clear
      RO error message.
- [ ] `STRAPI_API_TOKEN` has `create` on `waitlist-submission`.
- [ ] Public role has neither `find` nor `create`.
- [ ] POST through `/api/waitlist` with the new payload returns 201 and
      creates a row with `cities` populated, `routes` null, `source = landing`.
- [ ] POST with old shape (`routes` only) succeeds at the **Strapi** layer
      during the deprecation window (it's optional both sides), but the
      **Next.js route handler** rejects it with 400 because frontend Zod
      requires `cities` (see frontend spec §4).
- [ ] After T+2 weeks: `routes` removed; `ambele` removed from enum;
      historical CSV archived.

---

## 14. Out of scope

- Migrating historical free-text `routes` to structured `cities`.
- Per-field token permissions (Strapi token model is per-collection).
- Server-side geocoding of submitted cities (canonical lat/lon lives in the
  routes domain).
- A "secondary role" field for people who genuinely both send and transport.
- Linking waitlist submissions to the `route` collection.
- Webhooks / lifecycle hooks for hot-lead alerting.
- Subject Access / Delete request UI.

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Strapi enum change breaks rows with `ambele`. | Value remains legal until §7 step 4. |
| `cities: json` is awkward to filter in the Strapi admin. | Acceptable — admin only reads. Filtering lives in downstream analytics. |
| Frontend posts an old shape after a partial deploy. | `routes` and `cities` are both optional at the Strapi layer; either shape lands. The Next handler enforces the new shape. |
| Token rotation forgets the new fields. | Token permissions are per-collection, not per-field — rotation is unaffected. |
| Public role accidentally re-enabled. | Acceptance criterion §12 explicitly checks; `design/strapi-runbook.md` §4 documents the recovery. |
