import qs from "qs";
import { buildLandingPopulate } from "./populate";
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

export interface RegistrationIdentity {
  email: string;
  role: string;
  cities: string[];
}

/** Trim + lowercase + dedupe + sort → comparable city set. */
function normCities(cities: unknown): string[] {
  if (!Array.isArray(cities)) return [];
  const cleaned = cities
    .map((c) =>
      typeof c === "object" && c !== null
        ? String((c as { name?: unknown }).name ?? "")
        : String(c),
    )
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0);
  return [...new Set(cleaned)].sort();
}

function sameCitySet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Soft-dedupe: a registration is a *true duplicate* only when the same
 * email re-registers with the **same role AND the same set of cities**.
 *
 * Changing the role or the cities is a legitimately new registration —
 * e.g. a parent with one child in Italy and one in France using a single
 * email address (per product decision, May 2026). So we never block on
 * email alone; we block only the exact repeat.
 *
 * Matched case-insensitively (`$eqi`) on a trimmed/lowercased email;
 * cities are compared order- and case-insensitively. Returns the matching
 * row's registration date so the UI can say "you already registered…".
 *
 * Assumes `cities` is a scalar/JSON attribute on the content type (it is —
 * the route forwards the payload's `string[]`). If the backend ever stores
 * it as a component/relation it won't come back via `fields` and dedupe
 * fails *open* (allows the submit) — acceptable for a soft check.
 */
export async function findDuplicateRegistration(
  id: RegistrationIdentity,
): Promise<{ registeredAt: string } | null> {
  const normalized = id.email.trim().toLowerCase();
  const query = qs.stringify(
    {
      filters: { email: { $eqi: normalized } },
      fields: ["createdAt", "role", "cities"],
      sort: ["createdAt:asc"],
      pagination: { pageSize: 50 },
    },
    { encodeValuesOnly: true },
  );
  const path = `${WAITLIST_PATH}?${query}`;
  const res = await strapiFetch(path, { mode: "fresh" });
  if (!res.ok) throw await parseStrapiError(path, res);
  const json = (await res.json()) as {
    data: Array<{ createdAt?: string; role?: string; cities?: unknown }>;
  };

  const wantCities = normCities(id.cities);
  for (const row of json.data ?? []) {
    if (
      row.createdAt &&
      row.role === id.role &&
      sameCitySet(normCities(row.cities), wantCities)
    ) {
      return { registeredAt: row.createdAt };
    }
  }
  return null;
}

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
