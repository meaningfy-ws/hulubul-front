# Consent Layer — Spec (epic, not yet implemented)

> **Status:** Spec only — implementation deferred until after analytics + waitlist v2 ship.
> **Date:** 2026-04-27
> **Scope:** A user-facing cookie/tracking consent banner that gates third-party analytics
> (Google Analytics 4, Meta Pixel, LinkedIn Insight Tag, and any future tracker) behind
> explicit opt-in, per GDPR/ePrivacy.
> **Companion docs:** `design/spec-waitlist-frontend.md` (the waitlist-form GDPR consent
> is a *separate* artifact — see §2).

---

## 1. Goal

Before any third-party analytics or marketing pixel fires in the user's browser, the user
must have explicitly granted consent for the matching category. The banner:

- shows on first visit (and again if the consent text version changes),
- offers per-category granularity (Necessary always-on; Analytics and Marketing opt-in),
- persists the choice in `localStorage`,
- exposes a "Modifică preferințele" link in the footer for re-opening,
- emits a typed event so analytics modules can lazy-load when (and only when) granted.

**Definition of done:**

- No GA4, Meta Pixel, LinkedIn Insight, or any future tracker script is loaded in the page
  unless `consent.analytics === "granted"` (for GA4/LinkedIn) or
  `consent.marketing === "granted"` (for Meta Pixel).
- The banner is reachable, dismissible, and accessible (keyboard + screen reader).
- Choices survive refresh, persist for at least 12 months, and re-prompt when the consent
  text version changes.
- A small audit log (just a row in `localStorage`) records the chosen categories + timestamp
  + version, mirroring what the waitlist captures via `gdprConsent*`.

---

## 2. Relationship to the waitlist GDPR field

The waitlist form has its **own** GDPR consent checkbox (`gdprConsent` + `gdprConsentAt` +
`gdprConsentVersion`) — see `design/spec-waitlist-frontend.md` §3.9. That is **purpose-bound
consent for processing personal data** (email, name, etc.) so we can contact the user for
the launch announcement. It is a different artifact from this consent banner:

| Consent | Purpose | Storage | UX |
|---|---|---|---|
| Waitlist tickbox | "I agree you process my contact info to email me about launch" | Persisted server-side per submission | Required at submit time |
| Consent banner (this spec) | "I agree you can load tracking scripts in my browser" | localStorage | Per-session opt-in, granular, re-prompt-able |

Both must coexist. Granting the banner does not auto-tick the waitlist box, and vice versa.

---

## 3. Library choice

Recommended: **[Klaro](https://github.com/klaro-org/klaro-js)** (open-source, EU-built,
self-hosted, no per-pageview cost). Alternative: **iubenda** (commercial, broader
compliance coverage, paid).

Reasons for Klaro:

- Plain JS, ~30 kB gzip, no React-specific quirks.
- Configurable per-tracker (one entry per pixel) with click-to-accept granularity.
- Honours Do-Not-Track and Global Privacy Control out of the box.
- Self-hosted — no third-party server sees the user's choices.
- MIT license, EU governance.

iubenda is the right pick if the team wants a managed compliance dashboard, multi-language
templates, and ToS/Privacy generation in one. Pay-per-month.

**Decision deferred** to implementation time — both work; pick when the engineer touches
this.

---

## 4. Categories

| Category | Always on | Members |
|---|---|---|
| Necessary | ✓ | Session cookies, CSRF, the waitlist's own form state. |
| Analytics | – | Google Analytics 4 (`gtag.js`), eventual Plausible/Matomo. |
| Marketing | – | Meta Pixel (`fbq`), LinkedIn Insight Tag (`_lipt`), TikTok pixel, etc. |
| Preferences | – | Theme, language, remember-me — currently small enough to live under Necessary; promote if it grows. |

The waitlist form's own remember-me checkbox is **not gated** by the banner — it stores
local-only data with the user's explicit per-form opt-in. Same for the GDPR tickbox
itself.

---

## 5. Architecture (when implemented)

```
app/layout.tsx
  └─ <ConsentProvider>          ← reads localStorage, exposes hook
       ├─ <ConsentBanner />     ← shown when no choice yet OR version stale
       └─ <Analytics />         ← only renders pixels whose category is granted
```

- `ConsentProvider` reads `localStorage["hulubul:consent"]` on mount, parses, and exposes
  `{ analytics: "granted"|"denied", marketing: "granted"|"denied", version, choseAt }` via
  a React context.
- `ConsentBanner` shows on first visit. Three primary actions: "Acceptă tot", "Doar
  necesare", "Personalizează" (opens a per-category panel).
- `Analytics` (the component built in the analytics PR) reads the context. For each pixel,
  it renders the `<Script>` tag *only* when the category is granted. When the user toggles
  off, scripts unmount (page reload required for full unload — document that in the
  banner's "modifică preferințele" copy).

---

## 6. Persistence shape

```ts
interface ConsentRecord {
  necessary: "granted";       // always
  analytics: "granted" | "denied";
  marketing: "granted" | "denied";
  version: string;            // mirrors GDPR_CONSENT_VERSION naming
  choseAt: string;            // ISO timestamp
}
```

Stored at `localStorage["hulubul:consent"]`. When `version` differs from the current
build's `CONSENT_BANNER_VERSION` constant, the banner re-prompts.

---

## 7. Stories

### STORY 1 — Pick library (Klaro vs iubenda)
30-minute spike: install both into a scratch branch, evaluate UX, pick one.

### STORY 2 — `ConsentProvider` + storage
Read/write `hulubul:consent`. Re-prompt on version change. Unit-tested.

### STORY 3 — `ConsentBanner` UI
Three CTAs + per-category toggle panel + accessibility (focus trap, ESC, screen reader).

### STORY 4 — Wire the existing `<Analytics />` (from analytics PR) behind consent
Each pixel reads the consent context; renders only when its category is granted.

### STORY 5 — Footer "Modifică preferințele" link
Re-opens the banner.

### STORY 6 — Audit log
Persist consent record alongside the waitlist `gdprConsent*` for parity in admin.

### STORY 7 — Documentation
Update `design/strapi-runbook.md` and add a `docs/privacy-pixels.md` listing every tracker,
its category, and the env var that enables it.

---

## 8. Out of scope

- A consent management dashboard for the team (use the chosen library's admin if any).
- Cookie scanning / auto-categorisation (manual config is fine for our small tracker set).
- Geo-fencing the banner (show only in EU). We treat all visitors as if EU rules apply.
- ToS/Privacy text generation. The privacy page already exists.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Pixels fire before banner ships → compliance gap. | Until this epic ships, **do not set production env vars** for the analytics pixels. Code is in place; pixels stay dark in prod. |
| User chooses "Doar necesare" → analytics dashboards underreport. | Document this in the analytics report descriptions; do not "remind" users to opt in. |
| Banner blocks LCP. | Render banner *after* hydration with `priority="low"`; it's a small DOM. |
| Granted state goes stale (user changes their mind). | "Modifică preferințele" footer link is the recovery; document it in the banner copy. |

---

*End of spec.*
