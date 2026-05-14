# SEO + Tracking + Consent — implementation plan

**Date:** 2026-05-14
**Companion specs:**
- `2026-05-14-seo-spec.md`
- `2026-05-14-tracking-and-consent-spec.md`
- `2026-05-14-monitoring-spec.md` (referenced in §11; ships as a follow-up)
**Style:** Each phase = one reviewable commit (or a small batch). Each
change carries a BDD scenario for behaviour and a red/green/refactor
TDD cycle for the code.
**Done definition (every phase):** type-check clean, all vitest tests
green, dependency-cruiser clean, no new ESLint warnings, manual smoke
per the "Verify" step.

---

## 0. Conventions

- **Branch:** continue on `feature/seo` (already on it). Bundled PR.
- **Commit prefix:** `feat(seo):` for SEO phases, `feat(tracking):` for
  tracking, `feat(consent):` for consent. `chore(seo):` for config /
  env-only changes.
- **Test layer mapping** (per Meaningfy guide §4):
  - `lib/*` ↔ `tests/lib/`
  - `components/*` ↔ `tests/components/`
  - `app/api/*` ↔ `tests/api/`
  - User flows that span layers ↔ `tests/features/`
- **No commits without tests** unless the change is config or markdown.

---

## 0.5 Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | A pixel fires before consent because of a wiring bug → GDPR breach | LOW | HIGH | Phase ordering: ship the consent layer (Phases 4-6) **before** the GA4 mount goes from env-gated to consent-gated (Phase 7). Tests assert no `gtag/js` request fires until consent is granted. |
| R2 | gtag's `consent default denied` push is missed because the GA4 snippet loads first | MEDIUM | HIGH | Inject the inline `gtag('consent','default',...)` call into `<head>` via `next/script` with `strategy="beforeInteractive"`, **above** the `<GoogleAnalytics>` import in the React tree. Asserted by a Playwright test that intercepts the network and verifies the consent default fires before any GA4 hit. |
| R3 | Sitemap leaks `noindex` URLs to crawlers | LOW | MEDIUM | `app/sitemap.ts` derives its list from a single allow-listed array shared with `app/robots.ts`. Unit test ensures `/sondaj/*` is in neither. |
| R4 | OG image 404s in Facebook debugger because `metadataBase` is wrong | MEDIUM | MEDIUM | Phase 1 sets `metadataBase` from env (`NEXT_PUBLIC_SITE_URL`) with a hard-coded production fallback. Unit test asserts absolute URL resolution. Manual smoke step in Phase 13. |
| R5 | The consent-record POST fails (Strapi collection not yet shipped) and the user sees an error | MEDIUM | LOW | Phase 5 ships the localStorage-only path first; Phase 6 layers the Strapi sync as a fire-and-forget that logs but never blocks. |
| R6 | Adding the `<ConsentProvider>` causes hydration mismatches | MEDIUM | MEDIUM | Provider's initial state is computed in a `useSyncExternalStore` hook so SSR and client agree on "no consent yet". Snapshot tests for both branches. |
| R7 | Server-side conversion handler hashes PII incorrectly and Meta/TikTok reject every event | LOW | MEDIUM | Hash helper has explicit unit tests against published reference vectors (Meta CAPI docs ship test cases). Phase 9 only ships GA4 MP; Meta/TikTok land in a follow-up. |
| R8 | Dynamic OG generator (`@vercel/og`) breaks the production build | LOW | MEDIUM | Ship `app/og/route.tsx` behind a feature flag for two days; only flip to default-on after one production redeploy succeeds. |
| R9 | `dependency-cruiser` rejects the new `lib/server-events/*` because of a layering quirk | LOW | LOW | Run `npm run check:deps` after each phase. Adjust the rule with a documented exception only if architecturally justified. |
| R10 | Bundling 12+ phases makes the PR unreviewable | MEDIUM | MEDIUM | Per-phase commits with explicit BDD scenarios in the message. Reviewer can read commit-by-commit. Final PR description summarises. |
| R11 | Production GA4 fills with test data from CI previews | MEDIUM | LOW | Preview deploys point at a separate GA4 property (`G-XXXXXX-PREVIEW`). Production env var stays `G-3M58NGR6PX`. CI workflow injects the right one per environment. |

---

## Phase ordering — at a glance

| # | Phase | Depends on | Effort |
|---|---|---|---|
| 1 | Root metadata + `metadataBase` + canonical URL helper | — | 30 min |
| 2 | `app/robots.ts` + `app/sitemap.ts` + Search-Console verification env | 1 | 45 min |
| 3 | JSON-LD scaffolding + `Organization` + `WebSite` on root layout | 1 | 1h |
| 4 | `lib/consent/version.ts` + `<ConsentProvider>` (localStorage-only) | — | 1h |
| 5 | `<ConsentBanner>` (vanilla-cookieconsent wrapper) | 4 | 1.5h |
| 6 | Strapi `consent-record` sync (fire-and-forget) | 5 | 1h |
| 7 | Wire GA4 (gtag) behind consent + Consent Mode v2 default/update | 5 | 1h |
| 8 | `lib/tracking/events.ts` + waitlist/survey form events | 7 | 45 min |
| 9 | Web Vitals reporter → `cwv` event | 7 | 30 min |
| 10 | Per-page metadata + per-page Service / FAQPage JSON-LD | 3 | 1.5h |
| 11 | Per-page noindex on `/sondaj/*`, `/admin/*` | 1 | 15 min |
| 12 | OG: default static image + `app/og/route.tsx` dynamic generator | 1 | 2h |
| 13 | Lighthouse CI workflow + Web Vitals budget gate | 9 | 1h |
| 14 | Server-side conversions — GA4 Measurement Protocol | 8 | 1.5h |

Backend collection (`consent-record`) is requested but **not blocking** —
Phase 6 degrades gracefully if it doesn't exist yet.

---

## Phase 1 — Root metadata + canonical URL helper

### Feature
```gherkin
Feature: Every page has a stable canonical URL and resolves OG images absolutely
  Background:
    Given NEXT_PUBLIC_SITE_URL is "https://hulubul.com"

  Scenario: Root layout sets metadataBase
    When the home page is server-rendered
    Then the rendered <head> contains <link rel="canonical" href="https://hulubul.com/">
    And every <meta property="og:image"> is an absolute https URL

  Scenario: A page-level canonical override
    Given a page calls makeCanonical("/sondaj/expeditori")
    Then it returns "https://hulubul.com/sondaj/expeditori"
```

### TDD cycle
**Red:** create `tests/lib/seo.test.ts` covering:
- `makeCanonical(path)` returns the absolute URL.
- `getMetadataBase()` falls back to the production URL when the env
  var is unset (no throw — important for local dev without env).

**Green:**
- Add `lib/seo.ts` with `makeCanonical`, `getMetadataBase`,
  `siteName`, `defaultDescription` constants.
- Update `app/layout.tsx` `metadata` to set:
  - `metadataBase: getMetadataBase()`
  - `alternates: { canonical: "/" }` (relative — Next.js resolves
    against `metadataBase`)
  - `openGraph` defaults (siteName, locale `ro_RO`, default image)
  - `twitter` defaults
  - `robots` defaults
  - `verification` from env (Google + Bing)

**Refactor:** none.

### Files
- New: `lib/seo.ts`, `tests/lib/seo.test.ts`
- Modified: `app/layout.tsx`

### Verify
- `npx tsc --noEmit && npx vitest run` clean.
- `curl -s http://localhost:3001/ | grep -E '(canonical|og:image)'` shows
  absolute URLs.

---

## Phase 2 — `app/robots.ts` + `app/sitemap.ts` + verification env

### Feature
```gherkin
Feature: Crawlers find the right pages and skip the wrong ones
  Scenario: robots.txt allows public, blocks transient
    When GET /robots.txt
    Then the body Allows /
    And Disallows /admin/, /api/, /sondaj/
    And lists Sitemap: https://hulubul.com/sitemap.xml

  Scenario: sitemap.xml lists every public, indexable page
    When GET /sitemap.xml
    Then it contains: /, /rute, /confidentialitate, /termeni,
                       /despre-proiect, /pentru-transportatori
    And it does NOT contain: /sondaj/expeditori, /admin/rute, /api/*

  Scenario: Search Console verification meta is emitted when env is set
    Given GOOGLE_SITE_VERIFICATION="abc123"
    When the home page is server-rendered
    Then <meta name="google-site-verification" content="abc123"> is in <head>
```

### TDD cycle
**Red:** `tests/app/seo-routes.test.ts`:
- Import `sitemap` from `app/sitemap.ts`; assert the URL list.
- Import `robots` from `app/robots.ts`; assert the rule shape.
- Mount root layout with stubbed env; assert verification meta.

**Green:**
- `lib/seo.ts` adds `INDEXABLE_ROUTES` + `BLOCKED_ROUTES` arrays —
  one source of truth for both files.
- `app/sitemap.ts` exports a default function returning the array,
  with `lastModified` from CMS for landing/editorial entries.
- `app/robots.ts` exports a default function returning the rules.
- Update root `metadata.verification` to read env vars.

**Refactor:** none.

### Files
- New: `app/sitemap.ts`, `app/robots.ts`, `tests/app/seo-routes.test.ts`
- Modified: `lib/seo.ts`, `app/layout.tsx`

---

## Phase 3 — JSON-LD scaffolding + Organization + WebSite

### Feature
```gherkin
Feature: Every page carries Organization and WebSite structured data
  Scenario: Root layout emits a JSON-LD @graph
    When any page is server-rendered
    Then <head> contains exactly one <script type="application/ld+json">
    And its parsed body has @graph including:
      | @type        | name              |
      | Organization | hulubul.com       |
      | WebSite      | hulubul.com       |

  Scenario: Organization references Meaningfy as parentOrganization
    Then Organization.parentOrganization.name === "Meaningfy"
    And Organization.parentOrganization.url === "https://meaningfy.ws"

  Scenario: JSON-LD validates against schema.org rules
    When the rendered JSON-LD is fed to schema-dts type checks
    Then it type-checks (no missing required fields)
```

### TDD cycle
**Red:** `tests/lib/jsonld.test.ts`:
- `buildOrganization()` returns the `@type: "Organization"` shape with
  `parentOrganization` populated.
- `buildWebSite()` returns the `@type: "WebSite"` shape.
- `buildGraph([...])` returns a single `{ "@context", "@graph" }` doc.

**Green:**
- Install `schema-dts` (`npm i -D schema-dts`).
- Create `lib/jsonld/builders.ts` with typed builders.
- Create `components/seo/JsonLd.tsx` — server component that takes a
  `data: Thing | WithContext<Thing>` prop and renders the JSON inside
  a `<script type="application/ld+json">` tag. Use the standard
  Next.js pattern for this: serialise with `JSON.stringify(data)` and
  escape `</` to `</` to neutralise any `</script>` injection
  attempt. Inline scripts in App Router accept content via React's
  inner-HTML prop — that's the only way to ship inline JSON. Source
  data is **always** from the codebase (typed builders), never from
  user input, so the XSS attack surface is the escape regex itself.
- Mount the JsonLd component with
  `buildGraph([buildOrganization(), buildWebSite()])` in
  `app/layout.tsx`.

**Refactor:** none.

### Files
- New: `lib/jsonld/builders.ts`, `components/seo/JsonLd.tsx`,
  `tests/lib/jsonld.test.ts`
- Modified: `app/layout.tsx`, `package.json`

---

## Phase 4 — Consent state + `<ConsentProvider>` (localStorage-only)

### Feature
```gherkin
Feature: Consent state is the single source of truth
  Scenario: First visit
    Given no `hulubul:consent` key in localStorage
    When ConsentProvider mounts
    Then state is { necessary: true, analytics: "denied", marketing: "denied", version: <current>, choseAt: null }
    And "needsBanner" === true

  Scenario: Returning visitor with current-version consent
    Given localStorage has a consent record with version === current
    When ConsentProvider mounts
    Then state matches the stored record
    And "needsBanner" === false

  Scenario: Returning visitor with stale-version consent
    Given localStorage has a consent record with version older than current
    When ConsentProvider mounts
    Then "needsBanner" === true (re-prompt)
```

### TDD cycle
**Red:** `tests/lib/consent.test.ts`:
- Cover the three branches above.
- Cover `setConsent({ analytics, marketing })` updating localStorage
  and emitting an event.

**Green:**
- `lib/consent/version.ts` exports `CURRENT_CONSENT_VERSION = "2026-05-14"`.
- `lib/consent/types.ts` exports `ConsentState`, `ConsentCategory`.
- `lib/consent/store.ts` exports `readConsent()`, `writeConsent()`,
  `subscribe()` — wraps localStorage with a typed surface and emits
  events on change (so `<Analytics>` can react).
- `components/consent/ConsentProvider.tsx` — wraps children with a
  context. Uses `useSyncExternalStore` so SSR and CSR agree on the
  initial "no consent yet" value (R6 mitigation).

**Refactor:** none.

### Files
- New: `lib/consent/{version,types,store}.ts`,
  `components/consent/ConsentProvider.tsx`,
  `tests/lib/consent.test.ts`
- Modified: `app/layout.tsx` (wraps children in `<ConsentProvider>`)

---

## Phase 5 — `<ConsentBanner>` (vanilla-cookieconsent wrapper)

### Feature
```gherkin
Feature: Banner gathers user consent
  Background:
    Given a first-time visitor

  Scenario: User accepts all
    When the banner appears and the user clicks "Accept all"
    Then ConsentState.analytics === "granted"
    And ConsentState.marketing === "granted"
    And ConsentState.choseAt is the current time
    And the banner is hidden

  Scenario: User rejects non-essential
    When the user clicks "Reject non-essential"
    Then ConsentState.analytics === "denied"
    And ConsentState.marketing === "denied"
    And the banner is hidden

  Scenario: Re-opening preferences from the footer
    Given the user has already given consent
    When the user clicks "Cookies" in the footer
    Then the preferences modal opens, pre-populated with current state

  Scenario: Withdrawal reloads the page
    When the user opens the preferences and unticks both categories
    And clicks "Salvează"
    Then the page reloads after 200ms
```

### TDD cycle
**Red:** `tests/components/ConsentBanner.test.tsx`:
- Render with no prior consent → banner appears (`getByRole("dialog")`).
- Click Accept all → store updated.
- Click Reject all → store updated.
- Click Cookies → modal opens with current values.

**Green:**
- `npm i vanilla-cookieconsent`.
- `components/consent/ConsentBanner.tsx` — `"use client"`. Imports
  `vanilla-cookieconsent` (dynamic import to keep it out of the
  server bundle), instantiates with `lib/consent/banner-config.ts`
  (Romanian copy + categories) on mount.
- Banner config wires its `onChange` callback to `writeConsent()`.
- `Footer.tsx` gains a "Cookies" link that calls `useConsent().open()`.

**Refactor:** none.

### Files
- New: `components/consent/ConsentBanner.tsx`,
  `lib/consent/banner-config.ts`,
  `tests/components/ConsentBanner.test.tsx`
- Modified: `components/landing/Footer.tsx`,
  `app/layout.tsx` (renders `<ConsentBanner>` inside `<ConsentProvider>`),
  `package.json`

---

## Phase 6 — Strapi `consent-record` sync (fire-and-forget)

### Feature
```gherkin
Feature: Consent decisions are persisted server-side for GDPR audit
  Scenario: Banner save POSTs to the consent endpoint
    Given the user clicks "Accept all"
    When the consent change handler runs
    Then POST /api/consent is called with body { analytics: "granted", marketing: "granted", event: "grant", version, sessionId, choseAt }

  Scenario: Strapi success populates recordId
    Given POST /api/consent returns 201 { recordId: "doc123" }
    Then ConsentState.recordId === "doc123"

  Scenario: Strapi failure does not break the user
    Given POST /api/consent returns 502
    Then the banner still hides
    And ConsentState reflects the user choice locally
    And logger.error is called
```

### TDD cycle
**Red:** `tests/api/consent-route.test.ts`:
- Valid body → 201 + Strapi receives the right payload.
- Invalid body (Zod fails) → 400.
- Strapi returns 502 → 502 response, but route doesn't throw.

`tests/lib/consent.test.ts`:
- `writeConsent()` triggers a POST and stores the returned `recordId`.

**Green:**
- `lib/consent/schema.ts` — Zod schema for the consent payload.
- `lib/consent/client.ts` — `submitConsentRecord(payload)` POSTs to
  `/api/consent`, returns `recordId` or `null` on failure.
  Failures call `logger.error("consent", ...)` and resolve with `null`
  (never reject).
- `app/api/consent/route.ts` — Next.js route handler. Validates with
  Zod, augments with headers (userAgent, language, country, referrer),
  forwards to Strapi via `strapiFetch`, returns the new `documentId`.
- Hook `submitConsentRecord` into the `writeConsent` flow inside
  `lib/consent/store.ts`.

**Refactor:** none.

### Files
- New: `lib/consent/{schema,client}.ts`,
  `app/api/consent/route.ts`,
  `tests/api/consent-route.test.ts`
- Modified: `lib/consent/store.ts`, `tests/lib/consent.test.ts`

### Notes
- If the Strapi `consent-record` collection isn't created yet, the
  POST will 404. The handler still returns 502 to the frontend; the
  client logs and continues. **No re-work needed once the collection
  ships** — the same code starts succeeding.

---

## Phase 7 — Wire GA4 (gtag) behind consent + Consent Mode v2

### Feature
```gherkin
Feature: GA4 only loads after the user grants analytics consent
  Background:
    Given NEXT_PUBLIC_GA_ID is "G-3M58NGR6PX"

  Scenario: First visit — banner not yet answered
    When the page loads
    Then no request is made to https://www.googletagmanager.com/gtag/js
    And gtag('consent', 'default', {analytics_storage: 'denied', ...}) is called

  Scenario: User grants analytics
    Given the user clicked "Accept all"
    Then the GA4 snippet (G-3M58NGR6PX) is loaded
    And gtag('consent', 'update', {analytics_storage: 'granted', ad_storage: 'granted', ...}) fires

  Scenario: User denies analytics
    Given the user clicked "Reject non-essential"
    Then the GA4 snippet is NOT loaded
    And the consent default 'denied' state remains in dataLayer

  Scenario: User withdraws after granting
    Given GA4 was loaded after a previous consent
    When the user opens preferences and unticks analytics
    And clicks "Salvează"
    Then the page reloads
    And after reload the GA4 snippet is absent from the DOM
```

### TDD cycle
**Red:** `tests/components/Analytics.test.tsx`:
- Mock `useConsent()`. Render `<Analytics>` with consent denied → no
  `<GoogleAnalytics>` in tree.
- Re-render with consent granted → `<GoogleAnalytics gaId="...">` is
  in tree.
- Verify a Consent Mode v2 default push happens on mount regardless.

**Green:**
- `lib/consent/gtag-bridge.ts`: helpers
  `pushConsentDefault()`, `pushConsentUpdate(state)` that call `gtag`
  through `window.dataLayer` (no direct gtag call — works even if the
  GA4 script hasn't loaded yet because gtag is just `dataLayer.push`).
- `app/layout.tsx`: add a small inline `<Script
  strategy="beforeInteractive">` that defines `window.dataLayer`,
  `window.gtag`, and calls `pushConsentDefault()`. This **must** run
  before the GA4 snippet is parsed (R2 mitigation).
- `components/analytics/Analytics.tsx`: replace env-only gating with
  consent-and-env gating. Subscribe to `consent.store` via
  `useSyncExternalStore`. Mount `<GoogleAnalytics gaId={NEXT_PUBLIC_GA_ID}>`
  only when `state.analytics === "granted"`. Call
  `pushConsentUpdate(state)` whenever consent changes.

**Refactor:** drop the now-unused `MetaPixel` and `LinkedInInsight`
helpers from the existing Analytics file (they were stubs; we'll
re-introduce them via GTM later per spec §3.1.1).

### Files
- New: `lib/consent/gtag-bridge.ts`,
  `tests/lib/gtag-bridge.test.ts`
- Modified: `components/analytics/Analytics.tsx`,
  `app/layout.tsx`,
  `tests/components/Analytics.test.tsx`

### Verify
- DevTools Network tab: no `gtag/js` request before clicking Accept.
- After Accept: `gtag/js?id=G-3M58NGR6PX` loads; GA4 DebugView shows a
  `page_view` within 10 s.
- After Withdraw + reload: `gtag/js` is absent.

---

## Phase 8 — Custom events from React forms

### Feature
```gherkin
Feature: Form submissions emit a custom GA4 event with the right shape
  Scenario: Waitlist submitted by an expeditor from landing
    Given consent.analytics === "granted"
    And the user submits the waitlist form successfully
    Then gtag('event', 'waitlist_submit', { role: 'expeditor', source: 'landing', event_id: <uuid> }) is called once

  Scenario: Survey submitted by a transportator
    Then gtag('event', 'survey_submit', { role: 'transportator', source: 'standalone', event_id: <uuid> }) is called once

  Scenario: Consent denied — no event
    Given consent.analytics === "denied"
    And the user submits the form
    Then no gtag('event', ...) call is made
```

### TDD cycle
**Red:** `tests/lib/tracking.test.ts`:
- `trackEvent` calls `window.gtag` when defined; no-op when undefined.
- `trackWaitlistSubmit(role, source, eventId)` produces the expected
  argument shape.

`tests/components/SignupForm.test.tsx`:
- After successful submit, `trackWaitlistSubmit` is invoked with the
  correct `role` and `source: "landing"`.

**Green:**
- `lib/tracking/events.ts` — `trackEvent`, `trackWaitlistSubmit`,
  `trackSurveySubmit` per the tracking spec §5.2.
- `components/landing/SignupForm.tsx` — call `trackWaitlistSubmit`
  on `setStatus(FORM_STATUS.Success)`.
- `components/survey/SurveyForm.tsx` — call `trackSurveySubmit` on
  `setStatus(FORM_STATUS.Success)`.

**Refactor:** none.

### Files
- New: `lib/tracking/events.ts`, `tests/lib/tracking.test.ts`
- Modified: `components/landing/SignupForm.tsx`,
  `components/survey/SurveyForm.tsx`,
  their tests.

---

## Phase 9 — Web Vitals reporter

### Feature
```gherkin
Feature: Real-user Core Web Vitals are reported to GA4
  Scenario: LCP measurement on the home page
    Given consent.analytics === "granted"
    When the LCP metric becomes available in the browser
    Then gtag('event', 'cwv', { name: 'LCP', value: <number>, rating: 'good'|'needs-improvement'|'poor', id: <string> }) is called

  Scenario: Consent denied — no Web Vitals reported
    Given consent.analytics === "denied"
    Then no 'cwv' event fires
```

### TDD cycle
**Red:** `tests/components/WebVitalsReporter.test.tsx`:
- Mock `useReportWebVitals` from `next/web-vitals`; assert callback
  invocation calls `trackEvent("cwv", ...)`.

**Green:**
- `components/analytics/WebVitalsReporter.tsx` — `"use client"`. Calls
  `useReportWebVitals(metric => trackEvent("cwv", { ...metric }))`.
  `trackEvent` is already a no-op when consent denied (Phase 8).
- Mount in `app/layout.tsx` next to `<Analytics>`.

**Refactor:** none.

### Files
- New: `components/analytics/WebVitalsReporter.tsx`,
  `tests/components/WebVitalsReporter.test.tsx`
- Modified: `app/layout.tsx`

---

## Phase 10 — Per-page metadata + per-page Service / FAQPage JSON-LD

### Feature
```gherkin
Feature: Each page carries the right title, description, and JSON-LD
  Scenario: Home page emits FAQPage and sender/recipient Service
    When GET /
    Then JSON-LD @graph contains FAQPage (with one Question per CMS FAQ item)
    And @graph contains the sender/recipient Service entity

  Scenario: /pentru-transportatori emits the transporter Service
    When GET /pentru-transportatori
    Then JSON-LD @graph contains the transporter-facing Service entity
    And the page metadata title === "Pentru transportatori — hulubul.com"

  Scenario: Editorial pages carry BreadcrumbList
    When GET /confidentialitate
    Then JSON-LD @graph contains a BreadcrumbList: Home → Confidențialitate

  Scenario: /sondaj/expeditori carries noindex
    When GET /sondaj/expeditori
    Then <meta name="robots" content="noindex, nofollow"> is in <head>
    And the page is absent from /sitemap.xml (already proven in Phase 2)
```

### TDD cycle
**Red:** `tests/lib/jsonld.test.ts` (extend):
- `buildFaqPage(items)` mirrors the CMS FAQ structure.
- `buildServiceForSenders()` and `buildServiceForTransporters()`
  produce the two Service entities per SEO spec §4.3 and §4.4.
- `buildBreadcrumbs(items)` produces a `BreadcrumbList`.

`tests/app/per-page-metadata.test.ts`:
- Each page's `generateMetadata` returns the expected `title`,
  `description`, `alternates.canonical`.

**Green:**
- Extend `lib/jsonld/builders.ts` with the new builders.
- Update `app/(marketing)/page.tsx` to mount `<JsonLd>` with FAQPage +
  sender/recipient Service.
- Update `app/(marketing)/pentru-transportatori/page.tsx` to mount
  `<JsonLd>` with the transporter Service.
- Update editorial route shims to mount `<JsonLd>` with their
  BreadcrumbList. `EditorialPageView` is the natural home for this.

**Refactor:** if `<JsonLd>` boilerplate repeats, extract a
`<PageJsonLd schemas={[...]} />` convenience component.

### Files
- New: `tests/app/per-page-metadata.test.ts`
- Modified: `lib/jsonld/builders.ts`, `tests/lib/jsonld.test.ts`,
  `app/(marketing)/page.tsx`,
  `app/(marketing)/pentru-transportatori/page.tsx`,
  `components/editorial/EditorialPageView.tsx`

---

## Phase 11 — `noindex` for `/sondaj/*` and `/admin/*`

### Feature
```gherkin
Feature: Transient and admin surfaces stay out of the index
  Scenario Outline: noindex on transient surfaces
    When GET <path>
    Then the rendered <head> contains <meta name="robots" content="noindex, nofollow">

    Examples:
      | path                       |
      | /sondaj/expeditori         |
      | /admin/rute                |
```

### TDD cycle
**Red:** `tests/app/noindex.test.ts`:
- Each path's `generateMetadata` returns
  `{ robots: { index: false, follow: false } }`.

**Green:**
- Add `export const metadata = { robots: { index: false, follow: false } }`
  to `app/(marketing)/sondaj/expeditori/page.tsx` and
  `app/admin/rute/page.tsx`.

**Refactor:** none.

### Files
- Modified: `app/(marketing)/sondaj/expeditori/page.tsx`,
  `app/admin/rute/page.tsx`,
  new `tests/app/noindex.test.ts`.

---

## Phase 12 — OG image — static default + dynamic generator

### Feature
```gherkin
Feature: Every page has a branded OG image
  Scenario: Default OG image is shipped at /og-default.png
    When GET /og-default.png
    Then it returns a 1200×630 PNG ≤ 200 KB

  Scenario: Editorial page without a CMS image gets a dynamic OG
    Given an editorial page has no shareImage in CMS
    When GET /og?title=Despre%20proiect
    Then it returns a 1200×630 PNG with the title rendered in Fraunces

  Scenario: Editorial pages reference the dynamic OG in their metadata
    Given the about page is rendered
    Then its og:image URL resolves to https://hulubul.com/og?title=Despre%20proiect&subtitle=...
```

### TDD cycle
**Red:**
- Snapshot test: `tests/app/og-route.test.ts` mounts the route with
  query `?title=Test` and asserts the response is a 1200×630 PNG.
- `tests/lib/seo.test.ts`: `makeOgImage(title, subtitle)` returns the
  right URL.

**Green:**
- Add `public/og-default.png` (designer-supplied; until then, a
  placeholder PNG generated from the dynamic route saved as a static
  file).
- `app/og/route.tsx` — `next/og`'s `ImageResponse` renderer with
  Fraunces (loaded server-side from `next/font`) and the Hulubul
  brand colours.
- `lib/seo.ts` — `makeOgImage(title, subtitle?)` returns
  `${getMetadataBase()}/og?title=${encodeURIComponent(title)}...`.
- Editorial pages and sitemap entries use `makeOgImage` when no CMS
  image is available.

**Refactor:** none.

### Risk-mitigation toggle (R8)
- Behind `process.env.NEXT_PUBLIC_DYNAMIC_OG === "1"` for two days.
  Default off; explicitly turn on in production after first deploy
  succeeds.

### Files
- New: `app/og/route.tsx`, `public/og-default.png`,
  `tests/app/og-route.test.ts`
- Modified: `lib/seo.ts`, editorial route generators

---

## Phase 13 — Lighthouse CI + Web Vitals budget gate

### Feature
```gherkin
Feature: Performance regressions are caught in CI
  Scenario: Lighthouse runs on a PR preview
    When a PR is opened against main
    Then Lighthouse CI runs against the Vercel preview URL for /
    And the assertion config requires Performance ≥ 90, SEO ≥ 95, A11y ≥ 95

  Scenario: Page weight budget
    When Lighthouse measures total bytes
    Then the assertion config requires the total ≤ 350 KB transferred
```

### TDD cycle
**Red:** add `.lighthouserc.cjs` with the budget. Run locally against
http://localhost:3001 to confirm the assertions are reachable.

**Green:**
- `.github/workflows/lighthouse.yml` runs Lighthouse CI on PRs against
  `${{ steps.vercel-preview.outputs.url }}` (or, until Vercel is in
  use, against a self-hosted preview).
- Use `treosh/lighthouse-ci-action@v12`. Upload reports as artifact.
- Add `npm run lh` script: `lhci autorun` against `http://localhost:3001`.

**Refactor:** none.

### Files
- New: `.lighthouserc.cjs`, `.github/workflows/lighthouse.yml`
- Modified: `package.json`

---

## Phase 14 — Server-side conversions — GA4 Measurement Protocol

### Feature
```gherkin
Feature: Waitlist signups are reported server-side as a conversion
  Background:
    Given GA4_MEASUREMENT_ID and GA4_API_SECRET are set

  Scenario: Successful waitlist submission with analytics consent
    Given consent.analytics === "granted" (passed in the form payload)
    When POST /api/waitlist returns 201
    Then the route handler dispatches a 'waitlist_submit' event to https://www.google-analytics.com/mp/collect
    And the payload includes event_id matching the browser-side event_id
    And the user's email/phone are SHA-256 hashed before being included as user_data

  Scenario: Strapi succeeds, GA4 MP fails
    When the GA4 MP request times out
    Then the route handler still returns 201 to the user
    And logger.error("server-events.ga4mp", ...) is called

  Scenario: Analytics consent denied
    Given consent.analytics === "denied"
    Then no GA4 MP request is dispatched
```

### TDD cycle
**Red:** `tests/lib/server-events/ga4mp.test.ts`:
- Hash helper produces the right SHA-256 lowercase-hex digest.
- `dispatchGa4Mp(event)` POSTs the right body shape (validated against
  the published GA4 MP reference).
- A mocked 500 from GA4 MP doesn't throw.

`tests/api/waitlist-route.test.ts` (extend):
- Body with `consent: {analytics: "granted"}` triggers a GA4 MP call.
- Body with `consent: {analytics: "denied"}` skips it.
- Both cases still return 201 to the caller.

**Green:**
- `lib/server-events/hash.ts` — `sha256Hex(input)` returning lowercase
  hex (no salt — platforms specify the format).
- `lib/server-events/ga4mp.ts` — `dispatchGa4Mp(event, consent)`.
- `lib/server-events/dispatcher.ts` — `dispatchConversion(event, consent)`
  that fans out to the platform modules in parallel via
  `Promise.allSettled`.
- `app/api/waitlist/route.ts` — after Strapi 201, generate `event_id`
  (UUID), call `dispatchConversion`, return both `ok: true` and
  `event_id` in the JSON response.
- `app/api/survey/route.ts` — same pattern for `survey_submit`.
- Update `SignupForm`/`SurveyForm` to pass `consent` from
  `useConsent()` into the POST body, and to use the returned
  `event_id` in `trackEvent`.

**Refactor:** drop any leftover regex-based error matching in
`humanizeFormError` if Phase 4 of the previous refactor (typed
errors) didn't already.

### Files
- New: `lib/server-events/{hash,ga4mp,dispatcher}.ts`,
  matching tests under `tests/lib/server-events/`
- Modified: `app/api/waitlist/route.ts`, `app/api/survey/route.ts`,
  `components/landing/SignupForm.tsx`,
  `components/survey/SurveyForm.tsx`,
  their tests.

### Out of scope here (deferred)
- Meta CAPI dispatch — same pattern, but requires `META_CAPI_*` env
  vars marketing must provision first.
- TikTok Events API dispatch — same pattern, needs the TikTok pixel
  + token.

---

## Done definition (whole plan)

The SEO + tracking + consent work is "done" when:

1. `curl -s https://hulubul.com/sitemap.xml` returns a valid sitemap
   with the seven indexable URLs.
2. `curl -s https://hulubul.com/robots.txt` is correct and references
   the sitemap.
3. View-source on `/` shows one `<script type="application/ld+json">`
   block whose `@graph` includes `Organization` (with
   `parentOrganization → Meaningfy`), `WebSite`, `FAQPage`, and the
   sender/recipient `Service`. Validates clean at validator.schema.org.
4. View-source on `/pentru-transportatori` shows the transporter
   `Service` JSON-LD.
5. View-source on `/sondaj/expeditori` and `/admin/rute` shows
   `<meta name="robots" content="noindex, nofollow">`.
6. Pasting `https://hulubul.com/` into the Facebook Sharing Debugger
   shows the configured title, description, and image without
   warnings.
7. First-time visitor sees the consent banner. No `gtag/js` request
   fires before they click Accept. `gtag('consent','default')` is
   `denied` for all four signals.
8. After Accept All: GA4 loads, `gtag('consent','update')` flips to
   granted, GA4 DebugView shows `page_view` within 10 s.
9. Submitting the waitlist fires both a browser `waitlist_submit`
   (via gtag) **and** a server-side GA4 MP event with the same
   `event_id`. The two dedupe in GA4 reports.
10. Reloading after a Withdraw call removes the GA4 snippet from
    the DOM.
11. CI runs Lighthouse and dependency-cruiser as required checks;
    both pass on this PR.
12. The Strapi `consent-record` collection (when shipped) receives
    one row per consent action with the right `event` value.

---

## Rollout

| Week | Phases |
|---|---|
| 1 (foundations) | 1, 2, 3, 4 |
| 2 (consent + tracking) | 5, 6, 7, 8, 9 |
| 3 (per-page polish) | 10, 11, 12, 13 |
| 4 (server-side measurement) | 14 + Meta CAPI / TikTok follow-up |

If reviewer bandwidth is tight, ship Phases 1-3 as one PR (pure
SEO, no behavioural changes), and Phases 4-9 as a second PR
("consent + analytics"). The current branch (`feature/seo`) accepts
either bundling — choose at PR-open time based on diff size.

---

## Out of scope (logged for later)

- Meta CAPI / TikTok Events server-side dispatch (Phase 14 only ships
  GA4 MP).
- The **monitoring spec** (Sentry, UptimeRobot, `/api/health`) — its
  own implementation plan, separate PR. Some Phase 6 + Phase 14
  hooks will benefit from `lib/logger.ts` integration when monitoring
  ships.
- The Strapi `consent-record` collection itself — a backend repo
  ticket, not in this plan.
- Migration to GTM (`<GoogleTagManager>` swap) — deferred until a
  second pixel is added; tracked in tracking spec §3.1.1.
- A/B testing platform, Customer Data Platform, marketing automation
  — separate epics.
