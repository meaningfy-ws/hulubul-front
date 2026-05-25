/**
 * Single source of truth for the donation surfaces.
 *
 * The donate page (`/doneaza`, `/donate`) embeds Stripe's Buy Button web
 * component — `STRIPE_BUY_BUTTON_ID` + `STRIPE_PUBLISHABLE_KEY` configure
 * that. The Buy Button currently points at a one-time-payment Payment
 * Link; recurring tiers will be added later (see
 * `design/epic-donate/spec.md`).
 *
 * `STRIPE_DONATE_URL` is the raw Payment Link kept for surfaces where
 * loading the Buy Button script would be overkill (the DonateButton
 * utility — used by the footer / nav-style links — redirects to it).
 */
export const STRIPE_DONATE_URL =
  "https://donate.stripe.com/4gMdR8gyQ9aEfKS9hs2B200";

export const STRIPE_BUY_BUTTON_ID = "buy_btn_1Tb4n5AHGot2S1q7GV49wkLx";

export const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51LrpToAHGot2S1q7dYjrKaATGL9kc6b3ccMljDU5zjEEIKK6juQ5qXf0oEV2SHAZBHhXmtpPQlVWDrQ60zwl42VO00F51Yc9g6";
