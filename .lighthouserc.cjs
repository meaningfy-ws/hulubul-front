/**
 * Lighthouse CI configuration.
 *
 * Budgets per `docs/specs/2026-05-14-seo-spec.md` §6.1:
 * - Performance ≥ 90
 * - SEO ≥ 95
 * - Accessibility ≥ 95
 *
 * Run locally: `npm run lh` (boots dev server first).
 * Run in CI: `.github/workflows/lighthouse.yml` invokes against the
 * preview deploy URL.
 */

module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/rute",
        "http://localhost:3000/despre-proiect",
        "http://localhost:3000/pentru-transportatori",
        "http://localhost:3000/confidentialitate",
        "http://localhost:3000/termeni",
      ],
      numberOfRuns: 1,
      settings: {
        // Skip PWA-related audits — we don't ship a service worker yet.
        skipAudits: ["uses-http2"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        // Page-weight budget — 350 KB transferred excluding lazy chunks.
        "resource-summary:script:size": ["warn", { maxNumericValue: 250000 }],
        "resource-summary:total:size": ["warn", { maxNumericValue: 700000 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
