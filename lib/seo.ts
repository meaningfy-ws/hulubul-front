/**
 * Single source of truth for SEO constants and URL helpers.
 *
 * - `getMetadataBase()` and `makeCanonical()` resolve the absolute URLs
 *   the Next.js Metadata API needs (so OG images and canonical links
 *   are absolute, not relative).
 * - The constants here are referenced by `app/layout.tsx`, `app/sitemap.ts`,
 *   `app/robots.ts`, and the JSON-LD builders.
 */

export const SITE_NAME = "hulubul.com";

export const PRODUCTION_SITE_URL = "https://hulubul.com";

/**
 * Public contact mailbox. Single source of truth — update here when the
 * address changes (see note in lib/editorial-fallback.ts about go-live).
 */
export const CONTACT_EMAIL = "hi@meaningfy.ws";

export const DEFAULT_SITE_DESCRIPTION =
  "Platforma care conectează diaspora moldovenească cu transportatorii care trec prin orașul tău săptămâna asta.";

export const DEFAULT_LOCALE = "ro_RO";

// "hulubul.com" or the bare word "hulubul", anywhere, case-insensitive.
const BRAND_PATTERN = /\bhulubul(\.com)?\b/i;

/**
 * Normalises a page/CMS title for the Next.js Metadata API so the root
 * `title.template` (`%s — hulubul.com`) never double-brands.
 *
 * - Already contains the brand (e.g. CMS "hulubul.com — …", or a static
 *   "… — Hulubul") → return `{ absolute }` so Next skips the template.
 * - No brand → return the plain string so the template appends the brand.
 * - Empty/missing → the bare brand (never a blank or doubled title).
 *
 * Robust regardless of what editors type in Strapi `seo.metaTitle`.
 */
export function pageTitle(
  raw: string | null | undefined,
): string | { absolute: string } {
  const t = (raw ?? "").trim();
  if (t === "") return { absolute: SITE_NAME };
  if (BRAND_PATTERN.test(t)) return { absolute: t };
  return t;
}

/**
 * Returns the base URL the app is served from. Reads
 * `NEXT_PUBLIC_SITE_URL` and falls back to the production URL — so
 * builds without the env var still produce sensible absolute URLs
 * (production, not localhost).
 */
export function getMetadataBase(): URL {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const raw = env && env.length > 0 ? env : PRODUCTION_SITE_URL;
  // Strip trailing slashes so URL constructor produces the same href.
  return new URL(raw.replace(/\/+$/, ""));
}

/**
 * Returns the absolute canonical URL for a path. The path may or may
 * not include a leading slash; the root path "/" is preserved.
 */
export function makeCanonical(path: string): string {
  const base = getMetadataBase().href.replace(/\/$/, "");
  if (path === "/" || path === "") return `${base}/`;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalised}`;
}

/**
 * Single source of truth for routes that crawlers may follow. Used by
 * `app/sitemap.ts` to enumerate URLs and by `app/robots.ts` indirectly
 * (the deny-list complements this allow-list).
 *
 * `changeFrequency` and `priority` are advisory — modern Googlebot
 * mostly ignores them, but Bing still uses them.
 */
export interface IndexableRoute {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}

export const INDEXABLE_ROUTES: readonly IndexableRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/rute", changeFrequency: "daily", priority: 0.8 },
  { path: "/pentru-transportatori", changeFrequency: "monthly", priority: 0.7 },
  { path: "/despre-proiect", changeFrequency: "monthly", priority: 0.6 },
  { path: "/confidentialitate", changeFrequency: "monthly", priority: 0.5 },
  { path: "/termeni", changeFrequency: "monthly", priority: 0.5 },
  { path: "/doneaza", changeFrequency: "monthly", priority: 0.5 },
  { path: "/donate", changeFrequency: "monthly", priority: 0.5 },
] as const;

/**
 * Crawler deny-list. Mirrored in `app/robots.ts`. Defense in depth on
 * top of per-page `noindex` metadata.
 */
export const BLOCKED_ROUTE_PREFIXES = ["/admin/", "/api/", "/sondaj/"] as const;

/**
 * Returns the absolute URL of the dynamic OG image for a given title +
 * subtitle. The route handler at `app/og/route.tsx` renders a
 * 1200×630 PNG with the brand fonts.
 *
 * Pages without a CMS-supplied `shareImage` use this as the OG image
 * default in their `generateMetadata`. The static
 * `/og-default.png` (in `public/`) is the fallback used at the root
 * layout level.
 */
export function makeOgImage(title: string, subtitle?: string): string {
  const params = new URLSearchParams({ title });
  if (subtitle) params.set("subtitle", subtitle);
  return makeCanonical(`/og?${params.toString()}`);
}
