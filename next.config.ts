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
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.strapiapp.com https://*.media.strapiapp.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.strapiapp.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const config: NextConfig = {
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
