import qs from "qs";
import { buildLandingPopulate } from "./populate";
import {
  isStrapiNotFound,
  strapiFetch,
  StrapiNotFoundError,
  throwStrapiError,
} from "./strapi-client";
import type { LandingPage, EditorialPage } from "./types";
import type { WaitlistPayload } from "./waitlist-schema";

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
  const path = `/api/page-${slug}?status=published`;
  try {
    const res = await strapiFetch(path, { mode: "static" });
    if (res.status === 404) return null;
    if (!res.ok) throwStrapiError(path, res);
    const json = (await res.json()) as { data: EditorialPage | null };
    return json.data ?? null;
  } catch (e) {
    if (isStrapiNotFound(e)) return null;
    throw e;
  }
}

export async function submitWaitlist(payload: WaitlistPayload): Promise<void> {
  // Backend requires Bearer auth for waitlist-submissions create (public create
  // is disabled on Strapi Cloud). The token stays server-side because this
  // fetcher is only called from the /api/waitlist route handler.
  const path = "/api/waitlist-submissions";
  const res = await strapiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) throwStrapiError(path, res);
}

// Re-export for callers that want the typed-error surface.
export { StrapiNotFoundError };
