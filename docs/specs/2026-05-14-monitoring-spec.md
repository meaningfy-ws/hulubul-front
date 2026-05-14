# Monitoring & observability specification — hulubul.com

**Date:** 2026-05-14
**Status:** Spec only. Implementation plan ships separately.
**Scope:** Knowing when the site is broken, why it's broken, and how
real users experience it. Excludes business analytics (covered by the
Tracking + Consent spec).

---

## 1. Goals

1. **Mean time to detect a production incident < 5 min.**
2. **Stack traces with source-mapped locations** for every uncaught
   error, both client and server.
3. **Real-user Web Vitals** (LCP, INP, CLS, TTFB, FCP) per route,
   per device class, in a queryable form.
4. **Uptime visibility** for the public site, the Strapi backend, and
   each Strapi content-type endpoint we depend on.
5. **Structured logs** for every server-side route handler, with
   request id traceable end-to-end.
6. **Cost ceiling: free or near-free for v1** (≤ €20/month), with a
   clear scaling path when traffic grows.

Out of scope for v1: distributed tracing, log retention beyond 30
days, on-call rotation tooling.

---

## 2. Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  User browser                                                    │
│    ├─ JS errors / unhandled rejections   ──┐                     │
│    ├─ React error boundaries              │                     │
│    ├─ Web Vitals (RUM)                    │                     │
│    └─ Console warnings (dev-only)         │                     │
└──────────────────────────────────────────┼──────────────────────┘
                                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Sentry (browser SDK)                                            │
│    ├─ source-mapped stack traces                                 │
│    ├─ session replay (sampled, redacted)                         │
│    └─ performance traces                                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Next.js server (route handlers + RSC)                           │
│    ├─ console.error → lib/logger.ts                              │
│    ├─ unhandled errors → Sentry server SDK                       │
│    └─ structured logs → stdout (captured by host)                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Synthetic uptime (external)                                     │
│    UptimeRobot or BetterStack — checks /, /sondaj/expeditori,    │
│    /api/health, api.hulubul.com/api/landing-page                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Library choices

### 3.1 Error tracking + RUM — **Sentry**

Recommended: **`@sentry/nextjs`** (official Next.js integration).

- Free tier: 5k errors/month, 10k performance events, 50 session
  replays. Comfortable for v1 at expected traffic.
- App Router-native (instruments Server Components, route handlers,
  Server Actions).
- Source maps uploaded automatically via the Sentry CLI hooked into
  the Next.js build.
- Browser + Node SDKs share one project DSN.
- Session replay is gated on consent (see §4 below).

**Considered alternatives:**

| Tool | Verdict |
|---|---|
| **PostHog** (self-hosted or cloud) | Combines product analytics + session replay + error tracking + experiments in one. Worth it if we also adopt it for analytics. Adds a second tool alongside GA4. Reconsider in 6 months. |
| **Datadog RUM** | Strong, expensive (~$15/host/month + RUM seats). Pick when we have a paying ops team. |
| **Highlight.io** | Promising OSS competitor to Sentry. Smaller ecosystem, fewer integrations. Acceptable backup if Sentry pricing ever changes. |
| **Bugsnag / Rollbar / Honeybadger** | Mature but lower mind-share than Sentry today. No clear advantage. |

### 3.2 Web Vitals — **`web-vitals` v4** (or `next/web-vitals`)

`next/web-vitals` provides a Next.js-native `useReportWebVitals` hook
exporting LCP, INP, CLS, TTFB, FCP. Reported through two channels:

- **GTM `dataLayer.push({event: "cwv", ...})`** — forwarded to GA4 if
  the user granted analytics consent.
- **Sentry SDK** — independent of consent; Sentry receives anonymised
  performance traces in all cases (Sentry contractually doesn't sell
  data, see §4 for the consent posture).

### 3.3 Synthetic uptime — **UptimeRobot** (free)

- 50 monitors / 5-minute checks free.
- Email + Slack + Telegram notifications.
- Status page on `status.hulubul.com` (subdomain pointing at
  UptimeRobot's hosted page).

**Considered alternatives:** BetterStack (free 10 monitors), Pingdom
(paid), Healthchecks.io (cron monitoring, complementary not
substitutable). UptimeRobot is the simplest free option.

### 3.4 Logs

Next.js stdout is captured by the host (Vercel / our Hetzner / Fly /
…). For v1, **don't ship a log shipper.** Tail logs from the host UI
when investigating. Add Loki / Logtail / Axiom in a later epic when
volume justifies it.

---

## 4. Sentry consent posture

Sentry collects:
- Stack traces (no PII).
- URL of the page (no query strings — stripped via `tracesSampler`).
- Browser name / version, OS.
- (Optional) Session replay — **redacted by default**: all text is
  masked, all inputs are masked, all media is blocked.

Per Sentry's own DPA + the EU Data Protection Board's clarification on
"strictly necessary" under ePrivacy Art. 5(3):

- **Error tracking is "strictly necessary"** for the operation of the
  service the user requested. It does **not** require explicit consent.
- **Session replay is not "strictly necessary"** and is gated behind
  *analytics* consent.

Implementation:

```ts
// lib/sentry/init.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,        // off by default
  replaysOnErrorSampleRate: 0,        // off by default
  beforeSend(event) {
    return scrubPII(event);
  },
});

// Toggled when consent changes:
export function enableReplayIfConsented(analytics: "granted" | "denied") {
  if (analytics === "granted") {
    Sentry.getClient()?.getOptions().replaysSessionSampleRate = 0.1;
    Sentry.getClient()?.getOptions().replaysOnErrorSampleRate = 1.0;
  }
}
```

`scrubPII` strips emails, phone numbers, names from the event body
using a regex whitelist. Defense in depth even with the masked replay.

---

## 5. Health endpoint

`app/api/health/route.ts` — small JSON endpoint UptimeRobot polls.

```ts
GET /api/health
→ 200 { status: "ok", strapi: "up", commit: "<sha>", uptime: <s> }
→ 503 { status: "degraded", strapi: "down", commit: "<sha>" }
```

Checks:
- `strapi`: a 1-second-timeout GET to
  `${STRAPI}/api/landing-page?status=published&pagination[pageSize]=0`.
  If it fails or 5xx, set `strapi: "down"` and return 503.
- `commit`: `process.env.NEXT_PUBLIC_BUILD_SHA` injected by CI.

UptimeRobot polls every 5 minutes; alerts on 2 consecutive 503s.

---

## 6. Synthetic uptime monitors

| Monitor | URL | Expected | Frequency |
|---|---|---|---|
| Site root | `https://hulubul.com/` | 200, < 3s | 5 min |
| Sender survey | `https://hulubul.com/sondaj/expeditori` | 200, < 3s | 15 min |
| Routes page | `https://hulubul.com/rute` | 200, < 3s | 15 min |
| Health endpoint | `https://hulubul.com/api/health` | 200, body contains `"status":"ok"` | 5 min |
| Strapi landing | `https://api.hulubul.com/api/landing-page` (with token) | 200 | 5 min |
| SSL expiry | `https://hulubul.com/` | cert valid > 14 days | daily |

Notifications: Slack `#hulubul-alerts` (when channel exists) + email
to the team distribution list. No paging at v1; an outage at 3am can
wait until morning.

---

## 7. Structured logging (server-side)

`lib/logger.ts` (already exists) emits `[scope] message` lines. Two
enrichments to add:

1. **Request ID:** every route handler reads `x-request-id` (or
   generates a UUID) and threads it through `logger.error(scope, msg,
   { error, requestId })`. Correlates a user's bad submission with
   server logs.
2. **Structured JSON output in production:** when
   `process.env.NODE_ENV === "production"`, `logger.error` emits
   newline-delimited JSON (`{ "level": "error", "scope": "...",
   "msg": "...", "ts": "...", "requestId": "..." }`) so the host's
   log search works.

Frontend `console.error` calls were eliminated by the L1 refactor in
PR #10 — all logging already goes through this module.

---

## 8. Performance budgets enforcement

Already specified in the SEO spec §6.1 (Lighthouse CI). Monitoring
adds the **runtime side**:

- Web Vitals per route, per device, queryable in GA4 via
  `looker studio` or directly in the GA4 explorer.
- Sentry's Performance tab shows P75 LCP / INP / CLS per transaction
  name, regression-aware.
- Alert when P75 LCP for `/` exceeds 4s for 24h (Sentry alert rule).

---

## 9. Backend interlinking

**No required backend changes.** Monitoring is a frontend + ops
concern. Two optional touchpoints:

| Optional | What | Why |
|---|---|---|
| Strapi exposes a `health` endpoint | Replace the 1-second probe in `/api/health` with a dedicated `${STRAPI}/health` that doesn't hit the DB | Faster, cheaper. |
| Strapi error logs forwarded to Sentry | Use `@sentry/node` in the Strapi process | Single dashboard for both repos' errors. Coordinate with backend team. |

If neither happens, the spec still works — the frontend probe in §5
covers Strapi liveness adequately.

---

## 10. Environment variables

| Var | Owner | Where it's read |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Ops | `lib/sentry/init.ts` (browser + server) |
| `SENTRY_AUTH_TOKEN` | Ops | CI (build step uploads source maps) |
| `SENTRY_ORG` | Ops | CI |
| `SENTRY_PROJECT` | Ops | CI |
| `NEXT_PUBLIC_BUILD_SHA` | CI | Injected at build, surfaced in `/api/health` |

Local dev: leave `SENTRY_DSN` unset → SDK no-ops. CI sets it for
preview deploys, pointing at a separate Sentry project so previews
don't pollute production error counts.

---

## 11. Acceptance

The monitoring work is done when:

1. A deliberately thrown error in `/sondaj/expeditori` shows up in
   Sentry within 30 seconds, with a source-mapped stack trace pointing
   at the offending file:line.
2. Same error appears in the Sentry server project when triggered
   from a route handler.
3. `GET /api/health` returns 200 with `{status: "ok", strapi: "up"}`
   when Strapi is reachable.
4. Stopping Strapi makes `/api/health` return 503 within 1s (the
   probe timeout).
5. UptimeRobot is configured with all monitors from §6 and reports
   green for 24 hours straight.
6. Web Vitals data appears in GA4 (when consent is granted) under the
   `cwv` event name.
7. Sentry Performance tab shows P50 / P75 / P95 LCP per route after
   one day of traffic.
8. A consent-denied user generates **zero** session replay events but
   **does** generate error events.
9. PII (emails, phone numbers, names) does not appear in any Sentry
   event body — verified by submitting a test waitlist with traceable
   strings and inspecting the captured event.
10. Bringing the site down for 1 minute generates a Slack /
    email alert from UptimeRobot within 10 minutes.

---

## 12. Out of scope

- Distributed tracing across frontend ↔ Strapi ↔ DB (OpenTelemetry).
  Defer until we have multiple services worth correlating.
- Long-term log retention. Host-default 30 days is fine.
- On-call paging (PagerDuty / Opsgenie). Manual response at v1.
- Custom RUM dashboard. Use Sentry + GA4 native UIs.
- Anomaly detection / ML-based alerting. Threshold alerts only.
- Real-user crash counts segmented by browser version. Sentry shows
  this natively; no extra work.
- Cost monitoring / FinOps. Add when we have multiple paid services.
