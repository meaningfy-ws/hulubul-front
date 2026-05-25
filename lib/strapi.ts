import qs from "qs";
import { buildLandingPopulate } from "./populate";
import { reportEmptyLandingSections } from "./landing-invariants";
import { logger } from "./logger";
import {
  isStrapiNotFound,
  parseStrapiError,
  strapiFetch,
  StrapiNotFoundError,
  throwStrapiError,
} from "./strapi-client";
import type { BlocksContent } from "@strapi/blocks-react-renderer";
import type { LandingPage, EditorialPage } from "./types";
import type { WaitlistPayload } from "./waitlist-schema";
import { formatRoDate } from "./dates";
import { DEFAULT_LOCALE_CODE, type Locale } from "./locale";

/**
 * Strapi has no automatic locale fallback. We omit the `locale` param
 * for the default locale (ro) so the request — and its cache key — stays
 * byte-identical to the pre-i18n behaviour; only non-default locales add
 * `&locale=<code>` and fall back to ro when the entry isn't translated.
 */
function localeQuery(locale: Locale): Record<string, string> {
  return locale === DEFAULT_LOCALE_CODE ? {} : { locale };
}

export class LandingPageNotPublishedError extends Error {
  constructor() {
    super(
      "Strapi returned 404 for /api/landing-page. The single type exists in the schema but no entry has been published yet. Run the seed script on Strapi Cloud (see design/strapi-runbook.md §2).",
    );
    this.name = "LandingPageNotPublishedError";
  }
}

export async function getLandingPage(
  locale: Locale = DEFAULT_LOCALE_CODE,
): Promise<LandingPage> {
  const query = qs.stringify(
    {
      populate: buildLandingPopulate(),
      status: "published",
      ...localeQuery(locale),
    },
    { encodeValuesOnly: true },
  );
  const path = `/api/landing-page?${query}`;
  const res = await strapiFetch(path, { mode: "static" });

  if (res.status === 404 || res.ok === false) {
    // Non-default locale not translated yet → serve ro rather than blank.
    if (locale !== DEFAULT_LOCALE_CODE) return getLandingPage(DEFAULT_LOCALE_CODE);
    if (res.status === 404) throw new LandingPageNotPublishedError();
    throwStrapiError(path, res);
  }

  const json = (await res.json()) as { data: LandingPage | null };
  if (!json.data) {
    if (locale !== DEFAULT_LOCALE_CODE) return getLandingPage(DEFAULT_LOCALE_CODE);
    throw new LandingPageNotPublishedError();
  }
  reportEmptyLandingSections(json.data);
  return json.data;
}

export async function getEditorialPage(
  slug: EditorialPage["slug"],
  locale: Locale = DEFAULT_LOCALE_CODE,
): Promise<EditorialPage | null> {
  // Editorial source for static pages (legal + about). One Strapi single-type
  // per slug, named `page-{slug}` (e.g. page-confidentialitate, page-termeni,
  // page-despre-proiect). See design/spec-editorial-pages.md.
  // Returns null when the content type or entry is missing so callers can
  // render the build-time fallback while the backend ships the schema.
  // Components are NOT populated by default in Strapi 5 — without this the
  // `seo` component is absent from the response and metadata breaks.
  const query = qs.stringify(
    {
      status: "published",
      populate: { seo: { populate: ["shareImage"] } },
      ...localeQuery(locale),
    },
    { encodeValuesOnly: true },
  );
  const path = `/api/page-${slug}?${query}`;
  // Non-default locale not translated → fall back to ro (Strapi won't).
  const orRoFallback = async (
    result: EditorialPage | null,
  ): Promise<EditorialPage | null> =>
    result === null && locale !== DEFAULT_LOCALE_CODE
      ? getEditorialPage(slug, DEFAULT_LOCALE_CODE)
      : result;
  try {
    const res = await strapiFetch(path, { mode: "static" });
    if (res.status === 404) return orRoFallback(null);
    if (!res.ok) throwStrapiError(path, res);
    const json = (await res.json()) as { data: StrapiEditorialEntry | null };
    if (!json.data) return orRoFallback(null);
    if (!Array.isArray(json.data.body) || json.data.body.length === 0) {
      logger.warn(
        `cms/page-${slug}`,
        `body blocks are empty — CMS entry exists but has no content`,
      );
    }
    return mapEditorialEntry(slug, json.data);
  } catch (e) {
    if (isStrapiNotFound(e)) return orRoFallback(null);
    throw e;
  }
}

interface StrapiEditorialEntry {
  title: string;
  lastUpdated?: string;
  body: BlocksContent;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    shareImage?: unknown;
  } | null;
}

/** Strapi 5 blocks + seo entry → the unified, render-ready EditorialPage. */
function mapEditorialEntry(
  slug: EditorialPage["slug"],
  entry: StrapiEditorialEntry,
): EditorialPage {
  return {
    slug,
    title: entry.title,
    lastUpdated: formatRoDate(entry.lastUpdated),
    body: { format: "blocks", blocks: entry.body },
    seo: {
      metaTitle: entry.seo?.metaTitle,
      metaDescription: entry.seo?.metaDescription,
      shareImage:
        (entry.seo?.shareImage as EditorialPage["seo"]["shareImage"]) ?? null,
    },
  };
}

const WAITLIST_PATH = "/api/waitlist-submissions";

// Note: `findDuplicateRegistration` and its city-normalisation helpers were
// removed in 2026-05 once INV-2 (see design/epic-signup/00-architecture.md)
// was applied — waitlist submissions are event-shaped, multiple rows per
// email/role/cities are by design. Identity-uniqueness lives in Zitadel.

export async function submitWaitlist(payload: WaitlistPayload): Promise<void> {
  // Backend requires Bearer auth for waitlist-submissions create (public create
  // is disabled on Strapi Cloud). The token stays server-side because this
  // fetcher is only called from the /api/waitlist route handler.
  const res = await strapiFetch(WAITLIST_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
  // parseStrapiError keeps Strapi's "why" (message + field details) instead
  // of the body-blind throwStrapiError used elsewhere.
  if (!res.ok) throw await parseStrapiError(WAITLIST_PATH, res);
}

// Re-export for callers that want the typed-error surface.
export { StrapiNotFoundError };
