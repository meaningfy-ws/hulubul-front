"use client";

import Script from "next/script";
import {
  STRIPE_BUY_BUTTON_ID,
  STRIPE_DONATE_URL,
  STRIPE_PUBLISHABLE_KEY,
} from "@/lib/donate";

interface StripeBuyButtonProps {
  /** Visible title above the card. */
  title?: string;
  /** Short paragraph below the title, above the button. */
  description?: string;
  /** Plain-text fallback rendered inside <noscript> when JS is disabled. */
  fallbackLabel?: string;
}

/**
 * Embeds the Stripe Buy Button web component. Loads the loader script via
 * next/script (afterInteractive — safe to defer; the custom element upgrades
 * itself once `customElements.define` runs). A <noscript> fallback links
 * directly to the underlying Payment Link, so donors without JS still have
 * a working path.
 *
 * Stripe's Buy Button renders an internal iframe — this is Stripe's own
 * embed surface (unlike trying to iframe a Payment Link, which is blocked
 * by their X-Frame-Options).
 */
export function StripeBuyButton({
  title,
  description,
  fallbackLabel = "Donează prin Stripe",
}: StripeBuyButtonProps) {
  return (
    <div className="donate-card">
      <Script
        src="https://js.stripe.com/v3/buy-button.js"
        strategy="afterInteractive"
      />
      {title ? <h2 className="donate-card-title">{title}</h2> : null}
      {description ? (
        <p className="donate-card-description">{description}</p>
      ) : null}

      <stripe-buy-button
        buy-button-id={STRIPE_BUY_BUTTON_ID}
        publishable-key={STRIPE_PUBLISHABLE_KEY}
      />

      <noscript>
        <a
          href={STRIPE_DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="donate-button donate-button--primary"
        >
          {fallbackLabel}
        </a>
      </noscript>
    </div>
  );
}
