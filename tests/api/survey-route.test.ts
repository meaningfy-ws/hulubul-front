import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { POST } from "@/app/api/survey/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

function req(body: unknown): Request {
  return new Request("http://test/api/survey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/survey", () => {
  it("returns 201 on a valid payload", async () => {
    const res = await POST(
      req({
        name: "Ion",
        email: "ion@x.com",
        role: "expeditor",
        source: "standalone",
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 400 when Zod rejects the body (missing source)", async () => {
    const res = await POST(
      req({ name: "Ion", email: "ion@x.com", role: "expeditor" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(
      req({ name: "Ion", email: "bad", role: "expeditor", source: "standalone" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when wantsCallback is true but no phone", async () => {
    const res = await POST(
      req({
        name: "Ion",
        email: "ion@x.com",
        role: "expeditor",
        source: "standalone",
        wantsCallback: true,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/telefon/i);
  });

  it("returns 502 when Strapi refuses (403)", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/survey-responses`, () =>
        HttpResponse.json({ error: { status: 403 } }, { status: 403 }),
      ),
    );
    const res = await POST(
      req({
        name: "Ion",
        email: "ion@x.com",
        role: "expeditor",
        source: "standalone",
      }),
    );
    expect(res.status).toBe(502);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST(
      new Request("http://test/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
