/**
 * Architectural boundaries for the hulubul-front codebase.
 *
 * Layering (per design docs and the Meaningfy coding guide):
 *   app/        — entrypoints (route handlers, server pages, layouts)
 *   components/ — UI components (server + client)
 *   lib/        — adapters, services, schemas, helpers (leaf-only)
 *
 * Allowed direction: app/ → components/ + lib/   ;   components/ → lib/
 * Forbidden:         lib/ → components/ or app/  ;  components/ → app/
 *
 * `app/api/*` is the only place that mutates external services (POST/PUT/
 * DELETE to Strapi). UI components must call route handlers, not Strapi
 * directly — but enforcing that needs a write-detector we don't have yet,
 * so it's documented here and audited manually.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "lib-must-not-import-components",
      severity: "error",
      comment:
        "lib/ is leaf-only. UI concerns belong in components/, not in lib/.",
      from: { path: "^lib/" },
      to: { path: "^components/" },
    },
    {
      name: "lib-must-not-import-app",
      severity: "error",
      comment:
        "lib/ is leaf-only. Importing from app/ would invert the layering.",
      from: { path: "^lib/" },
      to: { path: "^app/" },
    },
    {
      name: "components-must-not-import-app",
      severity: "error",
      comment:
        "components/ render in pages, not the other way around. App routes orchestrate; components display. Exception: Next.js Server Actions live next to the page that uses them (e.g. app/admin/rute/actions.ts) — those are an entrypoint mechanism imported by the matching admin component, by design.",
      from: { path: "^components/" },
      to: {
        path: "^app/",
        // Allow imports of server actions files (`actions.ts` / `actions.tsx`)
        // — the canonical Next.js App Router convention for Server Actions.
        pathNot: "^app/.+/actions\\.tsx?$",
      },
    },
    {
      name: "no-circular",
      severity: "warn",
      comment: "Circular dependencies hint at fuzzy module boundaries.",
      from: {},
      to: { circular: true },
    },
    // `no-orphans` deliberately omitted: Next.js App Router files are
    // discovered by the framework (not imported), and dependency-cruiser's
    // safe-regexp check rejects most realistic ignore patterns. Re-enable
    // with a hand-tuned set if dead-code hunting becomes a recurring need.
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "(^|/)node_modules/|(^|/)\\.next/|(^|/)dist/|(^|/)coverage/|tests/msw/",
    },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
