import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { POST } from "@/app/api/survey-v2/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

const validPayload = {
  name: "Ion",
  email: "ion@x.com",
  routeCities: ["Chișinău", "Paris"],
  sendingFrequency: "lunar_sau_mai_des",
  howFindTransporter: ["whatsapp_telegram"],
  searchDuration: "5_15_min",
  difficulties: ["nu_gasesc_rapid"],
  decisionCriteria: ["pretul"],
  trustSignals: ["recenzii_reale"],
  switchReasons: ["o_singura_cerere"],
  mostImportantThing: "Să știu că pachetul chiar ajunge.",
  wantsToTest: "nu",
};

function req(body: unknown): Request {
  return new Request("http://test/api/survey-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/survey-v2", () => {
  it("returns 201 on a valid payload", async () => {
    const res = await POST(req(validPayload));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; event_id: string };
    expect(body.ok).toBe(true);
    expect(typeof body.event_id).toBe("string");
  });

  it("returns 400 when Zod rejects the body (missing route)", async () => {
    const { routeCities: _drop, ...rest } = validPayload;
    const res = await POST(req(rest));
    expect(res.status).toBe(400);
  });

  it("returns 400 when opting into testing without consent", async () => {
    const res = await POST(
      req({
        ...validPayload,
        wantsToTest: "da",
        testPhone: "+373 600 00 000",
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/telefon|acordul/i);
  });

  it("returns 502 when Strapi refuses (403)", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/survey-sender-v2s`, () =>
        HttpResponse.json({ error: { status: 403 } }, { status: 403 }),
      ),
    );
    const res = await POST(req(validPayload));
    expect(res.status).toBe(502);
  });

  it("returns 502 when the collection doesn't exist yet (404)", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/survey-sender-v2s`, () =>
        HttpResponse.json({ error: { status: 404 } }, { status: 404 }),
      ),
    );
    const res = await POST(req(validPayload));
    expect(res.status).toBe(502);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST(
      new Request("http://test/api/survey-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
