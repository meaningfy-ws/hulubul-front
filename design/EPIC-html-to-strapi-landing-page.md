# EPIC — Reproduce HTML Landing Page in Strapi 5 + Next.js (TypeScript)

> **Audience:** an LLM assistant (Claude, GPT, etc.) executing this work on behalf of a user.
> **Goal:** Take a static HTML landing page provided by the user and reproduce it as a content-driven page powered by Strapi 5 (CMS) and an existing Next.js + TypeScript frontend, such that the deployed result is **visually identical** to the source HTML and the editable parts are managed in Strapi.
> **Definition of Done:** the user can deploy both repos and load the landing page route, and a side-by-side screenshot diff with the original HTML shows pixel-equivalent layout, typography, color, spacing, and responsive behavior. All copy, images, and CTAs are editable in Strapi without code changes.

---

## EPIC Context & Constraints

| Property | Value |
|---|---|
| Strapi version | **5.x** (Document Service API, NOT Entity Service) |
| Strapi hosting | Strapi Cloud (code in GitHub, DB managed by Strapi) |
| Frontend | Existing Next.js project, TypeScript |
| Frontend hosting | Already provisioned (assume Vercel/Netlify/similar) |
| API protocol | **Detect from the existing frontend repo** — do NOT assume |
| Deliverable shape | Two PRs: one to the Strapi repo, one to the Next.js repo |

**Hard constraints:**
- Never invent API patterns. Match the conventions already present in the Next.js repo.
- Strapi 5 uses the **Document Service API** (`strapi.documents(...)`). Do NOT generate Entity Service code (`strapi.entityService(...)`) — that is Strapi 4.
- All API tokens, URLs, and secrets go in environment variables. Never commit them.
- Preserve the user's existing folder structure, naming conventions, and code style.

---

## Stories (work breakdown)

The EPIC is decomposed into **8 sequential stories**. Each has its own acceptance criteria. Do not start a story until the previous one is complete.

```
STORY 1 → Discovery & inventory of the HTML page
STORY 2 → Discovery & inventory of the Next.js repo
STORY 3 → Content modeling (Strapi schemas)
STORY 4 → Strapi implementation (schemas + sample data)
STORY 5 → Frontend data layer (fetcher, types, queries)
STORY 6 → Frontend page implementation (components + styles)
STORY 7 → Asset & media strategy (images, fonts, icons)
STORY 8 → Verification, deployment instructions, and handoff
```

---

## STORY 1 — Discovery & Inventory of the HTML Page

**Goal:** produce a complete, structured inventory of every meaningful element in the source HTML so nothing is dropped during reproduction.

### Required inputs
- The HTML file (one or more)
- Any linked CSS files (or note that styles are inline / via CDN)
- Any referenced images, fonts, icons (URLs or attached files)

If any of these are missing, **stop and ask the user** before proceeding.

### Steps

1. **Parse the document head.**
   - Extract: `<title>`, all `<meta>` tags (especially `description`, `viewport`, Open Graph, Twitter cards), favicon, canonical URL.
   - List all `<link rel="stylesheet">` (note Tailwind CDN, Google Fonts, custom CSS).
   - List all `<script>` tags (Alpine.js, jQuery, analytics, custom JS).

2. **Identify the design system in use.**
   - Detect the CSS strategy: Tailwind (look for utility classes), Bootstrap, custom CSS, CSS modules, vanilla, etc.
   - Note the color palette (extract all unique color values from CSS and inline styles).
   - Note typography: font families, weights, sizes, line heights.
   - Note the spacing scale (margins, paddings — look for repeated values).
   - Note the breakpoint strategy (media queries, Tailwind breakpoints).

3. **Section the page.**
   - Walk the DOM top to bottom and identify visual sections (e.g., Header, Hero, Features, Testimonials, Pricing, FAQ, CTA, Footer).
   - For each section, record:
     - A short slug (e.g., `hero`, `features-grid`, `pricing-table`)
     - The semantic HTML tag used
     - The CSS classes / IDs
     - All editable content (text, image src, button labels, link hrefs)
     - Any repeating sub-items (e.g., 3 feature cards, 5 pricing tiers)

4. **Identify dynamic vs. static elements.**
   - **Editable in CMS** (will become Strapi fields): all human-readable text, image sources, button labels/links, prices, testimonial quotes/authors, etc.
   - **Static in code** (stays in Next.js component): layout structure, decorative SVGs, animations, icon glyphs that are part of the design system, hardcoded utility class strings.

5. **Produce the Inventory Document.** Format:

```markdown
## Page Inventory

### Meta
- Title: "..."
- Description: "..."
- OG image: ...
- Favicon: ...

### Design tokens
- Primary color: #...
- Secondary color: #...
- Body font: "..."
- Heading font: "..."
- Breakpoints: ...

### Sections
1. **header**
   - Tag: `<header>`
   - Classes: `...`
   - Editable: logo image, nav links (label + href, repeating), CTA button (label + href)
   - Static: layout, hamburger icon

2. **hero**
   - Editable: headline, subheadline, primary CTA (label + href), secondary CTA, hero image
   - Static: background gradient, decorative shapes

(... continue for every section ...)
```

### Acceptance criteria
- ✅ Every visible element on the page appears in the inventory.
- ✅ Each editable element is explicitly tagged as editable.
- ✅ The design tokens section contains enough info to reproduce visuals 1:1.
- ✅ The inventory is shown to the user for confirmation **before moving to Story 2**.

---

## STORY 2 — Discovery & Inventory of the Next.js Repo

**Goal:** understand the existing project so the new code matches its conventions exactly.

### Required inputs from user
Ask for (in this order, stop if not provided):
1. `package.json` (full contents)
2. Output of `ls -R app/` and/or `ls -R pages/` (whichever exists)
3. Any existing file that fetches from Strapi (e.g., `lib/strapi.ts`, `app/blog/page.tsx`)
4. `.env.example` (or list of env vars used for Strapi)
5. `next.config.js` / `next.config.mjs`
6. `tailwind.config.{js,ts}` if Tailwind is used
7. `tsconfig.json`

### Steps

1. **Determine routing model.** App Router (`app/` directory) or Pages Router (`pages/`).

2. **Detect the API protocol:**
   - GraphQL signals: `@apollo/client`, `graphql`, `graphql-request`, `urql`, `.graphql` files, `gql\`...\`` template strings.
   - REST signals: bare `fetch`, `axios`, `swr`, `@tanstack/react-query` calls to `/api/...` endpoints.
   - **Default to REST** only if no signal at all is found (Strapi 5 REST is enabled by default; GraphQL requires the plugin).

3. **Detect the styling system.**
   - Tailwind (`tailwind.config.*` exists, `@tailwind` in CSS).
   - CSS Modules (`*.module.css`).
   - styled-components / emotion (in deps).
   - Plain CSS / Sass.
   - **The new landing page MUST use the same system** — do not introduce a new one.

4. **Detect the existing Strapi base URL pattern.**
   - Common env var names: `NEXT_PUBLIC_STRAPI_URL`, `STRAPI_API_URL`, `NEXT_PUBLIC_STRAPI_API_URL`, `CMS_URL`.
   - Use whichever is already defined. Do not introduce a new one if one exists.

5. **Detect the data-fetching pattern in Server Components / `getStaticProps`:**
   - App Router: `async function Page() { const data = await fetch(...) }` or a custom `getXxx()` helper.
   - Note caching strategy: `{ next: { revalidate: 60 } }`, `cache: 'no-store'`, ISR, etc.

6. **Produce a Repo Profile document:**

```markdown
## Repo Profile
- Router: App Router
- API protocol: REST
- Styling: Tailwind CSS v3.4
- Strapi base URL env: NEXT_PUBLIC_STRAPI_URL
- Existing fetcher: lib/strapi.ts (uses native fetch + Bearer token)
- Caching pattern: { next: { revalidate: 300 } }
- Image handling: next/image with remotePatterns configured for Strapi domain
- TypeScript: strict mode enabled
```

### Acceptance criteria
- ✅ Repo profile is shown to the user for confirmation.
- ✅ Any uncertainty (e.g., "I see both Apollo and fetch — which one do you use for new work?") is resolved by asking the user.

---

## STORY 3 — Content Modeling (Strapi Schemas)

**Goal:** design the Strapi content types that will hold the landing page data, optimized for editor experience and clean frontend consumption.

### Decision rules

- **Use a Single Type** for the landing page itself (e.g., `landing-page`). Single Types have exactly one entry — perfect for "the homepage."
- **Use Components** for repeating or grouped fields within the page (e.g., a `cta-button` component with `label` + `href` + `style`).
- **Use a Dynamic Zone** if the user wants to reorder/add/remove sections from the admin panel. Otherwise, use a fixed set of component fields (simpler, more predictable).
- **Use Collection Types** only for items that exist independently (e.g., `testimonial`, `feature`, `pricing-tier`) and are referenced by relations. Default preference: keep things inside the Single Type via components unless there's a reuse case.
- **Media fields** for images. Configure allowed types and required/optional explicitly.
- **Internationalization:** if the original HTML has language switching or the user mentions it, enable i18n on the relevant fields. Otherwise skip.

### Steps

1. From the inventory in Story 1, propose a content model:

```
Single Type: landing-page
├── seo (component, shared.seo)
│   ├── metaTitle (string, required)
│   ├── metaDescription (text, required)
│   └── ogImage (media, single, images only)
├── header (component, sections.header)
│   ├── logo (media, single)
│   ├── navLinks (component, repeatable, shared.link)
│   └── ctaButton (component, single, shared.button)
├── hero (component, sections.hero)
│   ├── headline (string, required)
│   ├── subheadline (text)
│   ├── primaryCta (component, shared.button)
│   ├── secondaryCta (component, shared.button)
│   └── image (media, single)
├── features (component, sections.features)
│   ├── title (string)
│   ├── items (component, repeatable, shared.feature-card)
│       ├── icon (media, single)
│       ├── title (string)
│       └── description (text)
... etc
```

2. Show the proposed model to the user with a one-paragraph rationale and **wait for approval** before generating files.

3. Once approved, generate the schema JSON files. File locations in a Strapi 5 project:
   - Single/Collection types: `src/api/{name}/content-types/{name}/schema.json`
   - Components: `src/components/{category}/{name}.json`

4. Schema file template (Strapi 5 single type):

```json
{
  "kind": "singleType",
  "collectionName": "landing_pages",
  "info": {
    "singularName": "landing-page",
    "pluralName": "landing-pages",
    "displayName": "Landing Page",
    "description": "The main marketing landing page"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "seo": {
      "type": "component",
      "component": "shared.seo",
      "required": true
    },
    "hero": {
      "type": "component",
      "component": "sections.hero",
      "required": true
    }
  }
}
```

5. Component file template:

```json
{
  "collectionName": "components_sections_heroes",
  "info": {
    "displayName": "Hero",
    "icon": "rocket",
    "description": ""
  },
  "options": {},
  "attributes": {
    "headline": { "type": "string", "required": true },
    "subheadline": { "type": "text" },
    "image": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    }
  }
}
```

### Acceptance criteria
- ✅ Schema covers every editable element from the inventory.
- ✅ User has approved the model before file generation.
- ✅ Field names are camelCase, component names are kebab-case, categories are kebab-case (Strapi convention).
- ✅ All required vs. optional fields are explicitly declared.

---

## STORY 4 — Strapi Implementation (Schemas + Sample Data)

**Goal:** deliver everything needed in the Strapi repo so that, after the user pushes and Strapi Cloud redeploys, the content type exists in the admin panel with sample data already populated to match the original HTML.

### Steps

1. **Generate all schema files** to the correct paths.

2. **Generate the controller, service, and routes scaffolding** (these are minimal in Strapi 5 for a Single Type — the defaults are usually enough). Provide:
   - `src/api/landing-page/controllers/landing-page.ts`
   - `src/api/landing-page/services/landing-page.ts`
   - `src/api/landing-page/routes/landing-page.ts`

   Default Strapi 5 single-type controller:

   ```ts
   import { factories } from '@strapi/strapi';
   export default factories.createCoreController('api::landing-page.landing-page');
   ```

3. **Provide a seed script** at `scripts/seed-landing-page.ts` that uses the Document Service API to populate the landing page with the exact text and image references from the original HTML. This is what makes the "deploy and it looks right" promise real.

   Strapi 5 Document Service example:

   ```ts
   await strapi.documents('api::landing-page.landing-page').update({
     documentId: undefined, // single type
     data: {
       seo: {
         metaTitle: 'Original page title from HTML',
         metaDescription: 'From the meta description tag',
       },
       hero: {
         headline: 'Exact headline copy from original H1',
         // ...
       }
     },
     status: 'published',
   });
   ```

   Run it with `npm run strapi -- console < scripts/seed-landing-page.ts` or document the steps for the user to run via the Strapi Cloud terminal.

4. **Provide explicit instructions for media uploads.** Images cannot be seeded purely via JSON — the user must either:
   - Upload them manually via the admin panel Media Library, OR
   - Use the Upload plugin's API to programmatically upload, then reference the returned IDs.
   Recommend the manual approach for landing pages (typically <20 images) unless the user requests automation.

5. **Generate API permissions instructions.** In Strapi admin → Settings → Users & Permissions → Roles → Public, the user must enable `find` on the `landing-page` content type. Document this step explicitly.

6. **Generate an API token instructions block.** In Strapi admin → Settings → API Tokens → Create new API Token:
   - Name: `frontend-read`
   - Type: `Read-only`
   - Duration: `Unlimited` (or as user prefers)
   - Copy the token (shown only once) into the Next.js env var.

### Acceptance criteria
- ✅ All schema, controller, service, route files are produced with correct paths.
- ✅ Seed script populates the page so the editor can see real content immediately.
- ✅ Permissions and API token steps are documented as a checklist the user can tick through.
- ✅ Code uses Strapi 5 Document Service API exclusively (no `entityService`).

---

## STORY 5 — Frontend Data Layer

**Goal:** add a typed fetcher and TypeScript interfaces in the Next.js repo that retrieve the landing page data from Strapi.

### Steps

1. **Generate TypeScript types** matching the Strapi schema. Place at `types/strapi.ts` or `types/landing-page.ts` depending on existing convention.

   ```ts
   export interface StrapiMedia {
     id: number;
     documentId: string;
     url: string;
     alternativeText: string | null;
     width: number;
     height: number;
     formats?: {
       thumbnail?: { url: string; width: number; height: number };
       small?: { url: string; width: number; height: number };
       medium?: { url: string; width: number; height: number };
       large?: { url: string; width: number; height: number };
     };
   }

   export interface SeoComponent {
     metaTitle: string;
     metaDescription: string;
     ogImage?: StrapiMedia;
   }

   export interface HeroComponent {
     headline: string;
     subheadline?: string;
     image?: StrapiMedia;
     primaryCta?: ButtonComponent;
     secondaryCta?: ButtonComponent;
   }

   export interface LandingPage {
     id: number;
     documentId: string;
     seo: SeoComponent;
     hero: HeroComponent;
     // ... other sections
   }
   ```

2. **Generate the fetcher** matching the repo's existing pattern. If the repo uses native `fetch` in App Router, produce:

   ```ts
   // lib/strapi.ts (extend if exists, create if not)
   import qs from 'qs'; // only if Strapi 5 REST and deep populate is needed

   const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL!;
   const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN!;

   export async function getLandingPage(): Promise<LandingPage> {
     const query = qs.stringify(
       {
         populate: {
           seo: { populate: '*' },
           hero: { populate: '*' },
           features: { populate: { items: { populate: '*' } } },
           // ... mirror the schema
         },
       },
       { encodeValuesOnly: true }
     );

     const res = await fetch(`${STRAPI_URL}/api/landing-page?${query}`, {
       headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
       next: { revalidate: 300 }, // match repo convention
     });

     if (!res.ok) throw new Error(`Strapi fetch failed: ${res.status}`);
     const json = await res.json();
     return json.data;
   }
   ```

   **Critical Strapi 5 note:** the response shape is **flatter** than Strapi 4 — no more `attributes` nesting. Fields are directly on the data object.

3. **If the repo uses GraphQL,** generate the equivalent query and use the existing GraphQL client. Mirror exactly the query/mutation file conventions of the repo.

4. **Update `.env.example`** with the new vars (if not already present):

   ```
   NEXT_PUBLIC_STRAPI_URL=https://your-project.strapiapp.com
   STRAPI_API_TOKEN=                # Read-only API token from Strapi admin
   ```

5. **Update `next.config.{js,mjs}`** `images.remotePatterns` to allow the Strapi media domain (required for `next/image`):

   ```js
   images: {
     remotePatterns: [
       { protocol: 'https', hostname: 'your-project.media.strapiapp.com' },
     ],
   },
   ```

### Acceptance criteria
- ✅ Types match the schema 1:1.
- ✅ Fetcher uses the Strapi 5 response shape (no `attributes` nesting).
- ✅ Populate strategy retrieves every component and nested media in a single call.
- ✅ Style and conventions match existing fetchers in the repo.

---

## STORY 6 — Frontend Page Implementation

**Goal:** translate the original HTML into Next.js components/pages that render data fetched from Strapi, producing visually identical output.

### Steps

1. **Determine the route.** Default: replace the existing `/` route. If user wants a different path (e.g., `/landing`), confirm.

2. **Translate the HTML structure into components**, one per section identified in Story 1. Place at `components/landing/Header.tsx`, `components/landing/Hero.tsx`, etc.

3. **Preserve every styling detail** from the original HTML:
   - If Tailwind: copy utility classes verbatim into the JSX `className`.
   - If custom CSS: copy the CSS into a CSS Module or global stylesheet, preserving class names.
   - If inline styles: convert to React `style={{ ... }}` objects with camelCase keys.
   - Custom fonts: register them via `next/font` or via `<link>` in `app/layout.tsx`, matching exactly the original `font-family` declarations.
   - Icons / SVGs: inline them as React components or store under `public/` and reference by path.

4. **Use `next/image` for Strapi-hosted images.** Pass `width`, `height` from Strapi metadata (`image.width`, `image.height`). For decorative images, use `priority` on above-the-fold items.

5. **Generate the page component.** App Router example:

   ```tsx
   // app/page.tsx
   import { getLandingPage } from '@/lib/strapi';
   import Header from '@/components/landing/Header';
   import Hero from '@/components/landing/Hero';
   // ... other sections

   export default async function HomePage() {
     const page = await getLandingPage();
     return (
       <>
         <Header data={page.header} />
         <Hero data={page.hero} />
         {/* ... */}
       </>
     );
   }

   export async function generateMetadata() {
     const page = await getLandingPage();
     return {
       title: page.seo.metaTitle,
       description: page.seo.metaDescription,
       openGraph: page.seo.ogImage
         ? { images: [{ url: page.seo.ogImage.url }] }
         : undefined,
     };
   }
   ```

6. **Reproduce responsive behavior.** Inspect the original HTML's media queries and ensure the React components match every breakpoint. Test mentally at 320px, 768px, 1024px, 1440px.

7. **Reproduce interactive behavior.** If the HTML had:
   - A mobile menu toggle → use a Client Component with `useState`.
   - Animations (scroll, hover, etc.) → preserve via CSS or a library like Framer Motion only if it's already in the repo.
   - Forms → wire up to whatever endpoint the original used; if it was a static form, ask the user where it should submit (e.g., a Strapi collection type for leads).

### Acceptance criteria
- ✅ Every section from the inventory has a corresponding component.
- ✅ JSX structure mirrors the original HTML semantics (`<header>`, `<section>`, `<nav>`, etc.).
- ✅ All styling is preserved — no visual regressions.
- ✅ All editable fields read from Strapi data, not hardcoded strings.
- ✅ Page renders without errors when Strapi data is present.
- ✅ Page degrades gracefully if optional fields are missing (no crashes on null).

---

## STORY 7 — Asset & Media Strategy

**Goal:** ensure all images, fonts, and icons are correctly hosted and referenced.

### Steps

1. **Categorize assets** from the original HTML:
   - **Content images** (hero shot, product screenshots, testimonial avatars) → upload to Strapi Media Library, reference via Strapi data.
   - **Brand/UI images** (logo variants used in code logic, decorative SVGs that are part of the design) → store in `public/` of the Next.js repo.
   - **Fonts** → use `next/font/google` for Google Fonts; for custom fonts, place files in `public/fonts/` and load via `next/font/local`.
   - **Favicons** → place in `app/` (App Router auto-detects `icon.png`, `apple-icon.png`, etc.).

2. **Provide an upload checklist** for the user listing every image filename from the original HTML and where it should be uploaded.

3. **Generate `remotePatterns`** entries for `next.config` covering the Strapi media domain.

4. **Verify image dimensions** are passed correctly to `next/image` — Strapi 5 returns `width` and `height` on the media object.

### Acceptance criteria
- ✅ Every image from the original HTML is accounted for (either in Strapi or `public/`).
- ✅ Fonts load with no FOUT/FOIT regression vs the original.
- ✅ `next/image` works (no console errors about unconfigured domains).

---

## STORY 8 — Verification, Deployment, Handoff

**Goal:** give the user a clear, ordered, copy-pasteable runbook to deploy and verify.

### Deliverables

1. **A deployment checklist:**

   ```
   STRAPI REPO
   [ ] git checkout -b feature/landing-page
   [ ] Add all schema files under src/api/landing-page/ and src/components/
   [ ] Run npm run develop locally → verify content type appears in admin
   [ ] Use Content-Type Builder to confirm fields render correctly
   [ ] Run seed script (or manually create the entry)
   [ ] Upload all listed images to Media Library
   [ ] Settings → Roles → Public → enable `find` on landing-page
   [ ] Settings → API Tokens → create read-only token "frontend-read"
   [ ] Commit & push → wait for Strapi Cloud to deploy
   [ ] Verify https://your-project.strapiapp.com/api/landing-page returns data

   NEXT.JS REPO
   [ ] git checkout -b feature/strapi-landing-page
   [ ] Add types/, lib/strapi.ts changes, components/landing/*, app/page.tsx
   [ ] Update .env.example
   [ ] Set NEXT_PUBLIC_STRAPI_URL and STRAPI_API_TOKEN in local .env.local
   [ ] Update next.config.{js,mjs} with image remotePatterns
   [ ] npm run dev → verify page loads at http://localhost:3000
   [ ] Visual diff against original HTML (open both side-by-side)
   [ ] Set the same env vars in Vercel/Netlify dashboard
   [ ] Push → frontend redeploys → verify production
   ```

2. **A visual verification protocol:**
   - Open the original HTML in one browser window, deployed page in another.
   - Compare at 1440px, 1024px, 768px, 375px viewports.
   - Compare in light mode and dark mode if applicable.
   - Check fonts, colors, spacing, image positions, hover states.
   - Use browser DevTools to compare computed styles on key elements.

3. **A rollback note:** if the deploy goes wrong, the user can revert by reverting the Git commits in both repos. Strapi content data is preserved in the database; only the schema goes away if the schema files are removed.

4. **A list of follow-up improvements** (optional, not part of this EPIC):
   - Add Preview mode (Strapi 5 native preview feature).
   - Add Content History review for editorial workflows.
   - Internationalization if multilingual is desired.
   - Add a sitemap.xml entry for the landing page.

### Acceptance criteria
- ✅ User can follow the checklist step-by-step without external research.
- ✅ Visual verification protocol is concrete enough to catch regressions.
- ✅ Both repos are in a state where merging the PR completes the EPIC.

---

## Cross-Cutting Rules (apply to all stories)

1. **Never invent.** If a piece of information is missing (a font URL, a brand color, an env var name), stop and ask the user.
2. **Strapi 5, not 4.** All code uses the Document Service API and the flat response format. Reject any patterns from Strapi 4 documentation.
3. **Match existing conventions.** Folder structure, naming, code style, and import order all mirror what the Next.js repo already does.
4. **Confirm before generating.** At the end of Stories 1, 2, 3, present the analysis to the user and get explicit approval before producing files.
5. **Show your work.** When showing the user the inventory or the schema, include enough detail that a human reviewer can spot omissions.
6. **One PR per repo.** All Strapi changes in one branch / one PR; all Next.js changes in another. Do not mix.
7. **Type everything.** No `any`. No untyped fetchers. No JS files in a TS project.

---

## Quick reference — Strapi 5 vs Strapi 4 traps

| Concern | Strapi 4 (do NOT use) | Strapi 5 (use) |
|---|---|---|
| Server API for entries | `strapi.entityService.findOne(...)` | `strapi.documents('api::x.x').findOne(...)` |
| Identifier | `id` | `documentId` (string) — `id` still exists for DB row |
| REST response | `{ data: { id, attributes: {...} } }` | `{ data: { id, documentId, ...fields } }` (flat) |
| Draft/Publish | Implicit `published_at` field | Explicit `status: 'draft' \| 'published'` |
| GraphQL | Nested `attributes` | Flat fields |

If the LLM finds itself writing `attributes:` inside a response handler or `entityService` in a controller, it's writing Strapi 4 code — stop and rewrite.

---

## Final note for the executing LLM

This EPIC is exhaustive on purpose. You are expected to:
- Execute stories in order.
- Pause for user approval at the gates marked in each story.
- Keep a running summary of what you've delivered so the user always knows the state of the work.
- If the user pushes you to skip a step ("just give me the code"), warn them once that the visual fidelity guarantee depends on the discovery work, then comply with whatever they decide.

End of EPIC.
