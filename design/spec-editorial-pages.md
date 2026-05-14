# Spec — Editorial pages as Strapi single-types

**Status:** Frontend ready. Backend schema **not yet created.**
Owner: backend repo (separate). Until the single-types below are created and
populated, the frontend renders fallback copy from `lib/editorial-fallback.ts`.

## Pages in scope

| URL                  | Slug                | Strapi single-type        | Purpose                |
|----------------------|---------------------|---------------------------|------------------------|
| `/confidentialitate` | `confidentialitate` | `page-confidentialitate`  | Privacy policy         |
| `/termeni`           | `termeni`           | `page-termeni`            | Terms and conditions   |
| `/despre-proiect`    | `despre-proiect`    | `page-despre-proiect`     | About the project      |

All three share the same shape and frontend renderer — adding more pages
later is a matter of (a) adding a slug to `EditorialPageSlug`, (b) creating
the Strapi single-type, (c) adding a thin page route and a fallback entry.

## Why

These pages must be edited without code deploys, by editorial owners. For
the legal pages, `gdprConsentVersion` (see `design/spec-consent.md`) should
eventually pull its value from this CMS source so the consent record always
matches the text the user actually saw. Hardcoding in TSX has been the
stopgap; this moves them to the CMS.

## Strapi schema (per single-type)

| Field             | Type     | Required | Notes                                                                                |
|-------------------|----------|----------|--------------------------------------------------------------------------------------|
| `slug`            | string   | yes      | Constant matching the URL slug. Used to assert the right entry.                      |
| `title`           | string   | yes      | Displayed as `<h1>`.                                                                 |
| `lastUpdated`     | string   | yes      | Human-readable RO date, e.g. `"23 aprilie 2026"`. Shown verbatim under the title.    |
| `body`            | richtext | yes      | Markdown. `##` for sections, inline `[text](url)` links allowed. No raw HTML.        |
| `metaDescription` | string   | no       | `<meta name="description">`. Falls back to a generic string when missing.            |

API endpoint: `GET /api/page-{slug}?status=published`.

## Frontend integration (shipped)

- `lib/types.ts` defines `EditorialPage` and `EditorialPageSlug`. `LegalPage`
  is a deprecated alias retained for any older imports.
- `lib/strapi.ts` exposes `getEditorialPage(slug)` which fetches
  `/api/page-{slug}`, returns `null` on 404 (content type or entry missing),
  and throws on other failures.
- `app/(marketing)/{confidentialitate,termeni,despre-proiect}/page.tsx` each
  call `getEditorialPage(...)` and fall back to `EDITORIAL_FALLBACK[slug]`
  from `lib/editorial-fallback.ts` when the CMS returns null or errors.
- `MarkdownText` (already used by FAQ answers) renders the `body` field.

## Permissions

The existing `STRAPI_API_TOKEN` (used for `landing-page` and
`waitlist-submissions`) must gain `find` permission on each new single-type.
No public/anonymous read permission is needed — the frontend always proxies
through the token (see `lib/strapi.ts`).

## Migration / cutover

1. Backend creates the three single-types (`page-confidentialitate`,
   `page-termeni`, `page-despre-proiect`) and grants the API token `find` on each.
2. Editor copies the fallback text from `lib/editorial-fallback.ts` into the
   matching Strapi entries and **publishes** them.
3. Verify on the deployed frontend that the pages render the CMS body.
4. Delete `lib/editorial-fallback.ts` and the fallback branch in each page
   (the `try/catch` becomes a single `await` that throws on missing CMS).

## Out of scope

- Collection-type with a `slug` field. We can revisit if many more pages
  appear; three single-types is simpler for now.
- Versioning across time. `lastUpdated` is a string, not a history. A real
  version log is a separate change.
- Wiring `gdprConsentVersion` to a CMS field. Today it stays in
  `lib/gdpr-consent.ts`; future work can pull it from `page-confidentialitate`.
