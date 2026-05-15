/**
 * Production tracking configuration constants.
 *
 * These are intentionally hardcoded — the GA4 Measurement ID is not a
 * secret (it's visible in every page's HTML once gtag.js loads) and
 * baking it into the bundle means production deploys work without
 * any env-var ceremony. Staging / preview deploys can still override
 * via `NEXT_PUBLIC_GA_ID` to point at a separate GA property.
 *
 * The `GA4_API_SECRET` for server-side Measurement Protocol is NOT
 * here — it IS a secret and must come from an env var.
 */

export const PRODUCTION_GA_ID = "G-3M58NGR6PX";

/**
 * Resolve the GA4 measurement ID: explicit env var wins (used to
 * point staging/preview at a separate property), otherwise the
 * production constant.
 *
 * Returns `null` when explicitly set to an empty string — the env
 * var being empty is the documented way to disable analytics in
 * local dev.
 */
export function resolveGaId(envValue: string | undefined): string | null {
  if (envValue === "") return null; // explicit opt-out
  if (envValue && envValue.length > 0) return envValue;
  return PRODUCTION_GA_ID;
}
