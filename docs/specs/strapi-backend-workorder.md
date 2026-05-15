# Strapi backend — work order (editorial pages + waitlist dedupe)

Status: editorial content types are **not deployed** on the live Strapi
(`/api/page-*` → 404 on published *and* draft; `landing-page` is 200).
The frontend already shipped (`main`, PRs #18/#20) consuming the exact
shape below — **the contract is final; do not change the schema shape**.

Companion artifact: `docs/specs/editorial-seed.blocks.json` — the four
pages as ready-to-import Strapi 5 records (ro), body already converted to
Blocks. Regenerate with `node scripts/editorial-seed/generate.ts`.

---

## 0. Frontend contract (LOCKED)

`getEditorialPage` calls exactly:

```
GET /api/page-{slug}?status=published&populate[seo][populate][0]=shareImage
```

Expected Strapi-5 flattened response:

```jsonc
{ "data": { "title": "string",
            "body": [ /* Blocks */ ],
            "lastUpdated": "2026-05-14",         // date (ISO)
            "seo": { "metaTitle": "string",
                     "metaDescription": "string",
                     "shareImage": null | { "url": "…" } } } }
```

So, non-negotiable field types:
- `body` → **Blocks** field (`type: "blocks"`) — NOT richtext/markdown/text.
- `lastUpdated` → **`date`**.
- `seo` → the **existing `shared.seo` component** (the same one
  `landing-page` already uses live: `metaTitle, metaDescription,
  shareImage`).
- `title` → `string`.

Slugs (exactly): `confidentialitate`, `termeni`, `despre-proiect`,
`pentru-transportatori`.

## 1. Commit + deploy (the blocker)

The backend agent implemented these but did **not commit**. Commit and
deploy, verifying each against §0:

1. **4 single types** `src/api/page-{slug}/**`:
   - `kind: "singleType"`, `singularName: "page-{slug}"` → route
     `/api/page-{slug}`.
   - `options.draftAndPublish: true`.
   - `pluginOptions.i18n.localized: true` (content-type **and** per
     field).
   - Attributes: `title` string·required·localized; `body`
     **blocks**·required·localized; `lastUpdated` **date**·required·
     localized; `seo` component `shared.seo`·localized.
2. **Waitlist lifecycle**: consent-freshness window 1h → 24h, keep the
   future-timestamp guard (`waitlist-submission/.../lifecycles.js`).
3. **DB migration**: non-unique indexes on
   `waitlist_submissions.email` + `created_at`. **No unique constraint
   on `email`** — multi-registration (PR #20) requires duplicates that
   differ by role or cities.
4. Permission bootstrap for the Authenticated role (codified) — but the
   live frontend uses a **custom token**, not that role → see §3.

## 2. i18n

- Default locale **`ro`** (frontend sends no `locale` → must default to
  `ro`).
- Add **`en`**; do **not** create/publish `en` entries yet (frontend
  i18n epic is later).

## 3. 🔴 Permissions — real deploy blocker (manual, live Strapi)

The deployed frontend authenticates with a **custom API token**, not the
Authenticated role; the codified bootstrap does not cover it. In **Admin
→ Settings → API Tokens →** that token, grant:

| Content type | Actions |
|---|---|
| `page-confidentialitate`, `page-termeni`, `page-despre-proiect`, `page-pentru-transportatori` | **find** |
| `landing-page` | **find** (already OK — 200 live) |
| `waitlist-submission` | **find** + **create** |

`waitlist-submission.find` is required by PR #16/#20
(`findDuplicateRegistration` →
`GET /api/waitlist-submissions?filters[email][$eqi]=…&fields=createdAt,role,cities`).
Ensure `role` and `cities` are **readable scalar/JSON attributes**
(returned via `fields[]`); if `cities` is a component/relation the
dedupe silently fails open. Public/anon role: **no access** to
`waitlist-submission` (PII).

## 4. Content population

Import `docs/specs/editorial-seed.blocks.json` (4 records, `ro`). Each:
`title`, `body` (Blocks), `lastUpdated` (ISO date), `seo.metaTitle`
(**no `— hulubul.com` suffix** — the frontend brands it),
`seo.metaDescription`. **Publish** each. Until published the frontend
serves the identical build-time fallback, so this is non-breaking.

## 5. ⚠️ Confirm the environment first

Provided env points at `steadfast-bell-…strapiapp.com`, but the deployed
site talks to **`api.hulubul.com`**. Confirm these are the same Strapi
Cloud project (custom domain) or two environments. If separate, §1/§3/§4
must be applied to whichever instance `api.hulubul.com` resolves to, or
production won't see any of it.

## 6. Verification (post-deploy; matches the frontend byte-for-byte)

```
curl -H "Authorization: Bearer <TOKEN>" \
 "$STRAPI/api/page-confidentialitate?status=published&populate[seo][populate][0]=shareImage"
# → 200 + {data:{title, body:[blocks], lastUpdated, seo:{…}}}
# repeat: termeni, despre-proiect, pentru-transportatori

curl -H "Authorization: Bearer <TOKEN>" \
 "$STRAPI/api/waitlist-submissions?filters[email][\$eqi]=x@y.z&fields[0]=createdAt&fields[1]=role&fields[2]=cities"
# → 200 (NOT 401/403)
```
Then `hulubul.com/{confidentialitate,termeni,despre-proiect,pentru-transportatori}`
render CMS content automatically — no frontend deploy required.

## 7. Deploy ordering (hard)

Backend schema deploy **+ §3 token grant** → **then** frontend deploy of
#16/#20/#18. Out of order: editorial silently falls back (safe);
**waitlist submissions hard-fail** (`AUTH_MISCONFIG`) until the token
has `waitlist-submission.find`.

## 8. Token hygiene

The custom API token was shared in plaintext during coordination —
**rotate it** in Admin → Settings → API Tokens after the grants in §3.
