import type { NextConfig } from "next";

// Production CSP — strict by default. Next.js dev uses inline scripts +
// eval for HMR, so we relax the policy under NODE_ENV=development. See
// design/epic-signup/remember-me.md §8 for why a CSP is a prerequisite
// for the localStorage-based remember-me feature.
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next 15 inlines small runtime scripts + next/font CSS as inline styles.
  // 'unsafe-inline' on styles is standard for next/font workflows.
  // GTM hosts the gtag.js loader at googletagmanager.com — needed for
  // GA4 (NEXT_PUBLIC_GA_ID). When we migrate to a GTM container the
  // same host serves both gtag.js and gtm.js, so no further change.
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com"
    : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.strapiapp.com https://*.media.strapiapp.com https://*.tile.openstreetmap.org https://api.hulubul.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.strapiapp.com https://api.hulubul.com https://www.google-analytics.com https://*.google-analytics.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Geolocation is allowed only for our own pages — the SignupForm
  // optionally requests it to enrich the waitlist record's `location`
  // field. Camera + microphone stay blocked outright.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.strapiapp.com" },
      { protocol: "https", hostname: "*.media.strapiapp.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
