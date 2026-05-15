import Script from "next/script";

/**
 * Inline `<Script strategy="beforeInteractive">` that pushes the
 * Google Consent Mode v2 default to dataLayer **before** gtag.js
 * loads. Required by the docs at:
 * https://developers.google.com/tag-platform/security/guides/consent?consentmode=advanced
 *
 * "Before gtag" matters because:
 *   - Even with `async` loading, gtag.js can parse before any React
 *     useEffect fires. If the default isn't in dataLayer when gtag
 *     reads it, GA4 may treat the visit as fully-consented and send
 *     identifiers it shouldn't.
 *   - `beforeInteractive` injects the script into the rendered HTML
 *     so it's parsed in document order, *before* any other Next.js
 *     scripts. Guaranteed first.
 *
 * Mounted once at the very top of <body> in app/layout.tsx, before
 * <ConsentProvider> and friends. The same default is also pushed
 * (idempotently) from <Analytics> in case HMR / soft navigation
 * resets things — defense in depth.
 */
export function ConsentDefaultsScript() {
  return (
    <Script id="hulubul-consent-defaults" strategy="beforeInteractive">
      {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});`}
    </Script>
  );
}
