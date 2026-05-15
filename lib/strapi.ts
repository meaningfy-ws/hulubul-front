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

export class LandingPageNotPublishedError extends Error {
  constructor() {
    super(
      "Strapi returned 404 for /api/landing-page. The single type exists in the schema but no entry has been published yet. Run the seed script on Strapi Cloud (see design/strapi-runbook.md §2).",
    );
    this.name = "LandingPageNotPublishedError";
  }
}

export async function getLandingPage(): Promise<LandingPage> {
  const query = qs.stringify(
    { populate: buildLandingPopulate(), status: "published" },
    { encodeValuesOnly: true },
  );
  const path = `/api/landing-page?${query}`;
  const res = await strapiFetch(path, { mode: "static" });

  if (res.status === 404) throw new LandingPageNotPublishedError();
  if (!res.ok) throwStrapiError(path, res);

  const json = (await res.json()) as { data: LandingPage | null };
  if (!json.data) throw new LandingPageNotPublishedError();
  return json.data;
}

export async function getEditorialPage(
  slug: EditorialPage["slug"],
): Promise<EditorialPage | null> {
  // Editorial source for static pages (legal + about). One Strapi single-type
  // per slug, named `page-{slug}` (e.g. page-confidentialitate, page-termeni,
  // page-despre-proiect). See design/spec-editorial-pages.md.
  // Returns null when the content type or entry is missing so callers can
  // render the build-time fallback while the backend ships the schema.
  // Components are NOT populated by default in Strapi 5 — without this the
  // `seo` component is absent from the response and metadata breaks.
  const query = qs.stringify(
    { status: "published", populate: { seo: { populate: ["shareImage"] } } },
    { encodeValuesOnly: true },
  );
  const path = `/api/page-${slug}?${query}`;
  try {
    const res = await strapiFetch(path, { mode: "static" });
    if (res.status === 404) return null;
    if (!res.ok) throwStrapiError(path, res);
    const json = (await res.json()) as { data: StrapiEditorialEntry | null };
    if (!json.data) return null;
    return mapEditorialEntry(slug, json.data);
  } catch (e) {
    if (isStrapiNotFound(e)) return null;
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

/**
 * Soft-dedupe lookup: does a waitlist row already exist for this email?
 * Matched case-insensitively (`$eqi`) on a trimmed/lowercased email so
 * `A@x.com` and `a@x.com` count as the same person — without rewriting
 * the stored address. Returns the original registration date so the UI
 * can say "you registered on DD/MM/YYYY".
 */
export async function findWaitlistByEmail(
  email: string,
): Promise<{ registeredAt: string } | null> {
  const normalized = email.trim().toLowerCase();
  const query = qs.stringify(
    {
      filters: { email: { $eqi: normalized } },
      fields: ["createdAt"],
      sort: ["createdAt:asc"],
      pagination: { pageSize: 1 },
    },
    { encodeValuesOnly: true },
  );
  const path = `${WAITLIST_PATH}?${query}`;
  const res = await strapiFetch(path, { mode: "fresh" });
  if (!res.ok) throw await parseStrapiError(path, res);
  const json = (await res.json()) as {
    data: Array<{ createdAt?: string }>;
  };
  const first = json.data?.[0];
  return first?.createdAt ? { registeredAt: first.createdAt } : null;
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
