/**
 * Locale model — single source of truth. `ro` is the default/fallback
 * and stays unprefixed in URLs (preserves current routes + SEO). `en`
 * is served under `/en`. Strapi's default locale is also `ro`
 * (STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE=ro), so a request with no
 * `locale` param returns `ro`.
 */

export const SUPPORTED_LOCALES = ["ro", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE_CODE: Locale = "ro";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}
