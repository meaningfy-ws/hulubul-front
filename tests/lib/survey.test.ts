import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { submitSurvey } from "@/lib/survey";

const validPayload = {
  name: "Ion",
  email: "ion@x.com",
  role: "expeditor" as const,
  source: "standalone" as const,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

describe("submitSurvey", () => {
  it("POSTs { data: payload } to /api/survey-responses", async () => {
    let seenBody: unknown = null;
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/survey-responses`, async ({ request }) => {
        seenBody = await request.json();
        return HttpResponse.json({ data: { id: 1, documentId: "d" } }, { status: 201 });
      }),
    );
    await submitSurvey(validPayload);
    expect(seenBody).toEqual({ data: validPayload });
  });

  it("sends the Authorization header", async () => {
    let seenAuth: string | null = null;
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/survey-responses`, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json({ data: { id: 1, documentId: "d" } }, { status: 201 });
      }),
    );
    await submitSurvey(validPayload);
    expect(seenAuth).toBe("Bearer test-token");
  });

  it("throws on Strapi 401", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/survey-responses`, () =>
        HttpResponse.json({ error: { status: 401 } }, { status: 401 }),
      ),
    );
    await expect(submitSurvey(validPayload)).rejects.toThrow(/401/);
  });

  it("throws on Strapi 403", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/survey-responses`, () =>
        HttpResponse.json({ error: { status: 403 } }, { status: 403 }),
      ),
    );
    await expect(submitSurvey(validPayload)).rejects.toThrow(/403/);
  });

  it("throws on Strapi 5xx", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/survey-responses`, () =>
        HttpResponse.json({ error: { status: 500 } }, { status: 500 }),
      ),
    );
    await expect(submitSurvey(validPayload)).rejects.toThrow(/500/);
  });
});
