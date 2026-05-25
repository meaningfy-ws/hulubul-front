// Type declaration for Stripe's Buy Button web component.
// Loaded via <script src="https://js.stripe.com/v3/buy-button.js" /> and
// rendered as a custom element. Augments React's JSX namespace (React 19)
// so JSX usages type-check. See components/donate/StripeBuyButton.tsx.

import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "stripe-buy-button": {
        "buy-button-id": string;
        "publishable-key": string;
        children?: React.ReactNode;
      };
    }
  }
}
