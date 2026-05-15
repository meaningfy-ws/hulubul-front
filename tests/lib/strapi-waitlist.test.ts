import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { findDuplicateRegistration, submitWaitlist } from "@/lib/strapi";
import { StrapiUpstreamError, StrapiValidationError } from "@/lib/strapi-client";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

const expeditorRome = {
  email: "Test@Example.com",
  role: "expeditor",
  cities: ["Rome"],
};

describe("findDuplicateRegistration", () => {
  it("flags an exact duplicate (same email + role + city set) and returns its date", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              createdAt: "2026-04-27T08:30:00.000Z",
              role: "expeditor",
              cities: ["Rome"],
            },
          ],
        }),
      ),
    );
    expect(await findDuplicateRegistration(expeditorRome)).toEqual({
      registeredAt: "2026-04-27T08:30:00.000Z",
    });
  });

  it("treats the city set as order- and case-insensitive", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({
          data: [
            { createdAt: "2026-01-01T00:00:00.000Z", role: "expeditor", cities: ["paris", "ROME"] },
          ],
        }),
      ),
    );
    expect(
      await findDuplicateRegistration({
        email: "a@b.com",
        role: "expeditor",
        cities: ["Rome", "Paris"],
      }),
    ).not.toBeNull();
  });

  it("allows a new registration when the ROLE differs (Andrei's case)", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({
          data: [
            { createdAt: "2026-01-01T00:00:00.000Z", role: "transportator", cities: ["Rome"] },
          ],
        }),
      ),
    );
    expect(await findDuplicateRegistration(expeditorRome)).toBeNull();
  });

  it("allows a new registration when the CITIES differ — parent, kids in Italy & France, one email", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({
          data: [
            { createdAt: "2026-01-01T00:00:00.000Z", role: "expeditor", cities: ["Milano"] },
          ],
        }),
      ),
    );
    expect(
      await findDuplicateRegistration({
        email: "parent@example.com",
        role: "expeditor",
        cities: ["Paris"],
      }),
    ).toBeNull();
  });

  it("returns null when the email has no prior rows", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    expect(await findDuplicateRegistration(expeditorRome)).toBeNull();
  });

  it("queries by case-insensitive email and fetches role + cities + createdAt", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, ({ request }) => {
        seenUrl = decodeURIComponent(request.url);
        return HttpResponse.json({ data: [] });
      }),
    );
    await findDuplicateRegistration({
      email: "  MixedCase@Example.COM ",
      role: "expeditor",
      cities: ["Rome"],
    });
    expect(seenUrl).toContain("filters[email][$eqi]=mixedcase@example.com");
    expect(seenUrl).toContain("fields[0]=createdAt");
    expect(seenUrl).toContain("role");
    expect(seenUrl).toContain("cities");
  });

  it("throws a typed StrapiUpstreamError when the lookup itself 5xxs", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/waitlist-submissions`, () =>
        new HttpResponse(null, { status: 503 }),
      ),
    );
    await expect(
      findDuplicateRegistration(expeditorRome),
    ).rejects.toBeInstanceOf(StrapiUpstreamError);
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
