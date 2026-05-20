import { logger } from "./logger";
import type { LandingPage } from "./types";

// Dot paths whose value must be a non-empty array. The CMS will happily
// return `[]` when a nested repeatable wasn't populated or was wiped — the
// type system can't tell that apart from "this field is just empty". A
// missed populate or a broken locale clone (like the en→ro footer regression)
// then renders as silent blank sections. Listed here so the loader can warn.
const NONEMPTY_PATHS = [
  "hero.handwrittenLines",
  "problem.cards",
  "howItWorks.steps",
  "audience.cards",
  "trust.items",
  "signup.roleOptions",
  "faq.items",
  "footer.columns",
] as const;

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Logs a warning for every path in NONEMPTY_PATHS that is missing or empty.
 * Plus the per-column `links` array, which is two levels deep and the most
 * recent failure mode. Non-throwing: the renderer keeps going, but the issue
 * surfaces in server logs (and the browser console in dev SSR).
 */
export function reportEmptyLandingSections(page: LandingPage): void {
  for (const path of NONEMPTY_PATHS) {
    const value = get(page, path);
    if (!Array.isArray(value) || value.length === 0) {
      logger.warn("cms/landing", `empty or missing repeatable: ${path}`);
    }
  }
  const columns = page.footer?.columns ?? [];
  columns.forEach((col, i) => {
    if (!Array.isArray(col.links) || col.links.length === 0) {
      logger.warn(
        "cms/landing",
        `empty or missing repeatable: footer.columns[${i}].links (title=${col.title})`,
      );
    }
  });
}
