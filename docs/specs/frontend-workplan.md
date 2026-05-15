# Frontend work plan — editorial CMS, multi-registration, i18n display

Consolidated, implementation-ready spec for `hulubul-front`, coordinated with
the merged Strapi backend (`main`: PRs #7–#9). Supersedes
`editorial-blocks-and-multi-registration.md`.

Standing rules: TDD (vitest), small PRs, no change to the *clean* live
landing-page copy.

Workstreams: **A** and **B** are required for correctness, **D** is the
"display later" i18n half, **C** is optional cleanup.

---

## FE-A — Editorial pages: adapt to the shipped Strapi contract (REQUIRED)

Backend `page-*` shipped with `body: blocks`, `lastUpdated: date (ISO)`, and
`seo` as the `shared.seo` component (same as `landing-page`). The FE assumed
markdown + flat fields.

1. **`lib/types.ts`** — `EditorialPage`: `body: BlocksContent`;
   `lastUpdated: string` (ISO); replace flat `metaDescription?` with
   `seo?: { metaTitle?: string; metaDescription?: string; shareImage?: Media }`
   (reuse existing landing `Seo`/`Media` types — do not redefine).
2. **`lib/strapi.ts` `getEditorialPage`** — 🔴 hard fix: Strapi 5 does not
   populate components by default. Add
   `?status=published&populate[seo][populate][0]=shareImage`
   (mirror `buildLandingPopulate`). Without this `seo` is absent and
   metadata silently breaks.
3. **`components/editorial/EditorialPageView.tsx`** — render `body` with the
   blocks renderer (not `<MarkdownText>`); `makeEditorialMetadata` reads
   `page.seo.*`; format `lastUpdated` ISO → RO (`"15 mai 2026"`) via one
   tested helper.
4. **Dependency (D2, locked):** add `@strapi/blocks-react-renderer`; wrap in
   a thin local component so it is swappable.
5. **`lib/editorial-fallback.ts` (D1, locked — dual-render):** keep fallback
   content as-is; the view detects shape — string body → `<MarkdownText>`,
   `BlocksContent` → blocks renderer; flat vs `seo`; free-text vs ISO date.
   Fallback remains the safety net on fetch failure.
6. **FE-4 (title suffix):** already resolved by `pageTitle()` dedupe — no
   change.

Tests: blocks vs markdown branch; `seo.*` metadata mapping; ISO→RO date;
fallback path on fetch error.
Backend coordination: none code-wise; 4 `page-*` must be published + token
has `find` (see backend `docs/DEPLOY-RUNBOOK.md`). Dual-render covers the gap
until then.

---

## FE-B — Multi-registration: relax the soft-dedupe (REQUIRED)

Business rule (Andrei): one email may register multiple times for different
children/routes. Backend already allows it (email not unique, no lifecycle
uniqueness). The only gate is the FE soft-dedupe.

1. **`lib/strapi.ts` `findWaitlistByEmail` + caller** — change from
   "email exists → block" to **block only if an existing row has the same
   `email` AND same `role` AND same set of `cities`** (order-insensitive).
   Otherwise allow. Keep the soft, non-error UX and the existing
   401/403 → `AUTH_MISCONFIG` classification untouched.
2. Dedupe query reads comparison fields:
   `filters[email][$eqi]=…&fields[0]=role&fields[1]=cities&fields[2]=createdAt`.

Tests (TDD): same email+role+cities → blocked; different role → allowed;
different/reordered/superset cities → allowed; unseen email → allowed;
401/403 → still `AUTH_MISCONFIG`.
Backend coordination: still needs token `find`+`create`. Do **not** add a
backend uniqueness rule — dedupe stays single-sourced in the FE.

---

## FE-C — Consent re-stamp cleanup (OPTIONAL, low priority)

Backend widened the `gdprConsentAt` window 1h → 24h. In `SignupForm`, drop
the submit-time re-stamp; stamp once at consent, keep `≤ now`. Not breaking;
do only if touching that code.

---

## FE-D — i18n display (NEW — the "display later" half)

Backend is fully translation-ready (per-field localized); `en` is being
added in the Strapi admin. Default backend locale = `ro` (pinned via
`STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE=ro`). The site won't show translations
until the FE consumes locales.

1. **Locale model:** supported `['ro','en']`, default/fallback `ro`. No
   `locale` param ⇒ Strapi returns `ro`.
2. **Routing:** add a locale segment; `ro` stays the **unprefixed default**
   (`hulubul.com/...` = ro, `hulubul.com/en/...` = en) to preserve current
   URLs/SEO. Add `hreflang` alternates + correct `<html lang>`.
3. **Data layer (`lib/strapi.ts`):** thread optional `locale` through
   `getLandingPage` and `getEditorialPage` → append `&locale=<code>`. On a
   non-`ro` fetch returning empty/404, **fall back to `ro`** (Strapi has no
   auto-fallback) so a partially-translated site never shows blanks.
4. **SEO:** per-locale `seo.*` already from Strapi; emit per-locale metadata
   + JSON-LD + sitemap entries; canonical points to the locale variant.
5. Editorial dual-render still applies per locale.

Tests: locale threaded into both fetchers; missing `en` entry falls back to
`ro`; routing renders correct locale; default route stays unprefixed `ro`.
Backend coordination: none — purely consuming. Re-seeding writes only the
`ro` default locale, so authored translations are never clobbered.

---

## Suggested PR sequence

1. **FE-A** — editorial CMS rendering (independent).
2. **FE-B** — multi-registration rule (independent of A).
3. **FE-D** — i18n display (after A; builds on the fetchers A touches).
4. **FE-C** — anytime, optional.

## Hard deploy ordering

Backend live (token grant + migrations + `en` locale +
`STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE=ro`) → **then** FE deploy of A/B/D.
Out of order: editorial falls back safely; waitlist hard-fails until the
token has `waitlist-submission.find`.
