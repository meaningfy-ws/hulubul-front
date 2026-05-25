/**
 * Single source of truth for the donation surfaces.
 *
 * The donate page (`/doneaza`, `/donate`) embeds two Stripe Buy Button
 * web components — one for one-time donations, one for recurring monthly
 * tiers. The raw Payment Link URLs are kept for `<noscript>` fallbacks
 * (the page still works with JS disabled) and for the DonateButton
 * utility used by the footer.
 *
 * ## Configuration
 *
 * Production defaults are baked in (same pattern as
 * `lib/tracking/config.ts`). Each value can be overridden at build time
 * via an env var — useful for pointing a staging / preview deploy at a
 * test Stripe account without a code change.
 *
 * Recognised env vars (all NEXT_PUBLIC_ because they are read in the
 * client bundle):
 *
 *   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
 *   - `NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID_ONCE`
 *   - `NEXT_PUBLIC_STRIPE_DONATE_URL_ONCE`
 *   - `NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID_RECURRING`
 *   - `NEXT_PUBLIC_STRIPE_DONATE_URL_RECURRING`
 *
 * None of these are secrets: the publishable key is designed to be
 * public (visible in every client bundle that loads Stripe.js), and
 * Buy Button IDs / Payment Link URLs are visible to any donor who
 * actually clicks through. Treat them as configuration, not credentials.
 *
 * If a deploy uses Docker, the variables also need to be declared as
 * build args in the Dockerfile (NEXT_PUBLIC_* must be present at
 * `next build` time — Next.js inlines them into the bundle).
 */

function withDefault(envValue: string | undefined, fallback: string): string {
  const trimmed = envValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export const STRIPE_PUBLISHABLE_KEY = withDefault(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  "pk_live_51LrpToAHGot2S1q7dYjrKaATGL9kc6b3ccMljDU5zjEEIKK6juQ5qXf0oEV2SHAZBHhXmtpPQlVWDrQ60zwl42VO00F51Yc9g6",
);

// ---- One-time donation (donor types any amount) --------------------------

export const STRIPE_BUY_BUTTON_ID = withDefault(
  process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID_ONCE,
  "buy_btn_1Tb4n5AHGot2S1q7GV49wkLx",
);

export const STRIPE_DONATE_URL = withDefault(
  process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_ONCE,
  "https://donate.stripe.com/4gMdR8gyQ9aEfKS9hs2B200",
);

// ---- Recurring monthly donation (donor picks a tier) ---------------------

export const STRIPE_BUY_BUTTON_ID_RECURRING = withDefault(
  process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID_RECURRING,
  "buy_btn_1Tb6vmAHGot2S1q7PZbGau5d",
);

export const STRIPE_DONATE_URL_RECURRING = withDefault(
  process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_RECURRING,
  "https://buy.stripe.com/9B614m4Q8gD69mu8do2B201",
);
