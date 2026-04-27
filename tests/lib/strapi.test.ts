import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { landingPageFixture } from "@/tests/msw/fixtures/landing-page";
import { getLandingPage, LandingPageNotPublishedError, submitWaitlist } from "@/lib/strapi";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

describe("getLandingPage", () => {
  it("returns typed landing page data on 200", async () => {
    const page = await getLandingPage();
    expect(page.seo.metaTitle).toBe("hulubul.com");
    expect(page.hero.handwrittenLines).toHaveLength(1);
    expect(page.footer.columns[0]!.links[0]!.label).toBe("Lista");
  });

  it("sends the Authorization header when STRAPI_API_TOKEN is set", async () => {
    let seenAuth: string | null = null;
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/landing-page`, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json({ data: landingPageFixture, meta: {} });
      }),
    );
    await getLandingPage();
    expect(seenAuth).toBe("Bearer test-token");
  });

  it("builds the explicit populate query string", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/landing-page`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ data: landingPageFixture, meta: {} });
      }),
    );
    await getLandingPage();
    expect(seenUrl).toContain("populate[hero][populate][0]=handwrittenLines");
    expect(seenUrl).toContain("populate[footer][populate][columns][populate][0]=links");
    expect(seenUrl).toContain("status=published");
  });

  it("throws LandingPageNotPublishedError on 404", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/landing-page`, () =>
        HttpResponse.json({ data: null, error: { status: 404 } }, { status: 404 }),
      ),
    );
    await expect(getLandingPage()).rejects.toBeInstanceOf(LandingPageNotPublishedError);
  });

  it("throws a generic error on 5xx", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/landing-page`, () =>
        HttpResponse.json({ error: { status: 500 } }, { status: 500 }),
      ),
    );
    await expect(getLandingPage()).rejects.toThrow(/500/);
  });
});

describe("submitWaitlist", () => {
  const validPayload = {
    name: "Ion",
    email: "ion@example.com",
    role: "expeditor" as const,
    cities: ["Luxembourg", "Chișinău"],
    source: "landing" as const,
    gdprConsent: true as const,
    gdprConsentAt: "2026-04-27T15:42:11.000Z",
    gdprConsentVersion: "2026-04-27",
    locationConsent: "not_asked" as const,
  };

  it("POSTs { data: payload } to waitlist-submissions with the new fields", async () => {
    let seenBody: unknown = null;
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/waitlist-submissions`, async ({ request }) => {
        seenBody = await request.json();
        return HttpResponse.json({ data: { id: 1, documentId: "a" } }, { status: 200 });
      }),
    );
    await submitWaitlist(validPayload);
    expect(seenBody).toEqual({ data: validPayload });
  });

  it("includes optional whatsapp when provided", async () => {
    let seenBody: unknown = null;
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/waitlist-submissions`, async ({ request }) => {
        seenBody = await request.json();
        return HttpResponse.json({ data: { id: 1, documentId: "a" } }, { status: 200 });
      }),
    );
    await submitWaitlist({ ...validPayload, whatsapp: "+373 600" });
    expect(seenBody).toEqual({
      data: { ...validPayload, whatsapp: "+373 600" },
    });
  });

  it("sends the Authorization header (backend requires token to create)", async () => {
    let seenAuth: string | null = null;
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/waitlist-submissions`, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json({ data: { id: 1, documentId: "a" } }, { status: 200 });
      }),
    );
    await submitWaitlist(validPayload);
    expect(seenAuth).toBe("Bearer test-token");
  });

  it("surfaces Strapi 403 as an actionable error", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({ error: { status: 403 } }, { status: 403 }),
      ),
    );
    await expect(submitWaitlist(validPayload)).rejects.toThrow(/403/);
  });

  it("surfaces Strapi 401 as an actionable error (bad token)", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({ error: { status: 401 } }, { status: 401 }),
      ),
    );
    await expect(submitWaitlist(validPayload)).rejects.toThrow(/401/);
  });
});
