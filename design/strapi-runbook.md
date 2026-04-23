# Strapi Runbook — hulubul.com landing page

> Scope: **this repo only** (Strapi 5.34 backend).
> The Next.js frontend lives in a separate repo and has its own runbook (not included here).
> Purpose: produce a working Strapi instance that serves `/api/landing-page` with all landing copy and accepts public POSTs to `/api/waitlist-submissions`.

---

## 0. What was added to this repo

| Area | Path |
|---|---|
| Single type (page) | `src/api/landing-page/` (schema + controller + service + routes) |
| Collection type (signups) | `src/api/waitlist-submission/` (schema + controller + service + routes) |
| New shared component | `src/components/shared/link.json` |
| New landing components | `src/components/landing/*.json` (17 files) |
| Seed data (verbatim HTML copy) | `data/landing-page.json` |
| Seed script | `scripts/seed-landing-page.js` |
| Schema + seed tests (node:test) | `tests/schemas/*.test.js`, `tests/seed/*.test.js` |
| Inventory / source-of-truth | `design/elements.md` |
| This runbook | `design/strapi-runbook.md` |

All code is JavaScript to match the existing conventions in this repo (the EPIC assumed TypeScript — overridden to stay consistent with the existing `src/api/*/*.js` pattern).

## 1. Local verification

```bash
npm install                 # if not already
npm test                    # 33 tests, all must pass
npm run develop             # Strapi admin on http://localhost:1337/admin
```

Checklist once Strapi is running:

1. Admin → Content-Type Builder → confirm **Landing Page** (single type) and **Waitlist Submission** (collection type) appear.
2. Admin → Content Manager → Landing Page → confirm all 10 section components render with correct fields.
3. Run the seed: **stop Strapi**, then in a new shell:

   ```bash
   npm run seed:landing-page
   ```

   The script boots Strapi standalone, upserts the single type, and sets public permissions. It is idempotent — safe to re-run.
4. Restart Strapi, open Content Manager → Landing Page → verify all copy landed.
5. Smoke test the REST endpoints (no token needed after seeding — public permissions are set):

   ```bash
   curl 'http://localhost:1337/api/landing-page?populate=deep' | jq .data.hero.titleLead
   # -> "Trimite un colet acasă,"

   curl -X POST http://localhost:1337/api/waitlist-submissions \
     -H 'Content-Type: application/json' \
     -d '{"data":{"name":"Test","contact":"t@t.com","role":"expeditor"}}'
   # -> 200 with the created submission
   ```

   Note: Strapi 5.34 supports `populate=*` (one level) but the landing-page has nested repeatables, so the frontend repo should pass an explicit `populate` object via `qs` to hydrate every component. `populate=deep` works if the `strapi-plugin-populate-deep` plugin is installed — otherwise use an explicit populate tree (documented in the frontend runbook).

## 2. Strapi Cloud deployment

Strapi Cloud runs migrations automatically when it detects new schema files. Steps:

1. `git checkout -b feature/landing-page`
2. Commit the new files (see §0).
3. Push the branch; open a PR.
4. On merge to main, Strapi Cloud redeploys. Watch the deploy logs — any schema validation error surfaces here.
5. Once deployed, connect via the Strapi Cloud admin panel and repeat step 3 from §1 (run the seed). Strapi Cloud exposes a terminal under Settings → Terminal for this.
6. Verify `https://<project>.strapiapp.com/api/landing-page` returns the hero.titleLead string.

If the seed does **not** run in Strapi Cloud (some plans lock down the terminal), the fallback is: open Content Manager → Landing Page → paste each section manually, following `data/landing-page.json` as the source of truth. Still idempotent, just slower.

## 3. API tokens (for the frontend to read)

The landing page is public-readable after seeding, so a token is **optional** for reads — but recommended to allow future tightening without redeploying the frontend.

1. Admin → Settings → API Tokens → Create new API Token
   - Name: `frontend-read`
   - Description: `Read-only token for the Next.js frontend`
   - Token type: **Read-only**
   - Duration: **Unlimited**
2. Copy the token (shown only once). Hand it to the frontend repo maintainer, who will place it in `STRAPI_API_TOKEN` in the Next.js env. **Never commit it.**
3. If the token is leaked or lost, regenerate. Read-only tokens are safe to rotate without data loss.

## 4. Public permissions — what the seed actually does

`scripts/seed-landing-page.js` grants the `public` role two actions:

| UID | Action | Why |
|---|---|---|
| `api::landing-page.landing-page` | `find` | Anonymous GET `/api/landing-page` (used by the frontend Server Component on every render). |
| `api::waitlist-submission.waitlist-submission` | `create` | Anonymous POST `/api/waitlist-submissions` from the signup form. No other actions are granted — anonymous callers cannot list/read/update/delete submissions. |

If the seed is skipped, set these permissions manually: Admin → Settings → Users & Permissions Plugin → Roles → Public → enable the two actions above and nothing else.

## 5. Editing content after launch

- All copy lives in the `Landing Page` single type. Editors work in Content Manager, same as any other Strapi entry.
- The "lead + italic tail" motif is split across two fields (`titleLead`, `titleEmphasis`). Editors should not merge them — the frontend joins them with a space and wraps the emphasis in `<em>`.
- The `signup` and `faq` sections also expose a third `titleTrail` field because the emphasis lands mid-sentence there.
- Emoji glyphs (`logoMark`, `stampGlyph`, `iconEmoji`, `trust-item.glyph`) are plain strings — editors can swap them freely without touching the frontend.
- Adding/removing items in repeatable components (problem cards, steps, audience cards, trust items, FAQ items, footer columns, role options, postcard lines, footer links) is safe — the frontend just iterates.
- **Reordering top-level sections requires a frontend code change.** Order is locked by the schema (§8.6 of `design/elements.md`). If reordering becomes a recurring need, migrate `landing-page` to a dynamic zone in a follow-up epic.

## 6. Rollback

If a bad deploy gets through:

1. Revert the offending commit(s) on `main` — Strapi Cloud redeploys the previous schema.
2. Content data in the DB is preserved across schema-file reverts, **unless** attributes were dropped (in which case Strapi 5 soft-deletes them — the data exists in `strapi-database` backups if needed).
3. If the `landing-page` single type is deleted entirely (do not do this without a DB backup), restore via Strapi Cloud snapshot and re-seed.

## 7. What's NOT in this repo

Out of scope by design — these belong to the Next.js frontend repo:

- `qs`-based populate queries
- TypeScript types mirroring the schema
- `next/image` + `remotePatterns`
- `next/font` registration for Fraunces + Inter
- Any styling (CSS tokens in `design/elements.md` §3 are the reproduction spec)
- Form submission wiring (the frontend form must POST `{ data: { name, contact, role, route? } }` to `/api/waitlist-submissions`)
- Visual diff verification against `design/hulubul-landing-v2.html`

When the frontend work begins, `design/elements.md` + `data/landing-page.json` + the REST response shape are the three sources of truth.

## 8. Acceptance checklist for this repo's PR

- [x] `npm test` passes locally — 33 schema + seed tests
- [ ] `npm run develop` boots without schema errors
- [ ] `npm run seed:landing-page` populates the single type (or manual equivalent)
- [ ] `curl /api/landing-page` returns the expected hero title without auth
- [ ] `curl -X POST /api/waitlist-submissions` with a valid body returns 200 without auth
- [ ] `curl /api/waitlist-submissions` (no token) returns 403 — list is not public
- [ ] PR description references `design/elements.md` and `design/strapi-runbook.md`
- [ ] Frontend repo ticket is open to consume `/api/landing-page`
