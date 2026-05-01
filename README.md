# hulubul.com — Frontend (Next.js)

Landing page, waitlist, and research surveys for **hulubul.com**, a diaspora
package transport platform connecting senders and transporters between Moldova
and Western Europe.

This repository is one half of the platform. The backend lives at
[meaningfy-ws/strapi-cloud-template-blog-18c70c3ea8](https://github.com/meaningfy-ws/strapi-cloud-template-blog-18c70c3ea8).

---

## Live deployments

| Service | URL | Tier |
|---|---|---|
| Frontend | Vercel (free tier) | Free |
| Strapi admin | [Strapi Cloud](https://cloud.strapi.io) (free tier) | Free |
| Auth (SSO) | Zitadel Cloud (free tier) *(planned)* | Free |

---

## Tech stack

| Technology | Role |
|---|---|
| [Next.js 15](https://nextjs.org) (App Router) | Frontend framework, SSR, ISR, Route Handlers |
| [TypeScript](https://www.typescriptlang.org) (strict) | Type safety across data layer + components |
| [Zod](https://zod.dev) | Runtime validation of Strapi responses and form payloads |
| [React 19](https://react.dev) | Server + Client Components |
| Vanilla CSS + `:root` custom properties | Styling — no framework, mirrors the original design tokens |
| [next/font](https://nextjs.org/docs/app/api-reference/components/font) | Fraunces + Inter self-hosted via Google Fonts |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Renders `richtext` answers (e.g. FAQ) |
| [qs](https://github.com/ljharb/qs) | Builds Strapi's deep populate query strings |
| [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) + [MSW](https://mswjs.io) | Unit / component / integration tests |

---

## Repositories

| Repo | Description |
|---|---|
| `meaningfy-ws/hulubul-front` | **This repo** — Next.js frontend, waitlist form, surveys, landing page |
| [meaningfy-ws/strapi-cloud-template-blog-18c70c3ea8](https://github.com/meaningfy-ws/strapi-cloud-template-blog-18c70c3ea8) | Strapi backend — content types, lifecycles, geocoding |

---

## What the frontend serves

| Route | Type | Renders |
|---|---|---|
| `/` | Static (ISR) | Landing page with 10 sections driven by Strapi's `landing-page` single type |
| `/api/waitlist` | Dynamic | POST-only Route Handler; Zod-validates then forwards to `waitlist-submission` |
| `/sondaj/expeditori` | Static (ISR) | Sender research survey (25-field form) |
| `/sondaj` | Redirect | → `/sondaj/expeditori` (transporter survey lands at `/sondaj/transportatori` later) |
| `/api/survey` | Dynamic | POST-only Route Handler; Zod-validates then forwards to `survey-response` |
| `/confidentialitate` | Static | Privacy policy (remember-me disclosure, GDPR basics) |

Nav and footer are hoisted into `app/layout.tsx` and appear on every route.

---

## Quick start

```bash
npm install
npm run dev          # copies .env.cloud → .env.local on first run
# open http://localhost:3000
```

`.env.cloud` holds real values (untracked). The `predev` script copies it to
`.env.local` if missing — both are gitignored.

---

## Environment

```
NEXT_PUBLIC_STRAPI_URL   # Base URL of the Strapi backend, e.g. https://xyz.strapiapp.com
STRAPI_API_TOKEN         # Server-only token with read + waitlist/survey create permissions
```

`.env.example` is the committed template. Never commit real tokens.

---

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server on :3000 with HMR |
| `npm run build` | Production build (tolerates backend downtime — placeholder if Strapi 4xx/5xx) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (one shot) |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | `next lint` |

---

## Architecture

- **App Router**, Server Components for data fetching, Client Components for forms.
- **Data layer** — `lib/strapi.ts` + `lib/populate.ts` + `lib/survey.ts` wrap Strapi
  5 REST. Populate tree is declared once and tested for completeness so schema
  drift surfaces in CI.
- **Forms** — every client form POSTs to a Next.js Route Handler that
  Zod-validates before forwarding to Strapi with the server-side Bearer token.
  The browser never sees the token.
- **Remember-me** — purely client-side (localStorage, opt-in, v2 schema,
  365-day TTL). See `design/epic-signup/remember-me.md`.
- **Nav greeting** — `<NavCta>` reads remember-me after hydration and swaps the
  "Mă înscriu" button for "Bună, {firstName}" once identity is stored.
- **CSP + security headers** configured in `next.config.ts` (strict in prod,
  relaxed for HMR in dev).

---

## Design specs

Detailed specifications live in [`design/`](./design/) and
[`docs/specs/`](./docs/specs/):

- [`design/elements.md`](./design/elements.md) — full element inventory of the landing page
- [`design/EPIC-html-to-strapi-landing-page.md`](./design/EPIC-html-to-strapi-landing-page.md) — landing-page reproduction EPIC
- [`design/epic-signup/remember-me.md`](./design/epic-signup/remember-me.md) — remember-me EPIC (shipped)
- [`design/epic-signup/login.md`](./design/epic-signup/login.md) — Zitadel auth EPIC (spec only)
- [`design/epic-survey/post-waitlist.md`](./design/epic-survey/post-waitlist.md) — sender survey EPIC (shipped)
- [`design/sso-provider-comparison.md`](./design/sso-provider-comparison.md) — OSS IdP comparison driving the Zitadel choice
- [`design/testing-strategy.md`](./design/testing-strategy.md) — TDD rubric for this repo
- [`docs/specs/2026-04-23-hulubul-frontend-design.md`](./docs/specs/2026-04-23-hulubul-frontend-design.md) — overall frontend architecture

Source HTML (for pixel-equivalent reproduction): [`design/hulubul-landing-v2.html`](./design/hulubul-landing-v2.html).

---

## Tests

```
npm test           # runs all 103 tests, ~1.5 s
```

Structure follows `design/testing-strategy.md`:

- Unit — pure modules in `lib/` (populate builder, Zod schemas, remember-me).
- Integration — fetchers and route handlers with MSW-intercepted Strapi calls.
- Component — `SignupForm`, `SurveyForm`, `NavCta`, `SelectionCriteriaPicker`,
  `Faq`, `SplitTitle`.
- E2E (Playwright) — deferred until post-launch.

---

## Deployment

### Vercel

- Set `NEXT_PUBLIC_STRAPI_URL` and `STRAPI_API_TOKEN` in the hosting dashboard.
- Pages are statically rendered with ISR (`revalidate = 300`). Content changes
  in Strapi propagate within 5 minutes without a redeploy.
- If Strapi is unreachable at build time, the build still succeeds — the page
  renders a "coming soon" placeholder and ISR retries on the next request cycle.

### Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_STRAPI_URL=https://your-project.strapiapp.com \
  -t hulubul-front .

docker run -e STRAPI_API_TOKEN=your-token -p 3000:3000 hulubul-front
```

- `NEXT_PUBLIC_STRAPI_URL` — your Strapi Cloud URL (e.g. `https://xyz.strapiapp.com`),
  or a local Strapi instance. Baked in at build time for client bundles + ISR.
- `STRAPI_API_TOKEN` — runtime-only, used by server-side route handlers.
- Build tolerates Strapi downtime — renders a placeholder, ISR retries at runtime.

---

## Follow-up epics (specced, not yet implemented)

- **Zitadel SSO** — `design/epic-signup/login.md`. Email + Google + Facebook.
- **Transporter survey** — `/sondaj/transportatori`, separate field set focused
  on driver pains and route operations.
- **Playwright E2E smoke** — one happy-path run for each critical flow.
- **i18n** — EN/FR after RO is polished.
