import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { dispatchGa4Mp } from "@/lib/server-events/ga4mp";

beforeEach(() => {
  vi.stubEnv("GA4_MEASUREMENT_ID", "G-TEST123");
  vi.stubEnv("GA4_API_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dispatchGa4Mp", () => {
  it("POSTs to /mp/collect with measurement_id + api_secret in query", async () => {
    let url = "";
    let body: unknown;
    server.use(
      http.post("https://www.google-analytics.com/mp/collect", async ({ request }) => {
        url = request.url;
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const ok = await dispatchGa4Mp({
      eventName: "waitlist_submit",
      eventId: "uuid-abc",
      clientId: "client-xyz",
      params: { role: "expeditor", source: "landing" },
    });
    expect(ok).toBe(true);
    expect(url).toContain("measurement_id=G-TEST123");
    expect(url).toContain("api_secret=test-secret");
    const sent = body as {
      client_id: string;
      events: Array<{ name: string; params: Record<string, unknown> }>;
    };
    expect(sent.client_id).toBe("client-xyz");
    expect(sent.events[0]?.name).toBe("waitlist_submit");
    expect(sent.events[0]?.params).toMatchObject({
      role: "expeditor",
      source: "landing",
      event_id: "uuid-abc",
    });
  });

  it("returns false when GA4_MEASUREMENT_ID is unset (silent skip)", async () => {
    vi.stubEnv("GA4_MEASUREMENT_ID", "");
    const ok = await dispatchGa4Mp({
      eventName: "x",
      eventId: "id",
      clientId: "client",
      params: {},
    });
    expect(ok).toBe(false);
  });

  it("returns false on upstream 500 — never throws", async () => {
    server.use(
      http.post("https://www.google-analytics.com/mp/collect", () =>
        HttpResponse.json({ error: "bad" }, { status: 500 }),
      ),
    );
    const ok = await dispatchGa4Mp({
      eventName: "x",
      eventId: "id",
      clientId: "client",
      params: {},
    });
    expect(ok).toBe(false);
  });
});
