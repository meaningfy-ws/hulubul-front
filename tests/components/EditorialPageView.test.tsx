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

async function renderEditorial(slug: "confidentialitate" | "termeni" | "despre-proiect") {
  // EditorialPageView is async (server component). Resolve to its element.
  render(await EditorialPageView({ slug }));
}

describe("<EditorialPageView>", () => {
  it("renders the fallback copy when Strapi returns 404", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-confidentialitate`, () =>
        HttpResponse.json(
          { error: { status: 404 } },
          { status: 404 },
        ),
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

  it("renders the CMS copy when present, preferring it over the fallback", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-termeni`, () =>
        HttpResponse.json({
          data: {
            slug: "termeni",
            title: "CMS-driven title",
            lastUpdated: "1 ianuarie 2027",
            body: "CMS body",
          },
        }),
      ),
    );
    await renderEditorial("termeni");
    expect(
      screen.getByRole("heading", { level: 1, name: "CMS-driven title" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 ianuarie 2027/)).toBeInTheDocument();
  });

  it("falls back when the CMS errors out (does not crash the page)", async () => {
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
  it("produces a generateMetadata function bound to the slug", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/page-confidentialitate`, () =>
        HttpResponse.json(
          { error: { status: 404 } },
          { status: 404 },
        ),
      ),
    );
    const generate = makeEditorialMetadata("confidentialitate");
    const meta = await generate();
    expect(meta.title).toBe(EDITORIAL_FALLBACK.confidentialitate.title);
    expect(meta.description).toBe(
      EDITORIAL_FALLBACK.confidentialitate.metaDescription,
    );
  });
});
