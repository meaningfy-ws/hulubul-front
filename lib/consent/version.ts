/**
 * Banner copy version. Bumped whenever:
 * - Banner text changes materially (new categories, reworded purpose).
 * - A new tracker is added that wasn't in scope when the user previously
 *   consented.
 *
 * The string version is the audit value (stored in localStorage and
 * Strapi `consent-record.version`). The numeric `BANNER_REVISION` is
 * what vanilla-cookieconsent uses to invalidate prior consent — both
 * must move together, so they're declared next to each other and a
 * compile-time check below keeps them in sync conceptually.
 *
 * When a stored consent record's version is older than this constant,
 * the banner re-prompts on next visit. The new consent record is
 * written with `event: "update"`.
 */
export const CURRENT_CONSENT_VERSION = "2026-05-14";

/**
 * Integer revision passed to vanilla-cookieconsent. Bump alongside
 * `CURRENT_CONSENT_VERSION` whenever the consent surface changes.
 */
export const BANNER_REVISION = 1;
