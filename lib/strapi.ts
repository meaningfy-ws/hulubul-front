import qs from "qs";
import { buildLandingPopulate } from "./populate";
import type { LandingPage } from "./types";
import type { WaitlistPayload } from "./waitlist-schema";

export class LandingPageNotPublishedError extends Error {
  constructor() {
    super(
      "Strapi returned 404 for /api/landing-page. The single type exists in the schema but no entry has been published yet. Run the seed script on Strapi Cloud (see design/strapi-runbook.md §2).",
    );
    this.name = "LandingPageNotPublishedError";
  }
}

function strapiUrl(): string {
  const url = process.env.NEXT_PUBLIC_STRAPI_URL;
  if (!url) throw new Error("NEXT_PUBLIC_STRAPI_URL is not set");
  return url.replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const token = process.env.STRAPI_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getLandingPage(): Promise<LandingPage> {
  const query = qs.stringify(
    { populate: buildLandingPopulate(), status: "published" },
    { encodeValuesOnly: true },
  );
  const res = await fetch(`${strapiUrl()}/api/landing-page?${query}`, {
    headers: authHeaders(),
    next: { revalidate: 300 },
  });

  if (res.status === 404) throw new LandingPageNotPublishedError();
  if (!res.ok) {
    throw new Error(`Strapi /api/landing-page failed: ${res.status}`);
  }

  const json = (await res.json()) as { data: LandingPage | null };
  if (!json.data) throw new LandingPageNotPublishedError();
  return json.data;
}

export async function submitWaitlist(payload: WaitlistPayload): Promise<void> {
  // Backend requires Bearer auth for waitlist-submissions create (public create
  // is disabled on Strapi Cloud). The token stays server-side because this
  // fetcher is only called from the /api/waitlist route handler.
  const res = await fetch(`${strapiUrl()}/api/waitlist-submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ data: payload }),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Strapi refused the waitlist submission (${res.status}). Verify STRAPI_API_TOKEN has create permission on waitlist-submission (design/strapi-runbook.md §4).`,
    );
  }
  if (!res.ok) {
    throw new Error(`Strapi /api/waitlist-submissions failed: ${res.status}`);
  }
}
