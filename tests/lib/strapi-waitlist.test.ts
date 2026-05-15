import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { findWaitlistByEmail, submitWaitlist } from "@/lib/strapi";
import { StrapiUpstreamError, StrapiValidationError } from "@/lib/strapi-client";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

describe("findWaitlistByEmail", () => {
  it("returns the original registration date when a row exists", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({
          data: [{ id: 1, createdAt: "2026-04-27T08:30:00.000Z" }],
        }),
      ),
    );
    const found = await findWaitlistByEmail("Test@Example.com");
    expect(found).toEqual({ registeredAt: "2026-04-27T08:30:00.000Z" });
  });

  it("returns null when no row matches", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    expect(await findWaitlistByEmail("nobody@example.com")).toBeNull();
  });

  it("queries case-insensitively, normalised, limited to one row, createdAt only", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, ({ request }) => {
        seenUrl = decodeURIComponent(request.url);
        return HttpResponse.json({ data: [] });
      }),
    );
    await findWaitlistByEmail("  MixedCase@Example.COM ");
    expect(seenUrl).toContain("filters[email][$eqi]=mixedcase@example.com");
    expect(seenUrl).toContain("pagination[pageSize]=1");
    expect(seenUrl).toContain("fields[0]=createdAt");
  });

  it("throws a typed StrapiUpstreamError when the lookup itself 5xxs", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        new HttpResponse(null, { status: 503 }),
      ),
    );
    await expect(findWaitlistByEmail("x@example.com")).rejects.toBeInstanceOf(
      StrapiUpstreamError,
    );
  });
});

describe("submitWaitlist error capture", () => {
  it("throws a StrapiValidationError carrying Strapi's body on a 400", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json(
          {
            data: null,
            error: {
              status: 400,
              name: "ValidationError",
              message: "Invalid relation",
              details: { errors: [{ path: ["role"], message: "Invalid" }] },
            },
          },
          { status: 400 },
        ),
      ),
    );

    await expect(
      submitWaitlist({ email: "x@example.com" } as Parameters<
        typeof submitWaitlist
      >[0]),
    ).rejects.toMatchObject({
      name: "StrapiValidationError",
      status: 400,
      upstreamMessage: "Invalid relation",
    });

    await expect(
      submitWaitlist({ email: "x@example.com" } as Parameters<
        typeof submitWaitlist
      >[0]),
    ).rejects.toBeInstanceOf(StrapiValidationError);
  });
});
