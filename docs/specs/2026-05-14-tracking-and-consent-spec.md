# Tracking + Consent specification — hulubul.com

**Date:** 2026-05-14
**Status:** Spec only. Implementation plan ships separately.
**Supersedes / extends:** `design/spec-consent.md` (banner-only spec).
**Scope:** Every third-party measurement / advertising script that
loads in the browser, every server-side conversion event sent from our
backend(s), and the consent layer that gates them all. Single document
because the two concerns are tightly coupled — consent decides what
tracking can fire.

---

## 1. Goals

1. **A single client-side measurement layer.** v1 ships GA4 via gtag.js
   (the canonical Google snippet, mounted by `<GoogleAnalytics>` from
   `@next/third-parties`). When a second/third paid pixel is added we
   migrate to a GTM container so adding a new pixel becomes a UI change
   in GTM, not React code (see §3.1.1).
2. **Server-side conversions** for the high-value events
   (`waitlist_submit`, `survey_submit`) so attribution survives ad
   blockers and iOS ITP.
3. **Granular GDPR-compliant consent** before any non-essential script
   loads. Versioned, withdrawable, persisted server-side as an audit
   trail.
4. **Cleanly separable layers:** the consent state is the single source
   of truth — every tracker checks it, no tracker bypasses it.
5. **Local-dev safe:** no tracker fires unless its env var is set, so
   developers' machines never report into production analytics.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser — v1 (today)                                            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  app/layout.tsx                                          │    │
│  │    <ConsentProvider>                                     │    │
│  │      <ConsentBanner />     ← vanilla-cookieconsent       │    │
│  │      <Analytics />         ← reads consent, gates GA4    │    │
│  │      {children}                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│           │                                                      │
│           ▼ (only if analytics consent === "granted")            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  GA4 via gtag.js  (G-3M58NGR6PX)                         │    │
│  │  Mounted by <GoogleAnalytics> from @next/third-parties:  │    │
│  │    ├─ page_view (auto, SPA-aware)                        │    │
│  │    ├─ scroll (GA4 enhanced measurement)                  │    │
│  │    ├─ cwv (Web Vitals reporter)                          │    │
│  │    ├─ consent_grant / consent_update / consent_withdraw  │    │
│  │    ├─ waitlist_submit                                    │    │
│  │    └─ survey_submit                                      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Future (when pixel count > 2 — see §3.1.1):                     │
│    Replace <GoogleAnalytics> with <GoogleTagManager> and          │
│    move GA4 + Meta Pixel + TikTok Pixel into the GTM UI.          │
└─────┬────────────────────────────────────────────────────────────┘
      │
      │ form submit
      ▼
┌──────────────────────────────────────────────────────────────────┐
│  Next.js Route Handler  app/api/{waitlist,survey}/route.ts       │
│    1. Validate body (Zod)                                        │
│    2. Forward to Strapi                                          │
│    3. Fire server-side conversions in parallel:                  │
│         ├─ GA4 Measurement Protocol  (today, when secret set)    │
│         ├─ Meta CAPI                  (when Meta is added)       │
│         └─ TikTok Events API          (when TikTok is added)     │
└──────┬─────────────────────────┬─────────────────────────────────┘
       │                         │
       ▼                         ▼
┌──────────────────┐   ┌────────────────────────────────────────────┐
│  Strapi          │   │  External tracking endpoints                │
│  - waitlist      │   │  google-analytics.com,                      │
│  - survey-sender │   │  graph.facebook.com,                        │
│  - consent-record│   │  business-api.tiktok.com                    │
└──────────────────┘   └────────────────────────────────────────────┘
```

---

## 3. Library choices

### 3.1 Tag layer — `@next/third-parties/google` with `<GoogleAnalytics>` (gtag.js)

**v1 ships with direct GA4 via gtag.js.** Already in the repo via
`@next/third-parties`; the existing `<Analytics>` component already
renders the right snippet. Production GA4 measurement ID is
**`G-3M58NGR6PX`** (set as `NEXT_PUBLIC_GA_ID`).

The mounted snippet is exactly the canonical Google one:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3M58NGR6PX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-3M58NGR6PX');
</script>
```
/btw
`<GoogleAnalytics gaId={NEXT_PUBLIC_GA_ID} />` from
`@next/third-parties/google` emits exactly this — no manual `<Script>`
needed.

**Trade-off acknowledged:** gtag.js means every additional pixel (Meta,
TikTok, LinkedIn) is hardcoded in the React tree, not configured in a
GTM UI. This is deliberate for v1 — we only ship GA4 today, so the
GTM-container overhead isn't justified. Migration path to GTM is in
§3.1.1 below.

#### 3.1.1 Migration path to GTM (deferred until pixel count > 2)

When marketing wants to add Meta Pixel + TikTok Pixel + LinkedIn Insight
in the same release, the rule of thumb flips. At that point:

1. Create a GTM container (`GTM-XXXXXX`) and configure the GA4 tag
   inside it instead of via gtag.
2. Replace `<GoogleAnalytics>` with `<GoogleTagManager>` (same
   `@next/third-parties/google` package).
3. Move the existing `gtag('event', ...)` calls in
   `lib/tracking/events.ts` to `dataLayer.push({event: ...})` —
   **already what they do** because gtag pushes through dataLayer
   under the hood. So app code is unchanged.
4. All non-GA pixels are configured as GTM tags inside the container.

The change is `<GoogleAnalytics>` → `<GoogleTagManager>` plus a one-time
GTM container setup. Nothing in the consent layer or server-side
conversions needs to change.

### 3.2 Consent banner — `vanilla-cookieconsent` v3.x

- MIT, ~30 KB gzipped, zero deps.
- Granular categories, re-openable preferences modal, language pack
  via JSON.
- Framework-agnostic — wrapped in a thin `<ConsentBanner>` React
  component.
- Romanian translation maintained by the project; brand copy overrides
  applied locally.
- **No vendor lock-in, no subscription, no third-party network calls.**

### 3.3 Server-side conversion APIs

| Platform | Library | Notes |
|---|---|---|
| Meta (Facebook + Instagram) | `facebook-nodejs-business-sdk` | Official. Used for Conversions API (CAPI). |
| TikTok | direct `fetch` | No mature official Node SDK. ~30 lines of code. |
| GA4 Measurement Protocol | direct `fetch` | No library needed. |

All three live in `lib/server-events/` and are dispatched in parallel
from `app/api/waitlist/route.ts` and `app/api/survey/route.ts` after
the Strapi POST succeeds. Failures are logged but never rethrown —
analytics must never block a real submission.

### 3.4 Considered and rejected

| Library / service | Verdict |
|---|---|
| Cookiebot, Iubenda, OneTrust, TrustArc | Managed SaaS. Justified at ad-spend scale. Overkill at v1. |
| Klaro! | OSS alternative to vanilla-cookieconsent. Acceptable fallback if v-c-c ever stops being maintained. |
| `react-cookie-consent` | No granular categories. Insufficient for GDPR. |
| Segment / RudderStack | Customer-data-pipeline proxy. Worth the cost only at scale (≥100k events/month) when destinations multiply. |
| `analytics.js` (DavidWells) | Plugin abstraction over GA/Mixpanel/Segment. Useful for code-level event taxonomy that survives platform swaps. Adds a layer; revisit if we move beyond gtag/GTM. |
| Roll-your-own banner | Doable per `design/spec-consent.md`. ~1 day of work. Choose only if `vanilla-cookieconsent` becomes a problem. |

---

## 4. Consent layer

### 4.1 Categories

| Category | Default | Withdrawable | What it gates |
|---|---|---|---|
| **Necessary** | granted (forced) | no | Strapi auth, CSRF, session cookies. Nothing tracker-side. |
| **Analytics** | denied | yes | GA4, Lighthouse RUM, future PostHog. First-party-flavoured measurement. |
| **Marketing** | denied | yes | Reserved for Meta Pixel, TikTok Pixel, LinkedIn Insight, retargeting. **Nothing in this category loads in v1** (no marketing pixels are configured). The category exists so the consent surface, the audit record, and Consent Mode v2's `ad_*` signals are correct from day one. |

The banner shows three checkboxes plus an "Accept all" / "Reject
non-essential" pair of buttons, equal prominence — no dark pattern.

### 4.2 Frontend state

```ts
interface ConsentState {
  necessary: true;
  analytics: "granted" | "denied";
  marketing: "granted" | "denied";
  version: string;          // e.g. "2026-05-14"
  choseAt: string;          // ISO-8601
  recordId?: string;        // Strapi documentId after server-sync
}
```

`ConsentProvider` (`lib/consent/ConsentProvider.tsx`) exposes:

```ts
interface ConsentContext {
  state: ConsentState;
  open(): void;        // Re-open the preferences modal
  reset(): void;       // Wipe state, force re-prompt
}
```

### 4.3 Banner trigger and re-entry

- **First visit, no prior consent:** banner appears as a bottom bar.
  Page is interactive; nothing on the banner blocks reading.
- **After consent:** banner hides. A small `Cookies` link in the
  footer re-opens the preferences modal via `useConsent().open()`.
- **From `/confidentialitate`:** a button "Modifică preferințele"
  also opens the modal.

### 4.4 Versioning

`version` is an ISO date string (`"2026-05-14"`). Bumped whenever:
- Banner copy changes materially (new categories, reworded
  description).
- A new tracker is added that wasn't in scope when the user previously
  consented.

When the user's stored `version` is older than the current code's
version, the banner re-opens automatically. The user re-consents to
the new wording; a new `consent-record` row is written with
`event: "update"`.

The current `version` is exported from `lib/consent/version.ts`. Single
source of truth.

### 4.5 Withdrawal flow

1. User clicks "Cookies" in the footer or "Modifică preferințele".
2. The preferences modal opens, pre-populated with current state.
3. User toggles categories off → clicks "Salvează".
4. `ConsentProvider`:
   - Updates localStorage.
   - POSTs a new `consent-record` with `event: "update"`.
   - Reloads the page after a 200ms delay so any tracker scripts
     loaded by gtag (or, post-migration, by GTM) drop out cleanly.
     In-place teardown is fragile across all of these.

A "Withdraw all" button in the modal sets all categories to denied,
posts `event: "withdraw"`, and reloads.

### 4.6 Google Consent Mode v2

Required by Google for any GA4 / Google Ads tag from March 2024
onward. With gtag.js (v1 setup), the consent state is communicated via
`gtag('consent', ...)`:

```ts
// Default — pushed BEFORE the GA4 snippet loads, in an inline <head>
// script emitted by ConsentProvider's bootstrap. "Denied" across the
// board means a partial load (e.g. user closes the page mid-banner)
// stays compliant.
gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  wait_for_update: 500, // give the banner up to 500ms to land
});

// Update — fired whenever the user saves preferences:
gtag("consent", "update", {
  ad_storage: state.marketing === "granted" ? "granted" : "denied",
  ad_user_data: state.marketing === "granted" ? "granted" : "denied",
  ad_personalization: state.marketing === "granted" ? "granted" : "denied",
  analytics_storage: state.analytics === "granted" ? "granted" : "denied",
});
```

When we eventually migrate to GTM (§3.1.1), the same calls work — gtag
writes into `dataLayer` under the hood, and GTM picks them up natively.
No app-code change.

---

## 5. Tag plan

### 5.1 v1 — GA4 only, via gtag

GA4 is the only client-side tracker for v1. The events configured are:

| Event | Source | Consent gate |
|---|---|---|
| `page_view` | gtag built-in (auto on every route change in the App Router via `<GoogleAnalytics>` SPA helper) | analytics |
| `scroll` | gtag enhanced measurement (toggle in GA4 admin) | analytics |
| `cwv` | Custom event from the Web Vitals reporter (LCP / INP / CLS / TTFB / FCP) | analytics |
| `consent_grant` / `consent_update` / `consent_withdraw` | Custom events from the consent banner | analytics |
| `waitlist_submit` | Custom event after form success — `role`, `source` parameters | analytics |
| `survey_submit` | Custom event after form success — `role`, `source` parameters | analytics |

Meta Pixel, TikTok Pixel, and LinkedIn Insight are **not in v1**. When
they land, the migration to GTM (§3.1.1) is the recommended moment.

### 5.2 Custom events from React — `lib/tracking/events.ts`

```ts
declare global {
  interface Window {
    // Overloaded: gtag('event', name, params) for app events,
    // gtag('consent', 'default'|'update', signals) for Consent Mode v2,
    // gtag('config', id, params) for the GA4 init call.
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  // gtag is the canonical entry point; it pushes through dataLayer under
  // the hood, so when we migrate to GTM nothing here changes.
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

export function trackWaitlistSubmit(role: WaitlistRole, source: string) {
  trackEvent("waitlist_submit", { role, source });
}

export function trackSurveySubmit(role: SurveyRole, source: string) {
  trackEvent("survey_submit", { role, source });
}
```

These are called from the form components after a successful POST. The
gtag call is a no-op when GA4 isn't loaded (consent denied or env var
unset) — the function guard fails gracefully.

---

## 6. Server-side conversions

### 6.1 Why

Browser pixels miss 30-50% of conversions due to:
- Ad blockers (uBlock Origin, etc.)
- iOS 14.5+ ITP
- Third-party cookie deprecation
- User explicitly denying marketing consent (we still want **first-party
  analytics** even when external pixels are blocked — GA4 MP can
  receive opt-in events without firing the Meta/TikTok pixel)

Server-side events solve this for the high-value funnel actions where
attribution matters most.

### 6.2 Events to forward

| Event | Frontend trigger | Forwarded to | Consent rule |
|---|---|---|---|
| `Lead` (waitlist signup) | `app/api/waitlist/route.ts` after Strapi 201 | Meta CAPI, TikTok Events, GA4 MP | Marketing consent for Meta/TikTok; analytics for GA4. The route handler reads consent from the request body (passed by the form component from `ConsentProvider.state`). |
| `CompleteRegistration` (survey) | `app/api/survey/route.ts` after Strapi 201 | Same | Same |

### 6.3 Implementation skeleton

`lib/server-events/dispatcher.ts`:

```ts
export async function dispatchConversion(event: ConversionEvent, consent: ConsentSnapshot) {
  await Promise.allSettled([
    consent.marketing === "granted" ? metaCapi.send(event) : null,
    consent.marketing === "granted" ? tiktokEvents.send(event) : null,
    consent.analytics === "granted" ? ga4Mp.send(event) : null,
  ].filter(Boolean));
  // Failures are logged via lib/logger.ts; submission flow is unaffected.
}
```

Each platform module owns its own request shape. GA4 MP requires
`measurement_id` + `api_secret` env vars; Meta CAPI requires the Pixel
ID + access token; TikTok Events requires the Pixel ID + access token.

### 6.4 IP and PII hashing

Per platform requirements, user identifiers (email, phone) sent
server-side are SHA-256-hashed before transport. Helper in
`lib/server-events/hash.ts`. Raw values never leave the route handler
in plaintext over the wire.

The user's IP is read from `x-forwarded-for` and forwarded as the
event's source IP, **only when consent is granted** for the relevant
category. Otherwise the IP is omitted.

### 6.5 Deduplication

GA4 / Meta / TikTok all support an `event_id` field used to deduplicate
the server-side event with its browser-side twin. The Next.js route
handler generates a UUID per submission and:
- Returns it in the response so the form can echo it via gtag (later
  via GTM if/when the migration in §3.1.1 happens).
- Includes it in the server-side payload.

The browser event (`gtag('event', 'waitlist_submit', { event_id })`)
and the server event (sent via Measurement Protocol with the same
`event_id`) dedupe at the platform side.

---

## 7. Backend interlinking

### 7.1 Required

**Create `consent-record` collection on Strapi.** This is the only
required backend change.

| Field | Type | Required | Notes |
|---|---|---|---|
| `sessionId` | string (uuid, max 64) | yes | Generated client-side on first banner interaction. Joins multiple consent events from the same browser. |
| `analytics` | enum (`granted`, `denied`) | yes | |
| `marketing` | enum (`granted`, `denied`) | yes | |
| `version` | string (max 32) | yes | Banner copy version. |
| `event` | enum (`grant`, `update`, `withdraw`) | yes | `grant` = first acceptance; `update` = changed via preferences; `withdraw` = full reset. |
| `choseAt` | datetime | yes | Client-side timestamp at the moment the user clicked. |
| `userAgent` | string (max 512) | no | From request headers, server-side. |
| `language` | string (max 16) | no | From `Accept-Language`. |
| `country` | string (max 2) | no | From edge-IP header (Vercel/CDN), if available. |
| `referrer` | string (max 2048) | no | Where the user came from when they consented. |

- `draftAndPublish: false` — every consent action is a fact.
- Public `create` permission **enabled** (banner POSTs without auth).
  All other operations require the API token.

GDPR rationale (Art. 7(1)): the controller must demonstrate
that a user consented. localStorage alone is not demonstrable.

### 7.2 Optional (highly recommended)

Add a one-to-one `consentRecord` relation on:
- `waitlist-submission` → `consent-record`
- `survey-sender` → `consent-record`

The frontend includes the `recordId` (returned from
`POST /api/consent-records`) in the form payload. Result: every
submission row points at the consent record that authorised it. GDPR
audits become a single SQL join.

### 7.3 Optional (server-side webhook from Strapi)

Lifecycle hooks on `waitlist-submission` create / `survey-sender`
create could fire the conversion events instead of the Next.js route
handler. Pros: cleaner separation, conversions fire even if the form
client-side bypasses the route. Cons: Strapi env vars multiply,
backend takes ownership of marketing-stack tokens.

**Recommendation:** keep conversions in the Next.js route handler for
v1. Move to Strapi lifecycle hooks only if frontend conversions prove
unreliable (they won't, in our architecture).

### 7.4 No-backend fallback

If the `consent-record` collection isn't created in time, the frontend
ships in **localStorage-only mode**: trackers are gated correctly but
the audit trail starts the day Strapi catches up. No re-work needed
once the collection lands — the POST just starts succeeding.

---

## 8. Environment variables

| Var | Owner | Where it's read | Required? | Production value |
|---|---|---|---|---|
| `NEXT_PUBLIC_GA_ID` | Marketing | `<Analytics>` (browser GA4 via gtag) | **Yes (prod)** | `G-3M58NGR6PX` |
| `NEXT_PUBLIC_GTM_ID` | Marketing | `<Analytics>` (only after migration to GTM, §3.1.1) | No — defer | not set yet |
| `META_CAPI_PIXEL_ID` | Marketing | `lib/server-events/meta.ts` | When server-side conversions ship | — |
| `META_CAPI_ACCESS_TOKEN` | Marketing | `lib/server-events/meta.ts` | Same | — |
| `TIKTOK_PIXEL_ID` | Marketing | `lib/server-events/tiktok.ts` | Same | — |
| `TIKTOK_EVENTS_TOKEN` | Marketing | `lib/server-events/tiktok.ts` | Same | — |
| `GA4_MEASUREMENT_ID` | Marketing | `lib/server-events/ga4.ts` | Same | `G-3M58NGR6PX` |
| `GA4_API_SECRET` | Marketing | `lib/server-events/ga4.ts` | Same | (provision in GA4 admin → Data Streams → Measurement Protocol API secrets) |
| `GOOGLE_SITE_VERIFICATION` | Marketing | root metadata | Optional | — |
| `BING_SITE_VERIFICATION` | Marketing | root metadata | Optional | — |

Local dev: leave all of these unset → no tracker fires. CI / preview
deploys: set `NEXT_PUBLIC_GA_ID` to a **separate GA4 property** (not
production) so PR previews don't pollute prod analytics. After the
migration to GTM (§3.1.1), the same rule applies to `NEXT_PUBLIC_GTM_ID`
(separate container per environment).

---

## 9. Logging and monitoring

- Banner shown / dismissed / saved → `consent_*` event in GA4 (gated
  by analytics consent itself — only granted users generate events).
- Server-side dispatch failures → `logger.error("server-events", ...)`
  in `lib/logger.ts`. Surfaced by the monitoring spec.
- Aggregate consent rate (granted / total) is the headline KPI for the
  consent UX. Visible in GA4 once wired.

---

## 10. Acceptance

1. First-time visitor sees the banner; **no analytics or marketing
   script is loaded** in the page until they consent. (In v1: no
   `gtag/js` request fires; in the post-GTM future: no `gtm.js`
   request fires.)
2. "Reject non-essential" is a one-click action; nothing tracker-side
   loads thereafter.
3. "Accept all" loads gtag.js (GA4 via `<GoogleAnalytics>`);
   `gtag('consent', 'update', ...)` fires with `granted` for both
   `ad_storage` and `analytics_storage`; GA4 reports a `page_view` in
   the GA4 DebugView within 10 s.
4. After consent, refreshing the page does not re-show the banner.
5. Clicking "Cookies" in the footer re-opens the preferences modal
   pre-populated with current state.
6. Withdrawing consent reloads the page; the gtag.js script is absent
   from the DOM after reload, and `gtag('consent', 'default', ...)` shows
   `denied` across all four signals before any further events fire.
7. Each consent action results in a Strapi `consent-record` row with
   the right `event` value.
8. A waitlist submission made after consent has its `consentRecord`
   relation populated (when the optional relation ships).
9. A waitlist submission triggers server-side conversion events,
   **gated by consent** category by category. v1: GA4 Measurement
   Protocol receives a `waitlist_submit` event when analytics consent
   is granted. Future: Meta CAPI / TikTok Events receive `Lead` /
   `CompleteRegistration` when marketing consent is granted.
10. The browser-side `waitlist_submit` event (from gtag, later from
    GTM) and the server-side event share the same `event_id` and
    dedupe correctly in the relevant platform's events viewer.
11. Bumping `version` in `lib/consent/version.ts` re-prompts every
    returning user on next visit.
12. Lighthouse a11y score on the banner ≥ 95: no contrast issues,
    keyboard navigable, focus trap when modal open, ESC closes the
    modal.
13. Local dev (no env vars set) loads zero tracker scripts.

---

## 11. Out of scope

- Geolocation-based banner suppression. GDPR applies to controllers
  established in the EU regardless of visitor location. Banner always
  shows.
- Server-side consent inference for first-party cookies beyond
  Strapi auth.
- Browser-level GPC (Global Privacy Control) signal handling —
  acknowledge but defer.
- Per-country language switching beyond RO + EN.
- Marketing automation integrations (Mailchimp, Klaviyo, etc.) —
  separate epic.
- A/B testing platform (Optimize is dead; PostHog Experiments or
  GrowthBook are candidates) — separate epic.
- Customer Data Platform (Segment, RudderStack) — at scale, not v1.
- Deletion-on-request flow for GDPR Article 17 — separate
  data-subject-rights spec.
