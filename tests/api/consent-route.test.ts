import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { POST } from "@/app/api/consent/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function req(body: unknown): Request {
  return new Request("http://test/api/consent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": "Mozilla/5.0 (test)",
      "accept-language": "ro-RO,ro;q=0.9",
      referer: "https://hulubul.com/",
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  sessionId: "abc-123",
  analytics: "granted" as const,
  marketing: "denied" as const,
  version: "2026-05-14",
  event: "grant" as const,
  choseAt: "2027-01-15T10:00:00.000Z",
};

describe("POST /api/consent", () => {
  it("forwards a valid body to Strapi and returns the new documentId", async () => {
    let received: unknown;
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/consent-records`, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(
          { data: { documentId: "doc-xyz", ...validBody } },
          { status: 201 },
        );
      }),
    );
    const res = await POST(req(validBody));
    expect(res.status).toBe(201);
    const json = (await res.json()) as { recordId: string };
    expect(json.recordId).toBe("doc-xyz");
    // Strapi receives the body wrapped in `{data: ...}` and augmented
    // with user-agent/language/referrer from headers.
    const sent = received as { data: Record<string, unknown> };
    expect(sent.data.sessionId).toBe("abc-123");
    expect(sent.data.userAgent).toContain("Mozilla");
    expect(sent.data.language).toContain("ro");
    expect(sent.data.referrer).toBe("https://hulubul.com/");
  });

  it("returns 400 when the body fails Zod validation", async () => {
    const res = await POST(
      req({ ...validBody, analytics: "maybe" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 502 when Strapi is unavailable, without throwing", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/consent-records`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    const res = await POST(req(validBody));
    expect(res.status).toBe(502);
  });

  it("returns 502 when the Strapi collection doesn't exist (404)", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/consent-records`, () =>
        HttpResponse.json({ error: "not found" }, { status: 404 }),
      ),
    );
    const res = await POST(req(validBody));
    expect(res.status).toBe(502);
  });
});
