import type { ConsentChoice } from "./types";

/**
 * Bridge between our consent state and Google's `gtag()` consent
 * surface. Calls go through `window.dataLayer.push(["consent", ...])`
 * directly — works **before** the GA4 script has loaded, because gtag
 * is just `dataLayer.push` and the queued calls are replayed once
 * `gtag/js` parses.
 *
 * Used by:
 * - The inline bootstrap in `<ConsentProvider>` (or layout) to push
 *   the `default` state with everything denied — required by Google
 *   Consent Mode v2 from March 2024 onward.
 * - The `<Analytics>` component when consent changes, to push the
 *   `update`.
 *
 * No reference to `gtag/js` is required — pushing to `dataLayer`
 * before the script loads is the documented pattern.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Idempotently ensures `window.dataLayer` exists. Safe to call from
 * multiple components on mount.
 */
export function ensureGtagBootstrap(): void {
  if (typeof window === "undefined") return;
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
}

/**
 * The canonical `gtag()` call.
 *
 * ⚠️ This MUST push an `arguments` object — NOT a plain array.
 * gtag.js inspects each `dataLayer` entry and only treats it as a
 * gtag command (`consent`, `config`, `event`, …) when it is an
 * `arguments` object. A plain `["consent", "update", {…}]` array is
 * interpreted as GTM-style data and **silently ignored**, which
 * previously broke Consent Mode `update` (consenting users produced
 * no hits) and dropped every custom `event`. This mirrors Google's
 * documented snippet exactly: `function gtag(){dataLayer.push(arguments)}`.
 */
export function gtag(...args: unknown[]): void {
  ensureGtagBootstrap();
  if (typeof window === "undefined") return;
  const push = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  } as (...a: unknown[]) => void;
  push(...args);
}

/**
 * Pushes the Consent Mode v2 default. Must run BEFORE GA4 loads —
 * call this in an effect that mounts above the `<GoogleAnalytics>`
 * component, or in an inline bootstrap script.
 *
 * `wait_for_update: 500` gives the consent banner up to 500 ms to
 * resolve the user's choice; until then GA4 buffers events without
 * sending them. Choosing within 500 ms means the very first page_view
 * is attributable.
 */
export function pushConsentDefault(): void {
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  });
}

/**
 * Pushes the Consent Mode v2 update. Call whenever the user's choice
 * changes (banner save, withdrawal).
 */
export function pushConsentUpdate(choice: ConsentChoice): void {
  const ad = choice.marketing === "granted" ? "granted" : "denied";
  const analytics = choice.analytics === "granted" ? "granted" : "denied";
  gtag("consent", "update", {
    ad_storage: ad,
    ad_user_data: ad,
    ad_personalization: ad,
    analytics_storage: analytics,
  });
}
