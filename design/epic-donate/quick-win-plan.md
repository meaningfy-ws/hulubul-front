# Quick-win plan — Donate (frontend-only, ~1 day)

Goal: shippable Donate flow in a single PR, with zero backend changes.

## Step 0 — Constants and types

1. Add `lib/donate.ts`:
   ```ts
   export const STRIPE_DONATE_URL =
     "https://donate.stripe.com/4gMdR8gyQ9aEfKS9hs2B200";
   ```
2. In `lib/types.ts`, extend `EditorialPageSlug` with `"doneaza"`.

## Step 1 — DonateButton component

3. `components/donate/DonateButton.tsx` — server component, plain `<a>`
   with `target="_blank" rel="noopener noreferrer"`. Variants: `primary`,
   `ghost`, `inline`. Takes a required `source` prop.
4. `components/donate/DonateButtonClient.tsx` — thin client wrapper that
   wires the `donate_click` analytics event. Default export composes the
   server `<a>` and the click handler so non-JS users still get the link.

## Step 2 — Editorial fallback content

5. Add a `doneaza` entry to `lib/editorial-fallback.ts` using the copy
   outlined in `editorial-why-donate.md`.

## Step 3 — Page route

6. `app/(marketing)/doneaza/page.tsx`:
   ```tsx
   import { EditorialPageView, makeEditorialMetadata }
     from "@/components/editorial/EditorialPageView";
   import { DonateButton } from "@/components/donate/DonateButton";

   export const generateMetadata = makeEditorialMetadata("doneaza");

   export default function DonatePage() {
     return (
       <EditorialPageView
         slug="doneaza"
         footerSlot={<DonateButton source="donate-page" variant="primary" />}
       />
     );
   }
   ```
   - If `EditorialPageView` does not yet accept a `footerSlot` prop, extend
     it with an optional slot rendered after the body. Keep the change
     minimal and backwards-compatible (other editorial pages pass nothing).

## Step 4 — Placement (see placement-ideas.md for full reasoning)

7. **Footer:** add a small "Donează" link in `Footer.tsx`. Renders only if
   the CMS doesn't already provide one (Strapi can later move it into a
   real footer column).
8. **About page (`/despre-proiect`):** append a short "Sprijină proiectul"
   paragraph + `DonateButton variant="ghost" source="about-page"` via the
   same `footerSlot` mechanism.

## Step 5 — Analytics, SEO, a11y

9. Extend the analytics module so `donate_click` is a known event with a
   `{ source: string }` payload.
10. Add `/doneaza` to `app/sitemap.ts`.
11. Verify Lighthouse a11y on `/doneaza` ≥ 95 and that the "redirect to
    Stripe" disclaimer is visible (not only `title=`).

## Step 6 — Tests

12. Unit: `DonateButton` renders the right href and `rel`; click handler
    fires the analytics event with the supplied `source`.
13. E2E (Playwright, if present): visiting `/doneaza` shows the title from
    fallback copy and the CTA points to `STRIPE_DONATE_URL`.

## Step 7 — Done

14. Update `design/epic-donate/README.md` status to "Shipped (quick win)".
15. Open a follow-up issue: "Backend: create `page-doneaza` single-type"
    referencing `spec.md §4`.

## Explicitly not in this PR

- No Stripe SDK install.
- No backend / Strapi changes (those are a separate backend spec).
- No `/doneaza/multumim` thank-you page (we don't control success_url yet).
- No nav-bar Donate button (see placement-ideas.md — not recommended right now).
