# Epic — Donate

**Status:** Draft (brainstorm). Not yet started.
**Owner:** Frontend (this repo). Backend changes only if/when we move past the
quick-win redirect.

## Goal

Give visitors a clear, low-friction way to financially support Hulubul, with
honest editorial framing of *why* we ask and *what the money does*.

## Constraints we already know

- We already have a Stripe Payment Link:
  `https://donate.stripe.com/4gMdR8gyQ9aEfKS9hs2B200`
- Site is Romanian-language; copy must be in RO.
- Editorial pages live as Strapi single-types with a frontend fallback
  (`lib/editorial-fallback.ts`); see `design/spec-editorial-pages.md`. The
  donate "why" page should follow the same pattern.
- We do not want to write or change anything in the backend repo without an
  explicit spec. Quick win must therefore be 100% frontend.
- PCI scope must stay at zero. We never accept card data on our domain.
- Marketing routes live in `app/(marketing)/...`. Footer columns come from
  the `landing-page` Strapi entry.

## Documents in this epic

1. `spec.md` — full spec: routes, content model, integration choices, risks.
2. `quick-win-plan.md` — what we ship first (1–2 day effort), step by step.
3. `placement-ideas.md` — where Donate CTAs can/should appear, ranked.
4. `editorial-why-donate.md` — content brief for the "why donate" editorial
   page (Strapi single-type spec for the backend, plus fallback copy outline).

## TL;DR recommendation

- **Ship the quick win first:** one editorial "why donate" page at
  `/doneaza` with a primary CTA button that **opens the Stripe Payment Link
  in a new tab** (`target="_blank" rel="noopener"`). Plus a small Donate
  link in the footer and a soft Donate mention on `/despre-proiect`.
- **Do not iframe the Stripe Payment Link.** Stripe sends
  `X-Frame-Options: DENY` / a restrictive `frame-ancestors` CSP, so an
  iframe simply will not render. It is also a known anti-pattern for
  payments (trust, Apple/Google Pay, 3DS redirects).
- **Defer deeper integration** (Stripe Checkout Sessions via API, donor
  records in Strapi, recurring tiers, on-site thank-you) until we have a
  real reason — recurring donations, donor recognition, or analytics that
  Stripe Dashboard alone cannot answer.
