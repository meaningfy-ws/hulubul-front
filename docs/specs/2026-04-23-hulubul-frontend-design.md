# Hulubul Frontend — Design Spec

> Date: 2026-04-23.
> Scope: this repo (`hulubul-front`). Backend is Strapi 5.34 at `https://steadfast-bell-433fdd1ac5.strapiapp.com`, source in `../strapi-cloud-template-blog-18c70c3ea8`.
> Sources of truth: `design/EPIC-html-to-strapi-landing-page.md`, `design/hulubul-landing-v2.html`, `design/elements.md`, `design/strapi-runbook.md`, and the live content model at `../strapi-cloud-template-blog-18c70c3ea8/src/api/landing-page`.

## 1. Goal

Render `design/hulubul-landing-v2.html` pixel-identical, but content-driven from Strapi. Every editable field from `elements.md §6` is fetched from `/api/landing-page`; every static layout/styling detail stays in code. The signup form POSTs to `/api/waitlist-submissions`.

**Definition of Done:** page renders correctly against the live backend once a `landing-page` entry is published, side-by-side diff with `hulubul-landing-v2.html` shows no visual regression, signup POST round-trips through `/api/waitlist` to Strapi.

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | EPIC default; Server Components give us server-side fetching + SEO. |
| Language | TypeScript (strict) | EPIC rule #7; typed Strapi response prevents drift. |
| Styling | Vanilla CSS + `:root` custom properties | elements.md §8.2 forbids introducing a new styling system. Port the HTML's `<style>` block verbatim into `app/globals.css`. |
| Fonts | `next/font/google` (Fraunces + Inter) | Replaces the CDN `<link>`; avoids FOIT. |
| Fetching | Native `fetch` in Server Components + `qs` for populate | Strapi 5 REST, matches EPIC §5.2. |
| Form POST | Next.js Route Handler proxy | Server-side validation boundary; keeps tokens (if any) out of the browser. |
| Runtime validation | `zod` | Parse Strapi responses + validate form input on the server. |
| Markdown | `react-markdown` | FAQ answers are `richtext` (seed contains inline links). |
| Tests | Vitest + Testing Library + MSW | Fast, Node-native, mocks Strapi without network. |

Out of scope for v1: Playwright, CMS preview mode, i18n (page is `ro`-only), SEO sitemap.

## 3. Environment

```
NEXT_PUBLIC_STRAPI_URL     public, used for building request URLs
STRAPI_API_TOKEN           server-only (used by route handlers + Server Components)
```

`.env.cloud` holds the real values (gitignored). `.env.example` is the template. `predev` npm script copies `.env.cloud → .env.local` if absent, so `npm run dev` works on fresh checkout.

## 4. File layout

```
app/
  layout.tsx          <html lang="ro">, fonts, default metadata
  page.tsx            Server Component: fetches landing-page, renders sections
  globals.css         reset + :root tokens + all section styles (from HTML)
  api/waitlist/route.ts   POST proxy with Zod validation
  not-found.tsx       used when landing-page entry isn't published yet
components/landing/
  SplitTitle.tsx      lead + <em>emphasis</em> + optional trail — used ~10x
  MarkdownText.tsx    safe inline markdown render for FAQ answers
  Reveal.tsx          client wrapper for scroll-reveal animation
  Nav.tsx Hero.tsx Problem.tsx HowItWorks.tsx Audience.tsx Trust.tsx Footer.tsx
  Signup.tsx          server wrapper + section copy
  SignupForm.tsx      client form + prefill + success state
  Faq.tsx             client details toggle
lib/
  types.ts            LandingPage + component types mirroring elements.md §6
  populate.ts         buildLandingPopulate() returns qs tree
  strapi.ts           getLandingPage(), submitWaitlist()
  waitlist-schema.ts  Zod schema for { name, contact, role, route? }
tests/
  setup.ts msw/handlers.ts msw/fixtures/landing-page.ts
  lib/populate.test.ts
  lib/strapi.test.ts
  lib/waitlist-schema.test.ts
  components/SplitTitle.test.tsx
  components/SignupForm.test.tsx
  components/Faq.test.tsx
```

## 5. Data contract

**Landing page response shape** (Strapi 5 flat, no `attributes` wrap):

```ts
{
  data: {
    id: number; documentId: string;
    seo: { metaTitle: string; metaDescription: string; shareImage?: Media };
    nav: { logoText; logoAccent; logoMark; ctaLabel; ctaHref };
    hero: { eyebrow?; titleLead; titleEmphasis; subtitle?; primaryCtaLabel; primaryCtaHref;
            socialProofText?; stampLabel?; stampGlyph?; postmarkCity?; postmarkYear?;
            postmarkLabel?; handwrittenLines: Array<{ text: string }>;
            routeFromCity?; routeFromMeta?; routeToCity?; routeToMeta? };
    problem: { label; titleLead; titleEmphasis; intro?;
               cards: Array<{ number; title; description }> };
    howItWorks: { label; titleLead; titleEmphasis; intro?;
                  steps: Array<{ number; title; description }>; note? };
    audience: { label; titleLead; titleEmphasis;
                cards: Array<{ iconEmoji; titleLead; titleEmphasis; description;
                               linkLabel; linkHref; role: Role }> };
    trust: { label; titleLead; titleEmphasis;
             items: Array<{ glyph; title; description }> };
    signup: { label; titleLead; titleEmphasis; titleTrail?; intro?;
              nameLabel; nameHint?; namePlaceholder?;
              contactLabel; contactPlaceholder?;
              roleLabel; roleOptions: Array<{ value: Role; label: string }>;
              roleDefault?: Role;
              routeLabel; routeHint?; routePlaceholder?;
              submitLabel; privacyNote?;
              successTitle; successMessage };
    faq: { label; titleLead; titleEmphasis; titleTrail?;
           items: Array<{ question; answer: string /* markdown */ }> };
    footer: { logoText; logoAccent?; logoMark?; tagline?;
              columns: Array<{ title; links: Array<{ label; href; external?: boolean }> }>;
              copyrightText; locationLine? };
  }
}
```

Role enum: `"expeditor" | "transportator" | "ambele"`.

**Waitlist POST payload** (Strapi 5 requires `{ data: {...} }`):

```ts
POST /api/waitlist-submissions
{ data: { name: string; contact: string; role: Role; route?: string } }
```

## 6. Populate tree

`populate=*` only hydrates one level; the page has two levels of repeatables (`footer.columns.links`) plus eight one-level repeatables. `qs` builds the explicit tree:

```ts
{
  seo: { populate: ["shareImage"] },
  nav: { populate: "*" },
  hero: { populate: ["handwrittenLines"] },
  problem: { populate: ["cards"] },
  howItWorks: { populate: ["steps"] },
  audience: { populate: ["cards"] },
  trust: { populate: ["items"] },
  signup: { populate: ["roleOptions"] },
  faq: { populate: ["items"] },
  footer: { populate: { columns: { populate: ["links"] } } },
}
```

A unit test asserts every required component attribute from the schema is covered.

## 7. Three load-bearing abstractions

1. **`SplitTitle`** — centralises the italic-tail motif (every H1/H2 plus audience/faq H3). Props: `lead`, `emphasis`, `trail?`, optional `tag` (`h1|h2|h3`). Avoids 10 copies of the same `<em>` markup and reduces the risk of editors accidentally merging the two CMS fields into one.

2. **`buildLandingPopulate()`** — single source of truth for which fields hydrate. Kept next to `lib/types.ts` so schema changes surface in one place. Tested by asserting every `component` attribute in the schema appears in the populate tree (we do this by generating the expected tree from the schema JSON and comparing).

3. **`<SignupForm>`** — the only client component with real logic. Reads `role` prefill from `useSearchParams` (deep-linkable, SSR-safe). POSTs to `/api/waitlist`. Swaps to success state on 201/200. Shows inline error on failure. Fields validated by HTML5 `required` client-side and Zod server-side.

## 8. Form submission flow

1. User fills form → client POSTs `{ name, contact, role, route? }` to `/api/waitlist`.
2. Route handler parses with `waitlistSchema.safeParse(body)`.
3. On parse error → 400 with messages.
4. On parse success → POST to `${STRAPI_URL}/api/waitlist-submissions` with `{ data: parsed }`.
   - No Authorization header: public `create` permission is required on Strapi (runbook §4). If Strapi returns 403, the route handler surfaces a friendly 500 asking the user to run the seed — this makes the misconfiguration visible rather than silently failing.
5. On Strapi 200 → route returns 201 `{ ok: true }`.
6. Client shows success state.

## 9. Error + empty states

- **Backend unreachable** (`getLandingPage` throws): `app/page.tsx` renders a minimal "site is booting" placeholder instead of crashing. Production observability would go into logs (a separate concern).
- **Entry not published** (Strapi 404): same placeholder, with a clear message in dev mode.
- **Seed script not run on Strapi Cloud**: calls out to the README which points to `design/strapi-runbook.md §2`.

## 10. TDD sequencing

1. `populate.test.ts` → `populate.ts` + `types.ts`
2. `waitlist-schema.test.ts` → `waitlist-schema.ts`
3. `strapi.test.ts` (MSW) → `strapi.ts`
4. `SplitTitle.test.tsx` → `SplitTitle.tsx`
5. Implement the seven presentational section components (light smoke render tests)
6. `SignupForm.test.tsx` → `SignupForm.tsx` + route handler
7. `Faq.test.tsx` → `Faq.tsx`
8. Compose `app/page.tsx` + `generateMetadata`
9. `npm test` + `npm run build` + visual smoke in browser

## 11. Risks / open items

- **Backend has no published entry yet.** Frontend ships correctly; will render empty state until the runbook §2 seed runs on Strapi Cloud. Not blocking frontend delivery.
- **`shareImage` media hosting.** If the editor uploads an OG image, `next/image` needs the Strapi media CDN in `remotePatterns`. Added preemptively for `*.strapiapp.com` and `*.media.strapiapp.com`.
- **Smooth scroll + scroll-reveal on SSR.** `Reveal` component is a Client Component; children are server-rendered; intersection observer kicks in after hydration. Safe for SEO.

## 12. Out of scope (follow-up epics)

- Playwright visual regression against `hulubul-landing-v2.html`.
- Strapi Preview Mode wiring (editors see drafts).
- Sitemap + robots.txt beyond defaults.
- i18n (EN/FR) — model already supports per-field i18n if turned on.
