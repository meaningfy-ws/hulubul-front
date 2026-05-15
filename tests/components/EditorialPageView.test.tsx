import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { EDITORIAL_FALLBACK } from "@/lib/editorial-fallback";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function renderEditorial(
  slug: "confidentialitate" | "termeni" | "despre-proiect",
) {
  render(await EditorialPageView({ slug }));
}

describe("<EditorialPageView>", () => {
  it("renders the markdown fallback when Strapi returns 404", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-confidentialitate`, () =>
        HttpResponse.json({ error: { status: 404 } }, { status: 404 }),
      ),
    );
    await renderEditorial("confidentialitate");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: EDITORIAL_FALLBACK.confidentialitate.title,
      }),
    ).toBeInTheDocument();
  });

  it("renders CMS blocks body + formatted date, preferring CMS over fallback", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-termeni`, () =>
        HttpResponse.json({
          data: {
            title: "CMS-driven title",
            lastUpdated: "2027-01-01",
            body: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Corp din CMS blocks" }],
              },
            ],
            seo: { metaTitle: "X", metaDescription: "Y" },
          },
        }),
      ),
    );
    await renderEditorial("termeni");
    expect(
      screen.getByRole("heading", { level: 1, name: "CMS-driven title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Corp din CMS blocks")).toBeInTheDocument();
    expect(screen.getByText(/1 ianuarie 2027/)).toBeInTheDocument();
  });

  it("falls back when the CMS errors out (page never crashes)", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-despre-proiect`, () =>
        HttpResponse.json({ error: { status: 500 } }, { status: 500 }),
      ),
    );
    await renderEditorial("despre-proiect");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: EDITORIAL_FALLBACK["despre-proiect"].title,
      }),
    ).toBeInTheDocument();
  });
});

describe("makeEditorialMetadata", () => {
  it("uses CMS seo when present (metaTitle/metaDescription)", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-termeni`, () =>
        HttpResponse.json({
          data: {
            title: "Plain title",
            lastUpdated: "2027-01-01",
            body: [],
            seo: { metaTitle: "SEO Title", metaDescription: "SEO desc" },
          },
        }),
      ),
    );
    const meta = await makeEditorialMetadata("termeni")();
    expect(meta.description).toBe("SEO desc");
  });

  it("falls back to fallback copy's seo on 404", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-confidentialitate`, () =>
        HttpResponse.json({ error: { status: 404 } }, { status: 404 }),
      ),
    );
    const meta = await makeEditorialMetadata("confidentialitate")();
    expect(meta.description).toBe(
      EDITORIAL_FALLBACK.confidentialitate.seo.metaDescription,
    );
  });
});
