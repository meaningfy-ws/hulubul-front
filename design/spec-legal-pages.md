# Spec — Legal pages as Strapi single-types

**Status:** Frontend ready (2026-05-14). Backend schema **not yet created.**
Owner: backend repo (separate). Until the single-types below are created and
populated, the frontend renders fallback copy from `lib/legal-fallback.ts`.

## Why

`/confidentialitate` and `/termeni` are legal copy. They must be edited
without code deploys, versioned by editorial owners, and the same source
should drive `gdprConsentVersion` (see `design/spec-consent.md`). Hardcoding
them in TSX has been the stopgap; this moves them to the CMS.

## Strapi schema

Two single-types, one per page. Same shape so they can share a frontend
fetcher and a future shared admin component if useful.

### `legal-confidentialitate` (single-type)

| Field             | Type     | Required | Notes                                                                                        |
|-------------------|----------|----------|----------------------------------------------------------------------------------------------|
| `slug`            | string   | yes      | Constant `"confidentialitate"`. Used by the frontend fetcher to assert the right entry.      |
| `title`           | string   | yes      | Displayed as `<h1>`, e.g. `"Politica de confidențialitate"`.                                  |
| `lastUpdated`     | string   | yes      | Human-readable RO date, e.g. `"23 aprilie 2026"`. Shown verbatim under the title.            |
| `body`            | richtext | yes      | Markdown. `##` for sections, inline `[text](url)` links allowed. No raw HTML.                |
| `metaDescription` | string   | no       | `<meta name="description">`. Falls back to a generic string if missing.                      |

API endpoint: `GET /api/legal-confidentialitate?status=published`.

### `legal-termeni` (single-type)

Same fields as above. `slug` is the constant `"termeni"`. Endpoint:
`GET /api/legal-termeni?status=published`.

## Frontend integration (already shipped)

- `lib/types.ts` defines `LegalPage`.
- `lib/strapi.ts` exposes `getLegalPage(slug)` which fetches the relevant
  endpoint, returns `null` on 404 (content type or entry missing), and
  throws on other failures.
- `app/(marketing)/confidentialitate/page.tsx` and `.../termeni/page.tsx`
  call `getLegalPage(...)` and fall back to `LEGAL_FALLBACK[slug]` from
  `lib/legal-fallback.ts` if the CMS returns null or errors.
- `MarkdownText` (already used by FAQ answers) renders the `body` field.

## Permissions

The `STRAPI_API_TOKEN` already used for `landing-page` and
`waitlist-submissions` must gain `find` permission on both new single-types.
No public read permission is needed — the frontend always proxies through
the token (see `lib/strapi.ts`).

## Migration / cutover

1. Backend creates the two single-types and grants the API token `find`.
2. Editor copies the current fallback text from `lib/legal-fallback.ts` into
   the matching Strapi entries and **publishes** them.
3. Verify on the deployed frontend that the pages now render the CMS body.
4. Delete `lib/legal-fallback.ts` and the fallback branch in both pages
   (the `try/catch` becomes a single `await` that throws on missing CMS).

## Out of scope

- A unified `legal-page` collection-type with a slug field. We can revisit
  if more legal pages appear (cookies, AUP, etc.); two single-types is
  simpler for the current set of two.
- Versioning across time. `lastUpdated` is a string, not a history. If we
  need a record of past versions, that's a separate change.
- Wiring `gdprConsentVersion` to a CMS field. Today it stays in
  `lib/gdpr-consent.ts`; future work can pull it from `legal-confidentialitate`.
