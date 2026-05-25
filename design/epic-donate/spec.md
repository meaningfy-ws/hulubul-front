# Spec — Donate

## 1. Scope

Add a way for visitors to donate to Hulubul. In scope:

- A new editorial page `/doneaza` explaining why we ask for donations and
  how the money is used.
- A primary "Donează" CTA that sends the user to our existing Stripe
  Payment Link.
- Donate links placed in a small number of well-chosen locations across the
  marketing site (see `placement-ideas.md`).
- Strapi single-type for the editorial content (so copy can change without a
  deploy), with a frontend fallback for the period before backend ships.
- Light client-side analytics so we can tell whether anyone clicks Donate.

Out of scope for this epic (revisit later if the data justifies it):

- Stripe Checkout Sessions created from our backend.
- Custom amount picker / preset tiers rendered in our UI.
- Recurring / subscription donations.
- Donor records, donor wall, tax-receipt generation, CRM sync.
- On-site thank-you page tied to a real payment confirmation.

## 2. Why a redirect, not an iframe, not a deeper integration

**Iframe is not an option.** Stripe Payment Links and Stripe Checkout both
respond with `X-Frame-Options: DENY` (and equivalent `frame-ancestors`
CSP). Browsers will refuse to render them inside an iframe. This is
deliberate on Stripe's side — embedding a payment form in a third-party
iframe is a phishing risk and breaks 3DS / wallet redirects.

**Deep integration costs more than it pays right now.** Switching from a
Payment Link to a server-created Checkout Session unlocks: pre-selected
amounts, locale forcing, metadata on the payment (e.g. campaign), and a
controlled `success_url` back to our site. None of that is worth the
plumbing until we actually have a concrete need (recurring donations, donor
attribution to a logged-in account, multi-currency presets, etc.).

**Therefore:** the CTA is an `<a href="…stripe link…" target="_blank"
rel="noopener noreferrer">` that opens the Payment Link in a new tab. The
"new tab" choice keeps our page in the visitor's history (they can come
back), matches user expectation for "off-site payment", and avoids losing
scroll position / consent state.

## 3. Routes and components

### 3.1 New route

- `app/(marketing)/doneaza/page.tsx`
  - Uses the existing `EditorialPageView` pattern (see
    `app/(marketing)/despre-proiect/page.tsx`).
  - Slug: `doneaza`.
  - Adds the slug to `EditorialPageSlug` in `lib/types.ts`.
  - Adds a fallback entry in `lib/editorial-fallback.ts`.

### 3.2 New shared component

- `components/donate/DonateButton.tsx`
  - Server component, no client JS needed for the link itself.
  - Props: `label?: string` (default "Donează"), `variant?: "primary" |
    "ghost" | "inline"`, `source: string` (used for analytics — e.g.
    `"nav"`, `"footer"`, `"donate-page"`, `"about-page"`).
  - Renders an `<a>` to the Stripe URL from a single constant.
  - Fires a client-side analytics event on click via a tiny
    `"use client"` wrapper (`DonateButtonClient.tsx`) only when analytics
    is enabled — keep the no-JS version working.

### 3.3 New constant

- `lib/donate.ts`
  ```ts
  export const STRIPE_DONATE_URL =
    "https://donate.stripe.com/4gMdR8gyQ9aEfKS9hs2B200";
  ```
  Single source of truth. Future migration to Checkout Session only changes
  this file.

## 4. Content model (Strapi single-type)

Follow `design/spec-editorial-pages.md` exactly. New single-type:

| Field             | Type     | Required | Notes                                                       |
|-------------------|----------|----------|-------------------------------------------------------------|
| `slug`            | string   | yes      | Constant `"doneaza"`.                                       |
| `title`           | string   | yes      | e.g. `"Susține Hulubul"`.                                   |
| `lastUpdated`     | string   | yes      | RO date string, shown under the title.                      |
| `body`            | richtext | yes      | Markdown. Sections via `##`. Inline links allowed.          |
| `metaDescription` | string   | no       | For `<meta name="description">`.                            |
| `ctaLabel`        | string   | no       | Default `"Donează prin Stripe"` if absent.                  |
| `ctaNote`         | string   | no       | Small disclaimer under the button (e.g. "Vei fi redirecționat către Stripe."). |

API endpoint: `GET /api/page-doneaza?status=published`. Token permission
mirrors the other editorial single-types.

Until the backend ships the type, `lib/editorial-fallback.ts` serves the
copy. The fallback content lives in `editorial-why-donate.md` of this epic.

## 5. Analytics

- Add a `donate_click` event with properties `{ source: string }` to the
  existing analytics pipeline (see `components/analytics/`). One event per
  click. No PII.
- Goal: answer "do people click Donate, and from which surface?". This is
  the only thing we need to decide whether a deeper integration is worth
  it later.

## 6. SEO

- `/doneaza` has its own `generateMetadata` via `makeEditorialMetadata`
  (already supported by the editorial helper). Title pattern: `"Donează —
  Hulubul"`.
- Add `/doneaza` to `app/sitemap.ts`.
- `robots.ts` already allows the marketing site; no change needed.
- Do **not** set `noindex`; we want the page to be findable.

## 7. Accessibility

- The button must be a real `<a>`, not a `<button>` with `onClick=window.open`.
- `aria-label` on icon-only variants (footer link is text-only, so n/a).
- `target="_blank"` requires `rel="noopener noreferrer"` (already a project
  pattern — see `Footer.tsx`).
- The "you'll be redirected to Stripe" disclaimer must be visible (not
  only via `title=`).

## 8. Risks and mitigations

| Risk                                                | Mitigation                                                                 |
|-----------------------------------------------------|----------------------------------------------------------------------------|
| Stripe link rotates / is replaced.                  | Single constant in `lib/donate.ts`. One-line change.                       |
| Visitor expects to stay on our site after donating. | Visible "you will be redirected to Stripe" note next to the CTA.           |
| Trust concern (is this really us?).                 | Editorial page explains who we are and links to `/despre-proiect`.         |
| Donation page feels mercenary.                      | Tone in `editorial-why-donate.md` is gratitude-first, not guilt-tripping.  |
| Footer column already busy (Survey CTA injected).   | Place Donate as a small standalone link, not inside an existing column.    |

## 9. Definition of done (quick win)

- `/doneaza` page renders with fallback copy.
- Donate CTA links to the Stripe Payment Link, opens in a new tab.
- Donate link visible in the footer and on the about page.
- `donate_click` event fires with the correct `source` value.
- Lighthouse a11y on `/doneaza` stays ≥ 95.
- `npm run typecheck` and the test suite pass.
- README of this epic updated with the actual file paths once shipped.

## 10. Later (only when justified)

- Replace `STRIPE_DONATE_URL` with a server route
  `/api/donate/checkout-session` that creates a Stripe Checkout Session with
  amount/metadata and 302s to `session.url`. Adds: amount presets,
  campaign metadata, `success_url=/doneaza/multumim`.
- `/doneaza/multumim` (thank-you page) only when we control the
  `success_url` — i.e. only after the Checkout Session migration.
- Recurring donations as a second product in Stripe; UI toggle "o singură
  dată / lunar".
- Strapi `Donor` collection only if we ever offer public donor recognition;
  otherwise leave donor data in Stripe.
