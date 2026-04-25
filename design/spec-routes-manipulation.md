# Routes Management — Feature Spec

> Date: 2026-04-25 (revised)
> Scope: Two deliverables —
> 1. **Admin page** `/admin/rute` — CRUD for routes with city-autocomplete input, map
>    visualisation, side-panel details, and multi-dimensional filter panel
> 2. **Public page** `/rute` — read-only approved-routes map + filterable list
>
> Backend: Strapi 5 at `NEXT_PUBLIC_STRAPI_URL`. Collections: `route`, `route-schedule`,
> `transporter`, `transport-type`. No auth wiring in this phase — page is accessible to all.

---

## 1. Goal

Give an admin a single page to manage transport routes end-to-end:

- See all routes in a filterable list and on a map simultaneously.
- **Add a new route** by composing an ordered city list using a tag-input with
  real-time Photon autocomplete per city; geocoding to GeoJSON happens automatically
  on the backend after save.
- Edit any route field, including manually correcting `geoJson` when geocoding fails.
- Delete a route.
- **Filter** the list and map by: status, transporter, city name, schedule frequency,
  and departure days — all filters are additive (AND logic), client-side.
- Click a route (list row or map polyline) to open a side panel showing full details
  and all associated transporter schedules.

Separately, expose a `/rute` public page with the same filterable read-only view.

**Definition of Done:**

- Admin can add, edit, and delete routes with city autocomplete, without using Strapi UI.
- All routes with valid `geoJson` appear as polylines on the map.
- All filter combinations update the list and map in real time.
- Clicking a route shows its details and all associated schedules in the side panel.
- Public `/rute` page renders all approved routes on a map with the same filter panel.
- Gherkin scenarios pass in CI against MSW and fetch mocks.

---

## 2. Stack additions

| Concern | Choice | Why |
|---|---|---|
| Map rendering | `leaflet` + `react-leaflet` | Open-source, no API key, OSM tiles match Photon geocoding |
| Map types | `@types/leaflet` | TypeScript support |
| Tile provider | OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) | Free, no key |
| City autocomplete | Custom `CityTagInput` → proxied Photon API | No external component dep; allows provider swap via env var |
| GeoJSON manual edit | plain `<textarea>` with JSON format hint | No extra dep; admin use only |

`react-leaflet` components are Client Components (they need `window`).
Use `dynamic(import('./RoutesMap'), { ssr: false })` from the parent Server Component.

---

## 3. URL & page structure

```
app/
  admin/
    rute/
      page.tsx            Server Component shell — fetches initial data
      RoutesAdmin.tsx     Client Component — split-panel layout + state
  rute/
    page.tsx              Server Component — fetches approved routes
  api/
    geocode-suggest/
      route.ts            GET proxy → GEO_SERVICE_URL/api?q=<term>&limit=5

components/
  routes/
    CityTagInput.tsx      Tag-style ordered city input with per-city Photon autocomplete
    RoutesFilter.tsx      Filter panel: status pills + transporter / city / frequency / days
    RoutesList.tsx        Filterable table of routes
    RouteFormDrawer.tsx   Slide-in drawer — create & edit form
    RoutesMap.tsx         Leaflet map with polylines (shared admin + public)
    RouteDetailPanel.tsx  Side panel — route fields + schedule list
    RouteStatusBadge.tsx  Coloured pill for draft / approved / suspended

lib/
  routes-schema.ts        Zod: RoutePayload, GeocodeSuggestion, RouteFilter
  routes-api.ts           Strapi helpers: getRoutes, getRoute, createRoute,
                          updateRoute, deleteRoute, getSchedulesForRoute,
                          getTransporters, getTransportTypes
  routes-filter.ts        Pure filter functions operating on Route[] — no I/O

tests/
  features/
    routes-admin.feature
    routes-map-view.feature
    routes-public.feature
  lib/
    routes-schema.test.ts
    routes-api.test.ts
    routes-filter.test.ts
  components/
    CityTagInput.test.tsx
    RoutesFilter.test.tsx
    RoutesList.test.tsx
    RouteFormDrawer.test.tsx
    RouteDetailPanel.test.tsx
  api/
    geocode-suggest.test.ts
```

---

## 4. Data contracts

### 4.1 Route (from `api::route.route`)

```ts
interface Route {
  id: number;
  documentId: string;
  name: string;                        // required; e.g. "Luxembourg → Chișinău"
  citiesText: string;                  // required; comma-separated ordered city names
                                       // first = origin, last = destination
  geoJson: GeoJsonLineString | null;   // auto-computed on backend save; may be null
  status: "draft" | "approved" | "suspended";
  submittedBy: string | null;
  claimedBy: string | null;
  schedules?: RouteSchedule[];         // populated on demand
}

interface GeoJsonLineString {
  type: "LineString";
  coordinates: [number, number][];     // [lon, lat] — Leaflet needs [lat, lon] swap
}
```

### 4.2 Transporter (from `api::transporter.transporter`)

```ts
interface Transporter {
  id: number;
  documentId: string;
  name: string;
  type: "individual" | "company";
  phoneNumbers: string[];              // e.g. ["+352621123456"]
  transportTypes: TransportType[];     // populated relation
  notes: string | null;
  status: "draft" | "approved" | "suspended";
  submittedBy: string | null;
  claimedBy: string | null;
}
```

### 4.3 TransportType (from `api::transport-type.transport-type`)

```ts
interface TransportType {
  id: number;
  documentId: string;
  label: string;                       // e.g. "Colete & pachete"
  slug: string;                        // e.g. "colete-pachete"
  description: string | null;
}
```

### 4.4 RouteSchedule (from `api::route-schedule.route-schedule`)

```ts
interface RouteSchedule {
  id: number;
  documentId: string;
  transporter: Transporter;            // populated relation
  route: Route;                        // populated relation
  frequency: "weekly" | "biweekly" | "monthly" | "on_demand";
  departureDays: DayCode[];            // e.g. ["wed", "fri"]
  arrivalDays: DayCode[];
  notes: string | null;
  status: "draft" | "approved" | "suspended";
}

type DayCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
```

### 4.5 Geocode suggestion (from `/api/geocode-suggest`)

```ts
interface GeocodeSuggestion {
  name: string;       // city name — written to citiesText
  country: string;    // shown in dropdown to disambiguate (e.g. "FR" vs "BE")
  lat: number;
  lon: number;
}
```

The route handler maps Photon's GeoJSON feature array to this shape:
```ts
// Photon feature.properties: { name, country, ... }
// Photon feature.geometry.coordinates: [lon, lat]
```

### 4.6 RouteFilter state

```ts
interface RouteFilter {
  status: "all" | "approved" | "draft" | "suspended";
  transporterIds: number[];           // empty = no filter
  cityQuery: string;                  // substring match against citiesText
  frequencies: Frequency[];           // empty = no filter
  departureDays: DayCode[];           // empty = no filter
}
```

Filter logic (all conditions must pass — AND):
- `status` — exact match on `route.status`, or "all"
- `transporterIds` — `route.schedules` must contain at least one schedule whose `transporter.id` is in the set
- `cityQuery` — `route.citiesText.toLowerCase().includes(query.toLowerCase())`
- `frequencies` — at least one schedule has `frequency` in the set
- `departureDays` — at least one schedule has at least one day in the set

### 4.7 API endpoints

```
# Strapi collections
GET    /api/routes?populate[schedules][populate][transporter][populate]=transportTypes
GET    /api/routes/:id?populate=...
POST   /api/routes           body: { data: RoutePayload }
PUT    /api/routes/:id       body: { data: RoutePayload }
DELETE /api/routes/:id

GET    /api/transporters?populate=transportTypes
GET    /api/transport-types

GET    /api/route-schedules?filters[route][id][$eq]=:id
       &populate[transporter][populate]=transportTypes

# Geocode proxy (Next.js route handler)
GET    /api/geocode-suggest?q=<term>&limit=5
```

### 4.8 Zod payload schemas

```ts
const routePayloadSchema = z.object({
  name: z.string().min(1),
  citiesText: z.string().min(1),       // comma-joined city names from CityTagInput
  geoJson: z.any().nullable().optional(),
  status: z.enum(["draft", "approved", "suspended"]).default("approved"),
  submittedBy: z.string().email().nullable().optional(),
  claimedBy: z.string().email().nullable().optional(),
});

const geocodeSuggestionSchema = z.object({
  name: z.string(),
  country: z.string(),
  lat: z.number(),
  lon: z.number(),
});
```

---

## 5. Admin page layout

```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Administrare rute"          [+ Adaugă rută]        │
├─────────────────────────┬────────────────────────────────────┤
│  LEFT PANEL (40%)       │  RIGHT PANEL (60%)                 │
│                         │                                    │
│  RoutesFilter:          │  Leaflet map — polylines           │
│  Status pills           │  colour-coded by status:           │
│  [Toate][Aprobate]      │    approved → #22c55e (green)      │
│  [Ciornă][Suspendate]   │    draft    → #f59e0b (amber)      │
│                         │    suspended → #ef4444 (red)       │
│  [Transportator ▾]      │                                    │
│  [Oraș__________]       │  Filtered polylines update as      │
│  [Frecvență ▾]          │  filter changes. Routes that       │
│  [Zile plecare ▾]       │  don't match are hidden, not       │
│                         │  greyed, to reduce clutter.        │
│  RoutesList:            │                                    │
│  Name | Cities | Status │                                    │
│  ──── | ────── | ────── │                                    │
│  Lux→Chi | ... | ●      │                                    │
│  ...                    │                                    │
│  [Edit] [Delete]        │                                    │
│                         │                                    │
│  ── on route select ──  │                                    │
│  RouteDetailPanel       │                                    │
│  (replaces list on      │                                    │
│  desktop; appends below │                                    │
│  on mobile)             │                                    │
└─────────────────────────┴────────────────────────────────────┘
```

**Selection sync:** clicking a list row or map polyline sets `selectedRouteId` in
`RoutesAdmin.tsx`. Map highlights the polyline; list highlights the row.

**Filter → map sync:** only routes that pass the current `RouteFilter` are passed as
props to `<RoutesMap routes={filteredRoutes} />`. Unmatched routes simply disappear
from the map — no greyed-out polylines.

---

## 6. CityTagInput component

### Purpose

Replaces the plain `citiesText` text input. Provides an ordered, tag-style city list
with per-city Photon autocomplete. The first tag is visually marked as the **origin**,
the last tag as the **destination**.

### Behaviour

```
[Luxembourg ×][Metz ×][Lyon ×][____________]
                                ↑ active text input
```

1. The component renders existing cities as ordered chips (pill tags with × to remove).
2. A plain text `<input>` at the end accepts the next city name.
3. As the user types ≥ 2 characters, after a 300 ms debounce the component calls
   `GET /api/geocode-suggest?q=<inputValue>&limit=5`.
4. A dropdown appears below the input listing up to 5 suggestions as `{name}, {country}`.
5. The user clicks a suggestion (or presses `ArrowDown` + `Enter`) → city name appended
   as a new chip; input clears.
6. Pressing `Escape` or clicking outside closes the dropdown without adding a city.
7. Pressing `Backspace` on an empty input removes the last chip.
8. The value exposed to the form is `citiesText: chips.join(", ")`.

### Origin / destination markers

- First chip: labelled "Plecare" (small badge above or beside chip).
- Last chip: labelled "Destinație".
- Middle chips: no badge.
- When there is only one chip it is labelled "Plecare".

### Autocomplete proxy route — `app/api/geocode-suggest/route.ts`

```ts
// GET /api/geocode-suggest?q=<term>&limit=<n>
// Proxies to process.env.GEO_SERVICE_URL (defaults to https://photon.komoot.io)
// Returns: GeocodeSuggestion[]
// Errors: 400 if q is missing or empty; 502 on upstream failure
```

This keeps `GEO_SERVICE_URL` and optional `GEO_SERVICE_TOKEN` server-side.
The client only ever talks to `/api/geocode-suggest`.

### Props

```tsx
interface CityTagInputProps {
  value: string[];              // ordered city name array (controlled)
  onChange: (cities: string[]) => void;
  placeholder?: string;         // e.g. "Adaugă un oraș…"
  disabled?: boolean;
}
```

The parent form converts `value: string[]` ↔ `citiesText: string` (join/split on `", "`).

---

## 7. RoutesFilter component

### Filter controls

| Control | Type | Filters on |
|---|---|---|
| Status | Pills: Toate / Aprobate / Ciornă / Suspendate | `route.status` |
| Transportator | Multi-select dropdown (populated from `getTransporters()`) | `route.schedules[].transporter.id` |
| Oraș | Text input (substring match) | `route.citiesText` |
| Frecvență | Checkbox group: Săptămânal / La 2 săptămâni / Lunar / La cerere | `route.schedules[].frequency` |
| Zile plecare | Checkbox group: Lu Ma Mi Jo Vi Sâ Du | `route.schedules[].departureDays` |

### Behaviour

- All filters default to "no constraint" (show everything).
- Changing any filter immediately updates the route list and the map (no "Apply" button).
- A "Resetează filtrele" link appears when any filter is non-default; click resets all.
- The active filter count is shown next to the "Resetează" link: "3 filtre active".
- On mobile the filter panel collapses into a "Filtre (3)" toggle button.

### Filter composition (pure function in `lib/routes-filter.ts`)

```ts
function filterRoutes(routes: Route[], filter: RouteFilter): Route[]
```

All conditions AND:
1. `filter.status !== "all"` → `route.status === filter.status`
2. `filter.transporterIds.length > 0` → `route.schedules?.some(s => filter.transporterIds.includes(s.transporter.id))`
3. `filter.cityQuery.length > 0` → `route.citiesText.toLowerCase().includes(filter.cityQuery.toLowerCase())`
4. `filter.frequencies.length > 0` → `route.schedules?.some(s => filter.frequencies.includes(s.frequency))`
5. `filter.departureDays.length > 0` → `route.schedules?.some(s => s.departureDays.some(d => filter.departureDays.includes(d)))`

This pure function is unit-tested in `tests/lib/routes-filter.test.ts` independent of
any UI component.

---

## 8. RouteFormDrawer (create / edit)

Slide-in drawer from the right, triggered by "+ Adaugă rută" or row "Edit" button.

| Field | Input | Validation |
|---|---|---|
| `name` | text input | required |
| `cities` | `<CityTagInput>` → serialised as `citiesText` | required; ≥ 2 cities |
| `status` | select | required; options: draft / approved / suspended |
| `submittedBy` | email input | optional |
| `claimedBy` | email input | optional |
| `geoJson` | collapsible `<textarea>` | optional; pre-filled after save; JSON format hint |

**Geocoding feedback:**

- On submit the drawer shows "Se calculează coordonatele…" while the save + re-fetch complete.
- After re-fetch: if `geoJson` is null, show warning banner: "Geocodificarea a eșuat.
  Poți introduce coordonatele manual în câmpul GeoJSON."
- Admin can paste a corrected `LineString` GeoJSON and save again.

**Delete confirmation** (on list row, not in drawer):

- Inline confirmation: "Ștergi ruta {name}? [Anulează] [Șterge]"
- On confirm: DELETE → optimistic removal from list and map.

---

## 9. RouteDetailPanel

Appears on route selection. Replaces list on desktop; appends below list on mobile.
Dismissed via ✕ button or by selecting another route.

### Route fields

| Label | Field |
|---|---|
| Denumire | `name` |
| Orase | `citiesText` split on `,` — rendered as ordered chip list; first chip = "Plecare", last = "Destinație" |
| Status | `<RouteStatusBadge>` |
| Creat de | `submittedBy` (omitted if null) |
| Gestionat de | `claimedBy` (omitted if null) |

### Schedules section

Each `RouteSchedule` card:

| Label | Field |
|---|---|
| Transportator | `transporter.name` + type badge (individual / company) |
| Telefoane | `transporter.phoneNumbers` — each a `tel:` link |
| Tipuri transport | `transporter.transportTypes[].label` chips |
| Frecvență | frequency localised (weekly→Săptămânal, biweekly→La 2 săptămâni, monthly→Lunar, on_demand→La cerere) |
| Zile plecare | `departureDays` — localised day names |
| Zile sosire | `arrivalDays` — localised day names |
| Note | `notes` (omitted if null) |
| Status | schedule `status` badge |

No schedules → "Nicio cursă programată pentru această rută."

---

## 10. RoutesMap component (shared)

```tsx
interface RoutesMapProps {
  routes: Route[];                        // only routes passing current filter
  selectedRouteId?: number | null;
  onRouteSelect?: (id: number) => void;
  interactive?: boolean;                  // false on public page
  height?: string;                        // default "500px"
}
```

- Centre: lat 47, lon 15, zoom 5.
- Each route with `geoJson !== null` → `<Polyline>` coloured by status.
- Polyline weight: 4 normal, 6 when selected.
- Tooltip on hover: `{route.name}`.
- `interactive=true`: clicking fires `onRouteSelect(route.id)`.
- `geoJson: null` routes: absent from map; list shows "⚠ fără coordonate".
- Client Component: `dynamic(import('./RoutesMap'), { ssr: false })`.
- Attribution: `© OpenStreetMap contributors`.

**Coordinate conversion:** GeoJSON `[lon, lat]` → Leaflet `[lat, lon]` performed inside the component for every coordinate pair.

---

## 11. Public page `/rute`

Server Component fetches all routes with `status=approved` (with schedules + transporter
populate). Passes all approved routes to the client layout which holds local `RouteFilter`
state — same `filterRoutes()` function as admin page.

Layout:
```
Full-width <RoutesMap interactive={true} height="400px" />
<RoutesFilter /> — same component, status pill fixed to "Aprobate" and hidden
<RoutesList readonly />  — no Edit/Delete buttons
[Route selected] → <RouteDetailPanel readonly />
```

No admin controls visible. Transporter filter, city filter, frequency filter, and day
filter all work identically to the admin page.

---

## 12. API helper layer (`lib/routes-api.ts`)

```ts
getRoutes(filters?: { status?: string }): Promise<Route[]>
getRoute(id: number, populate?: boolean): Promise<Route>
createRoute(payload: RoutePayload): Promise<Route>
updateRoute(id: number, payload: Partial<RoutePayload>): Promise<Route>
deleteRoute(id: number): Promise<void>
getSchedulesForRoute(routeId: number): Promise<RouteSchedule[]>
getTransporters(): Promise<Transporter[]>
getTransportTypes(): Promise<TransportType[]>
```

Mutations go through Next.js **Server Actions** so `STRAPI_API_TOKEN` never leaks to
the browser. Read helpers are used in Server Components (initial data) and in client
state refresh after mutations.

The geocode proxy (`/api/geocode-suggest`) is a regular Next.js route handler that reads
`GEO_SERVICE_URL` and `GEO_SERVICE_TOKEN` server-side.

---

## 13. Error & empty states

| Situation | Behaviour |
|---|---|
| No routes match current filter | "Nicio rută corespunde filtrelor selectate. [Resetează filtrele]" |
| No routes in Strapi at all | "Nicio rută adăugată încă. [+ Adaugă rută]" |
| Route has `geoJson: null` | List: ⚠ badge; map: no polyline; detail panel: info banner |
| Geocoding fails on save | Warning toast + warning banner in drawer |
| Autocomplete fetch fails | Dropdown shows "Nu s-au găsit sugestii" — user can still type city manually |
| Network error on save | Toast error; drawer stays open with data intact |
| Delete fails | Toast error; route stays in list |
| Strapi 401/403 | "Acces refuzat — verifică token-ul API" |

---

## 14. TDD sequencing

1. `routes-schema.test.ts` → `routes-schema.ts`
2. `routes-filter.test.ts` → `routes-filter.ts` (pure filter logic — no UI, no I/O)
3. `routes-api.test.ts` (MSW) → `routes-api.ts`
4. `geocode-suggest.test.ts` (MSW mock of Photon) → `/api/geocode-suggest/route.ts`
5. `CityTagInput.test.tsx` → `CityTagInput.tsx` (autocomplete flow + chip management)
6. `RoutesFilter.test.tsx` → `RoutesFilter.tsx`
7. `RoutesList.test.tsx` → `RoutesList.tsx`
8. `RouteFormDrawer.test.tsx` → `RouteFormDrawer.tsx`
9. `RouteDetailPanel.test.tsx` → `RouteDetailPanel.tsx`
10. `RoutesMap` — smoke test only (Leaflet needs canvas mock)
11. Compose `RoutesAdmin.tsx` + `app/admin/rute/page.tsx`
12. Compose `app/rute/page.tsx`

---

## 15. Out of scope

- Authentication / role-based access control.
- CRUD for `transporter`, `route-schedule`, `transport-type` (separate epics).
- Polyline road-network routing (straight LineString between centroids only).
- Drag-and-drop city reordering within `CityTagInput`.
- Server-side filtering via Strapi query params (add when route count > 50).
- Saved filter presets.
- Pagination of routes list.
