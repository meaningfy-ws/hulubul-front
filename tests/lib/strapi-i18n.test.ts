import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { landingPageFixture } from "@/tests/msw/fixtures/landing-page";
import { getLandingPage, getEditorialPage } from "@/lib/strapi";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

const blocks = [
  { type: "paragraph", children: [{ type: "text", text: "RO" }] },
];

describe("getLandingPage — locale threading", () => {
  it("default (ro) sends NO locale param (byte-identical to today)", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/landing-page`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ data: landingPageFixture, meta: {} });
      }),
    );
    await getLandingPage();
    expect(seenUrl).not.toContain("locale");
  });

  it("en sends locale=en", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/landing-page`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ data: landingPageFixture, meta: {} });
      }),
    );
    await getLandingPage("en");
    expect(decodeURIComponent(seenUrl)).toContain("locale=en");
  });

  it("falls back to ro when the en entry is missing (Strapi has no auto-fallback)", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/landing-page`, ({ request }) => {
        if (request.url.includes("locale=en")) {
          return HttpResponse.json({ data: null, meta: {} });
        }
        return HttpResponse.json({ data: landingPageFixture, meta: {} });
      }),
    );
    const page = await getLandingPage("en");
    expect(page.seo.metaTitle).toBe(landingPageFixture.seo.metaTitle);
  });
});

describe("getEditorialPage — locale threading", () => {
  const cms = (extra = {}) => ({
    data: {
      title: "T",
      lastUpdated: "2026-05-15",
      body: blocks,
      seo: { metaTitle: "MT", metaDescription: "MD" },
      ...extra,
    },
    meta: {},
  });

  it("default (ro) sends NO locale param", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-termeni`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(cms());
      }),
    );
    await getEditorialPage("termeni");
    expect(seenUrl).not.toContain("locale");
  });

  it("en sends locale=en", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-termeni`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(cms());
      }),
    );
    await getEditorialPage("termeni", "en");
    expect(decodeURIComponent(seenUrl)).toContain("locale=en");
  });

  it("falls back to ro when the en entry 404s", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-termeni`, ({ request }) => {
        if (request.url.includes("locale=en")) {
          return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(cms({ title: "Termeni RO" }));
      }),
    );
    const page = await getEditorialPage("termeni", "en");
    expect(page?.title).toBe("Termeni RO");
  });
});
