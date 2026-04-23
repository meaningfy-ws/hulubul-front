# hulubul-front

Next.js 15 + TypeScript frontend for **hulubul.com**, driven by the Strapi 5.34 backend at
`https://steadfast-bell-433fdd1ac5.strapiapp.com`. Reproduces `design/hulubul-landing-v2.html`
pixel-identical, with editable copy coming from Strapi.

## Quick start

```bash
npm install
npm run dev         # copies .env.cloud → .env.local on first run
# open http://localhost:3000
```

If `.env.local` is missing and `.env.cloud` exists, the `predev` script copies it
automatically. Both files are gitignored.

## Environment

| Var | Who reads it | What |
|---|---|---|
| `NEXT_PUBLIC_STRAPI_URL` | browser + server | Base URL of the Strapi backend. |
| `STRAPI_API_TOKEN` | **server only** | Read-only token minted in Strapi admin. |

`.env.example` is the committed template. Real values live in `.env.cloud` (untracked)
and are copied into `.env.local` on first `npm run dev`.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server with HMR on :3000. |
| `npm run build` | Production build. Tolerates backend failure — renders a placeholder page if `/api/landing-page` is unreachable or empty. |
| `npm run start` | Serve the production build. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Vitest, runs once. |
| `npm run test:watch` | Vitest watch mode. |
| `npm run lint` | `next lint`. |

## Architecture

- **App Router**. `app/page.tsx` fetches the landing-page single type in a Server
  Component and renders 10 section components. `generateMetadata` populates SEO from
  the `seo` component. ISR with `revalidate = 300`.
- **Styling**. Vanilla CSS in `app/globals.css`, with CSS variables on `:root` that
  mirror the original HTML tokens (see `design/elements.md §3`). No Tailwind, no CSS
  modules.
- **Fonts**. `next/font/google` loads Fraunces + Inter and exposes them as CSS
  variables (`--font-fraunces`, `--font-inter`) referenced throughout `globals.css`.
- **Data layer**. `lib/strapi.ts` calls Strapi 5 REST with an explicit `qs` populate
  tree (`lib/populate.ts`). Strapi 5 returns a flat response shape — no `attributes`
  nesting.
- **Forms**. The signup form is a Client Component that POSTs to
  `app/api/waitlist/route.ts`, which validates with Zod then forwards to
  `/api/waitlist-submissions`.
- **Motif**. Every "lead + italic tail" headline uses the `<SplitTitle>` helper so
  the CMS-stored `titleLead`/`titleEmphasis` pair never gets merged into a single
  string.

## Tests

6 test files, 30 tests (`npm test`):

- `tests/lib/populate.test.ts` — asserts the populate tree covers every schema component.
- `tests/lib/strapi.test.ts` — MSW-backed fetcher tests (200, 404, 5xx, auth header).
- `tests/lib/waitlist-schema.test.ts` — Zod validation behaviour.
- `tests/components/SplitTitle.test.tsx` — italic-tail headline motif.
- `tests/components/SignupForm.test.tsx` — POST payload shape, role prefill, success + error states.
- `tests/components/Faq.test.tsx` — details/summary rendering + inline markdown links.

## Deployment notes

- `NEXT_PUBLIC_STRAPI_URL` and `STRAPI_API_TOKEN` must be set in the hosting dashboard
  (Vercel/Netlify). Do **not** commit `.env.cloud` or `.env.local`.
- The page is fully static at build time. Content changes in Strapi propagate on the
  next revalidation (every 5 minutes) or on the next deploy.
- If Strapi returns 4xx/5xx at build time, the build still succeeds — the page
  renders a "coming soon" placeholder and ISR retries later.

## Current backend state

- Schema is deployed (see `design/strapi-runbook.md §0`).
- `landing-page` single type has **no published entry yet** → the page currently shows
  the "coming soon" placeholder. Ask the backend maintainer to run
  `npm run seed:landing-page` on Strapi Cloud (runbook §2) or populate manually via
  the admin Content Manager.
- `waitlist-submission` endpoint is live; public `create` permission must be enabled
  on the Public role (runbook §4) for the signup form to succeed.

## References

- Design spec: `docs/specs/2026-04-23-hulubul-frontend-design.md`
- Element inventory: `design/elements.md`
- Source HTML: `design/hulubul-landing-v2.html`
- Strapi runbook: `design/strapi-runbook.md`
- EPIC: `design/EPIC-html-to-strapi-landing-page.md`
