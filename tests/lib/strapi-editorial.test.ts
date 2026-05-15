import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { getEditorialPage } from "@/lib/strapi";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

const blocks = [
  { type: "paragraph", children: [{ type: "text", text: "Salut" }] },
];

describe("getEditorialPage", () => {
  it("maps the Strapi 5 blocks + seo response into the unified EditorialPage", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-confidentialitate`, () =>
        HttpResponse.json({
          data: {
            id: 1,
            documentId: "abc",
            title: "Politica de confidențialitate",
            lastUpdated: "2026-04-23",
            body: blocks,
            seo: {
              metaTitle: "Confidențialitate",
              metaDescription: "Ce date colectăm.",
              shareImage: { url: "/uploads/og.png" },
            },
          },
          meta: {},
        }),
      ),
    );

    const page = await getEditorialPage("confidentialitate");

    expect(page).toEqual({
      slug: "confidentialitate",
      title: "Politica de confidențialitate",
      lastUpdated: "23 aprilie 2026",
      body: { format: "blocks", blocks },
      seo: {
        metaTitle: "Confidențialitate",
        metaDescription: "Ce date colectăm.",
        shareImage: { url: "/uploads/og.png" },
      },
    });
  });

  it("requests published status and populates the seo component (incl. shareImage)", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-termeni`, ({ request }) => {
        seenUrl = decodeURIComponent(request.url);
        return HttpResponse.json({
          data: { title: "T", lastUpdated: "2026-05-14", body: blocks },
          meta: {},
        });
      }),
    );
    await getEditorialPage("termeni");
    expect(seenUrl).toContain("status=published");
    expect(seenUrl).toContain("populate[seo][populate][0]=shareImage");
  });

  it("returns null on 404 (frontend then uses the build-time fallback)", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-despre-proiect`, () =>
        new HttpResponse(null, { status: 404 }),
      ),
    );
    expect(await getEditorialPage("despre-proiect")).toBeNull();
  });

  it("tolerates a missing seo component without throwing", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-pentru-transportatori`, () =>
        HttpResponse.json({
          data: { title: "Pentru transportatori", lastUpdated: "2026-05-14", body: blocks },
          meta: {},
        }),
      ),
    );
    const page = await getEditorialPage("pentru-transportatori");
    expect(page?.seo).toEqual({
      metaTitle: undefined,
      metaDescription: undefined,
      shareImage: null,
    });
    expect(page?.body).toEqual({ format: "blocks", blocks });
  });
});
