/**
 * Single source of truth for the donation destination. The quick-win Donate
 * flow is a simple redirect to a Stripe Payment Link — see
 * `design/epic-donate/spec.md`. If/when we migrate to server-created
 * Checkout Sessions, only this constant changes.
 */
export const STRIPE_DONATE_URL =
  "https://donate.stripe.com/4gMdR8gyQ9aEfKS9hs2B200";
