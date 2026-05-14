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

1. **One hub** for client-side tags (Google Tag Manager). Adding a new
   pixel is a UI change in the GTM container, not a code change.
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
│  Browser                                                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  app/layout.tsx                                          │    │
│  │    <ConsentProvider>                                     │    │
│  │      <ConsentBanner />     ← vanilla-cookieconsent       │    │
│  │      <Analytics />         ← reads consent, gates GTM    │    │
│  │      {children}                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│           │                                                      │
│           ▼ (only if marketing consent === "granted")            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Google Tag Manager container (GTM-XXXX)                 │    │
│  │  Tags configured in GTM UI (no code):                    │    │
│  │    ├─ GA4 Configuration                                  │    │
│  │    ├─ GA4 events (page_view, scroll, click)              │    │
│  │    ├─ Meta Pixel (PageView + custom)                     │    │
│  │    ├─ TikTok Pixel (Pageview + custom)                   │    │
│  │    └─ (future) LinkedIn Insight                          │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────┬────────────────────────────────────────────────────────────┘
      │
      │ form submit
      ▼
┌──────────────────────────────────────────────────────────────────┐
│  Next.js Route Handler  app/api/{waitlist,survey}/route.ts       │
│    1. Validate body (Zod)                                        │
│    2. Forward to Strapi                                          │
│    3. Fire server-side conversions in parallel:                  │
│         ├─ Meta CAPI                                             │
│         ├─ TikTok Events API                                     │
│         └─ GA4 Measurement Protocol                              │
└──────┬─────────────────────────┬─────────────────────────────────┘
       │                         │
       ▼                         ▼
┌──────────────────┐   ┌────────────────────────────────────────────┐
│  Strapi          │   │  External tracking endpoints                │
│  - waitlist      │   │  graph.facebook.com, business-api.tiktok... │
│  - survey-sender │   │                                              │
│  - consent-record│   │                                              │
└──────────────────┘   └────────────────────────────────────────────┘
```

---

## 3. Library choices

### 3.1 Tag hub — `@next/third-parties/google` (already installed)

Already in repo via `@next/third-parties` (used today for
`<GoogleAnalytics>`). After this spec ships, we replace
`<GoogleAnalytics>` with `<GoogleTagManager>` from the same package.

- Official Next.js wrapper. Lazy-loaded, performance-tuned.
- One env var (`NEXT_PUBLIC_GTM_ID`) and the rest is configured in the
  GTM web UI — no React code changes per pixel.
- Survives provider swaps (e.g. moving from GTM Web to a server-side
  GTM later) with one config flip.

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
| `analytics.js` (DavidWells) | Plugin abstraction over GA/Mixpanel/Segment. Useful for code-level event taxonomy that survives platform swaps. Adds a layer; revisit if we move beyond GTM. |
| Roll-your-own banner | Doable per `design/spec-consent.md`. ~1 day of work. Choose only if `vanilla-cookieconsent` becomes a problem. |

---

## 4. Consent layer

### 4.1 Categories

| Category | Default | Withdrawable | What it gates |
|---|---|---|---|
| **Necessary** | granted (forced) | no | Strapi auth, CSRF, session cookies. Nothing tracker-side. |
| **Analytics** | denied | yes | GA4, Lighthouse RUM, future PostHog. First-party-flavoured measurement. |
| **Marketing** | denied | yes | Meta Pixel, TikTok Pixel, LinkedIn Insight, GTM marketing tags, retargeting. |

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
   - Reloads the page after a 200ms delay so any GTM-loaded scripts
     drop out cleanly. (In-place teardown of GTM is fragile.)

A "Withdraw all" button in the modal sets all categories to denied,
posts `event: "withdraw"`, and reloads.

### 4.6 Google Consent Mode v2

Required by Google for any GA4 / Google Ads tag from March 2024
onward. Pushed to the GTM `dataLayer` whenever consent changes:

```ts
window.dataLayer.push({
  event: "consent_update",
  ad_storage: state.marketing === "granted" ? "granted" : "denied",
  analytics_storage: state.analytics === "granted" ? "granted" : "denied",
  ad_user_data: state.marketing === "granted" ? "granted" : "denied",
  ad_personalization: state.marketing === "granted" ? "granted" : "denied",
});
```

Default state pushed **before** GTM loads (in the inline
`<head>` script that vanilla-cookieconsent emits) is "denied"
across the board, so even partial loads stay compliant.

---

## 5. Tag plan inside GTM

GTM is the **only** tracker we hardcode in React. Everything else lives
in the GTM container, configured via the GTM UI by whoever owns
marketing.

### 5.1 Initial tag set

| Tag | Trigger | Consent gate |
|---|---|---|
| GA4 Configuration | All pages | analytics |
| GA4 — `page_view` | Built-in | analytics |
| GA4 — `scroll` (50%, 75%, 90%) | Scroll trigger | analytics |
| GA4 — `cwv` (LCP/INP/CLS) | Custom event from Web Vitals reporter | analytics |
| GA4 — `consent_grant` / `consent_update` / `consent_withdraw` | Banner events | analytics |
| GA4 — `waitlist_submit` | Custom event after form success | analytics |
| GA4 — `survey_submit` | Custom event after form success | analytics |
| Meta Pixel base | All pages | marketing |
| Meta Pixel — `Lead` | Custom event after waitlist success | marketing |
| TikTok Pixel base | All pages | marketing |
| TikTok Pixel — `CompleteRegistration` | Custom event after waitlist success | marketing |

### 5.2 Custom events from React

Two helpers in `lib/tracking/events.ts`:

```ts
export function trackWaitlistSubmit(role: WaitlistRole, source: string) {
  window.dataLayer?.push({ event: "waitlist_submit", role, source });
}

export function trackSurveySubmit(role: SurveyRole, source: string) {
  window.dataLayer?.push({ event: "survey_submit", role, source });
}
```

These are called from the form components after a successful POST.
Pushing to `dataLayer` is no-op when GTM isn't loaded (consent denied)
— the array exists from a stub in `<ConsentProvider>`, fanning into
nothing.

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

GA4 / Meta / TikTok all support a `event_id` field used to deduplicate
the server-side event with its browser-side twin. The Next.js route
handler generates a UUID per submission and:
- Returns it in the response so the form can echo it to GTM.
- Includes it in the server-side payload.

GTM tags include the `event_id` in their data; the platforms dedupe.

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

| Var | Owner | Where it's read | Required? |
|---|---|---|---|
| `NEXT_PUBLIC_GTM_ID` | Marketing | `<Analytics>` | Yes (prod) |
| `NEXT_PUBLIC_GA_ID` | Marketing | (only if GTM not used) | No — prefer GTM |
| `NEXT_PUBLIC_META_PIXEL_ID` | Marketing | (only if not in GTM) | No — prefer GTM |
| `META_CAPI_PIXEL_ID` | Marketing | `lib/server-events/meta.ts` | For server-side |
| `META_CAPI_ACCESS_TOKEN` | Marketing | `lib/server-events/meta.ts` | For server-side |
| `TIKTOK_PIXEL_ID` | Marketing | `lib/server-events/tiktok.ts` | For server-side |
| `TIKTOK_EVENTS_TOKEN` | Marketing | `lib/server-events/tiktok.ts` | For server-side |
| `GA4_MEASUREMENT_ID` | Marketing | `lib/server-events/ga4.ts` | For server-side |
| `GA4_API_SECRET` | Marketing | `lib/server-events/ga4.ts` | For server-side |
| `GOOGLE_SITE_VERIFICATION` | Marketing | root metadata | Optional |
| `BING_SITE_VERIFICATION` | Marketing | root metadata | Optional |

Local dev: leave all of these unset → no tracker fires. CI: set in the
preview-env config but pointed at a separate GTM container so previews
don't pollute prod analytics.

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

1. First-time visitor sees the banner; **no GTM/GA/pixel script is
   loaded** in the page until they consent.
2. "Reject non-essential" is a one-click action; nothing tracker-side
   loads thereafter.
3. "Accept all" loads GTM; GA4 fires; Meta/TikTok pixels fire from
   inside GTM; Consent Mode v2 dataLayer push matches `granted` for
   both `ad_storage` and `analytics_storage`.
4. After consent, refreshing the page does not re-show the banner.
5. Clicking "Cookies" in the footer re-opens the preferences modal
   pre-populated with current state.
6. Withdrawing consent reloads the page; tracker scripts are absent
   from the DOM after reload.
7. Each consent action results in a Strapi `consent-record` row with
   the right `event` value.
8. A waitlist submission made after consent has its `consentRecord`
   relation populated (when the optional relation ships).
9. A waitlist submission triggers server-side `Lead` events to Meta
   CAPI / TikTok Events / GA4 MP, **gated by consent** category by
   category.
10. The browser-side `Lead` event (from GTM) and the server-side
    `Lead` event share the same `event_id` and dedupe correctly in
    Meta Events Manager.
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
