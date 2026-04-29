# Data Analysis: Transporter Registry vs. Current Schema
**Source file:** `design/hulubul_registru_transportatori_ro.xlsx`  
**Schema files:** `lib/routes-types.ts`, `lib/routes-schema.ts`  
**Date:** 2026-04-29

---

## 1. What the Excel Contains

The workbook has two relevant sheets:

| Sheet | Rows | Status |
|---|---|---|
| `Registru Transportatori v1` | 7 real entries (TR-001 → TR-007) | First-pass GPT extraction from Facebook screenshots; **all unvalidated** |
| `Regsitru Transp. V2` | Empty | Placeholder only |
| `Ghid utilizare` | Usage guide | Metadata only |

### Excel Columns (v1 sheet)

| # | Column name | Example value |
|---|---|---|
| 1 | ID | TR-001 |
| 2 | Transportator / Brand | "373 Fratelli Tour" |
| 3 | Rută / Coridor | "Moldova–Italia" |
| 4 | Direcție | "Moldova → Italia; Italia → Moldova" |
| 5 | Țări | "Moldova; Italia" |
| 6 | Orașe / regiuni acoperite | long free-text list of cities |
| 7 | Puncte colectare / oficii Moldova | address, hours, phone per office |
| 8 | Program / Frecvență | "Plecare din Moldova: miercuri, 06:00" |
| 9 | Servicii / Capabilități | "Transport pasageri; transport colete; livrare la domiciliu" |
| 10 | Numere de telefon | "+373 69 407 204; +373 60 090 501; ..." |
| 11 | WhatsApp / Viber | which numbers support which apps |
| 12 | Tip sursă | "Postare grup Facebook + imagine flyer" |
| 13 | Nivel de încredere în date | "Mediu" / "Scăzut/Mediu" |
| 14 | Status validare | "Nevalidat" / "Extras parțial" |
| 15 | Note / Probleme de extracție | extraction quality notes (GPT artefacts) |
| 16 | Extras de | "GPT din screenshot-uri furnizate de utilizator" |
| 17 | Data extragerii | "2026-04-24" |
| 18 | Ultima verificare | (empty for all 7 records) |
| 19 | Posibil duplicat | "Posibil coridor duplicat cu TR-002" |

---

## 2. Current Schema

### `Transporter` (in `lib/routes-types.ts`)

```ts
interface Transporter {
  id: number;
  documentId: string;
  name: string;
  type: "individual" | "company";
  phoneNumbers: string[];
  transportTypes: TransportType[];  // { id, documentId, label, slug, description }
  notes: string | null;
  status: "draft" | "approved" | "suspended";
  submittedBy: string | null;
  claimedBy: string | null;
}
```

### `Route` + `RouteSchedule`

```ts
interface Route {
  id: number; documentId: string;
  name: string;
  citiesText: string;        // free text, unstructured
  geoJson: GeoJsonLineString | null;
  status: "draft" | "approved" | "suspended";
  submittedBy: string | null; claimedBy: string | null;
  schedules?: RouteSchedule[];
}

interface RouteSchedule {
  transporter: Transporter;
  frequency: "weekly" | "biweekly" | "monthly" | "on_demand";
  departureDays: DayCode[];  // mon..sun
  arrivalDays: DayCode[];
  notes: string | null;
  status: RouteStatus;
}
```

---

## 3. What Can Already Be Loaded

These Excel columns map cleanly to existing schema fields with minimal transformation:

| Excel column | → Schema field | Notes |
|---|---|---|
| Col 2 – Brand/Name | `Transporter.name` | Direct load |
| Col 10 – Phone numbers | `Transporter.phoneNumbers[]` | Split on `;`, strip whitespace |
| Col 9 – Services | `TransportType` lookup | "transport pasageri" → pasageri; "transport colete" → colete; needs a pre-seeded lookup table |
| Col 3 – Rută / Coridor | `Route.name` | Direct load |
| Col 6 – Cities covered | `Route.citiesText` | Direct load (already free text) |
| Col 8 – Frequency (partial) | `RouteSchedule.frequency` | "Săptămânal" → `weekly`; "zilnic" → needs new value (see §4) |
| Col 8 – Departure days (partial) | `RouteSchedule.departureDays` | "miercuri" → `["wed"]`; requires NLP parsing |
| Col 14 – Validation status | `Transporter.status` | "Nevalidat" → `draft`; "Extras parțial" → `draft`; "Confirmat" → `approved` |

**Loadable records right now (all 7, as drafts):** TR-001 through TR-007 can be inserted as `status: "draft"` Transporter + Route pairs using only `name`, `phoneNumbers`, `Route.name`, `Route.citiesText`, and `RouteSchedule.notes` for the raw schedule text.

---

## 4. What Is Missing from the Schema

The following Excel data has nowhere to go in the current schema. These are gaps that reduce data fidelity.

### 4.1 Direction on routes — **HIGH priority**

Column 4 ("Direcție") carries critical routing information: one-way vs. bidirectional, and which end is origin.

**Missing:** `Route` has no direction field.

```ts
// Proposed addition to Route or RouteSchedule
direction: "origin_to_dest" | "dest_to_origin" | "bidirectional";
```

Without this, a Moldova→Italia route and an Italia→Moldova route look identical.

### 4.2 Countries list — **MEDIUM priority**

Column 5 ("Țări") lists which countries a route touches. This is critical for corridor-based filtering (e.g. "show all Moldova–UK routes").

**Missing:** `Route` only has `citiesText` (unstructured). There is no `countries` field.

```ts
// Proposed addition to Route
countries: string[];   // ISO-2 codes or plain names, e.g. ["MD", "IT"]
```

### 4.3 Structured contact channels — **HIGH priority**

Column 11 shows that phone numbers have different capabilities (WhatsApp, Viber, voice-only). `Transporter.phoneNumbers: string[]` flattens this into a plain list with no channel metadata.

**Missing:** channel annotation per number.

```ts
// Replace or augment phoneNumbers
contactChannels: {
  number: string;
  channels: ("phone" | "whatsapp" | "viber")[];
}[];
```

Users searching for WhatsApp-accessible transporters cannot filter today.

### 4.4 Collection offices / pickup points — **HIGH priority**

Column 7 carries structured office data: city, street address, opening hours, dedicated phone. This is a first-class feature for the app (users need to know where to drop parcels).

**Missing:** no office/location entity exists anywhere in the schema.

```ts
// Proposed new entity linked to Transporter
interface OfficeLocation {
  city: string;
  address: string | null;
  openingHours: string | null;  // free text for now, structured later
  phone: string | null;
}
// On Transporter:
officeLocations: OfficeLocation[];
```

### 4.5 Richer validation status — **MEDIUM priority**

The Ghid utilizare sheet defines 6 validation states: Nevalidat, Extras parțial, Contactat, Confirmat, Respins, Duplicat. The current `status: "draft"|"approved"|"suspended"` conflates lifecycle (approved/suspended) with validation workflow (contacted, confirmed, etc.).

**Missing:** separate `validationStatus` enum for the import workflow.

```ts
validationStatus: "unvalidated" | "partial_extract" | "contacted" | "confirmed" | "rejected" | "duplicate";
```

The existing `status` field should remain for operational lifecycle (draft → approved → suspended). These are two different axes.

### 4.6 Data confidence level — **LOW priority for end users, HIGH for ops**

Column 13 ("Nivel de încredere în date") enables operators to filter records by reliability before publishing.

**Missing:** no confidence field.

```ts
dataConfidence: "high" | "medium" | "low";
```

### 4.7 External / source ID — **MEDIUM priority**

Column 1 ("ID" = TR-001, TR-002…) is a stable reference used for deduplication notes (Column 19). Without storing this, cross-referencing during the validation workflow is impossible.

**Missing:** no external ID field on Transporter.

```ts
externalId: string | null;   // e.g. "TR-001"
```

### 4.8 Departure time — **MEDIUM priority**

Column 8 contains departure times (e.g. "Plecare din Moldova: miercuri, 06:00") that are not captured by `RouteSchedule.departureDays` (which only stores the day, not the time). Users want to know when the bus leaves.

**Missing:** `departureTime` and `arrivalTime` on `RouteSchedule`.

```ts
departureTime: string | null;  // "HH:mm", e.g. "06:00"
arrivalTime: string | null;
```

### 4.9 `frequency: "daily"` — **LOW priority**

TR-006 is listed as "zilnic" (daily). The current enum is `"weekly" | "biweekly" | "monthly" | "on_demand"`. Daily is missing.

```ts
type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "on_demand";
```

---

## 5. What Is Noise — Do Not Load

These columns should **not** be mapped to end-user-facing schema fields.

| Column | Why it's noise |
|---|---|
| Col 15 – "Note / Probleme de extracție" | GPT extraction artefacts — describe image quality, illegible text, ambiguities during screenshot parsing. These are **not** notes about the transporter. Do not put these in `Transporter.notes`. Keep in a separate internal `extractionNotes` field visible only to admins during validation. |
| Col 16 – "Extras de" | Always "GPT din screenshot-uri furnizate de utilizator" for all 7 records. Pipeline metadata only; discard after import. |
| Col 17 – "Data extragerii" | Import timestamp. Useful for the import pipeline audit log, not as a persistent schema field on the transporter. |
| Col 5 – "Țări" as raw string | Redundant with a proper `countries[]` field (§4.2). Once structured countries are stored, the semicolon-separated string is obsolete. |
| Col 8 – Raw schedule text | The raw free-text schedule (e.g. "Postarea menționează activitate joi–vineri–sâmbătă") should be parsed into `departureDays` + `departureTime`, then discarded or kept only as `RouteSchedule.notes` for human review. Do not treat it as structured data. |
| Col 18 – "Ultima verificare" | Empty for all 7 records. Add as a field (`lastVerifiedAt: Date | null`) only when a validation workflow is built. |
| Col 19 – "Posibil duplicat" | Useful during the import/validation phase only. Once duplicates are resolved (records merged or marked), this becomes stale. Do not persist as a permanent field. |

---

## 6. What Should Be Added for Max Usability

Summary of proposed schema additions, ranked by user-facing impact:

| Priority | Addition | User benefit |
|---|---|---|
| P1 | `contactChannels[]` with per-number WhatsApp/Viber flags | Users find transporters they can actually message |
| P1 | `officeLocations[]` on Transporter | Users know where to deliver/collect parcels |
| P1 | `direction` on Route | Correct filtering by direction (outbound/inbound/both) |
| P2 | `countries[]` on Route | Corridor-based search (Moldova–UK, Moldova–IT) |
| P2 | `departureTime` / `arrivalTime` on RouteSchedule | Users plan around actual departure times |
| P2 | `validationStatus` separate from `status` | Operators manage import workflow cleanly |
| P2 | `externalId` on Transporter | Stable reference for deduplication during validation |
| P3 | `dataConfidence` | Ops/admin visibility into record reliability |
| P3 | `frequency: "daily"` added to enum | Covers TR-006 and future daily routes |

---

## 7. Suggested Load Plan for the 7 Records

Given the current schema, here is what can be loaded today vs. what needs schema work first:

**Load today (as drafts, no schema changes):**
- `Transporter`: name, phoneNumbers[], status="draft", type="company" (default until confirmed), notes=null
- `Route`: name (from corridor column), citiesText (from cities column), status="draft"
- `RouteSchedule`: frequency=best guess from text, departureDays parsed manually, notes=raw schedule text

**Needs schema extension first:**
- direction, countries[], contactChannels[], officeLocations[], departureTime, validationStatus, externalId

**Do not load yet:**
- Col 15 extraction notes → keep in a spreadsheet or admin-only field
- Col 19 duplicates → resolve TR-004/006/007 and TR-002/005 before loading
