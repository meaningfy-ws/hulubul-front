/**
 * Source of truth for the donation URLs.
 *
 * The donate pages (`/doneaza`, `/donate`) render two plain `<a>` links
 * styled as cards by our own CSS — no Stripe Buy Button / Pricing Table
 * embeds. Clicking a link opens Stripe's hosted Payment Link page in a
 * new tab.
 *
 * Production defaults are baked in (same pattern as
 * `lib/tracking/config.ts`). Each URL can be overridden at build time
 * via an env var — useful for pointing a staging / preview deploy at a
 * test Stripe Payment Link without a code change.
 *
 * Recognised env vars (NEXT_PUBLIC_ because they end up in the client
 * bundle):
 *
 *   - `NEXT_PUBLIC_STRIPE_DONATE_URL_ONCE`
 *   - `NEXT_PUBLIC_STRIPE_DONATE_URL_RECURRING`
 *
 * Neither is a secret — Payment Link URLs are visible to any donor who
 * clicks through. Treat them as configuration, not credentials.
 */

function withDefault(envValue: string | undefined, fallback: string): string {
  const trimmed = envValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

/** One-time donation — donor types any amount on the Stripe page. */
export const STRIPE_DONATE_URL = withDefault(
  process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_ONCE,
  "https://donate.stripe.com/4gMdR8gyQ9aEfKS9hs2B200",
);

/** Recurring monthly donation — donor picks a tier on the Stripe page. */
export const STRIPE_DONATE_URL_RECURRING = withDefault(
  process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_RECURRING,
  "https://buy.stripe.com/9B614m4Q8gD69mu8do2B201",
);
