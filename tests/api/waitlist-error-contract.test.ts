import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/waitlist/route";
import {
  StrapiUpstreamError,
  StrapiValidationError,
} from "@/lib/strapi-client";

vi.mock("@/lib/strapi", () => ({
  submitWaitlist: vi.fn().mockResolvedValue(undefined),
  findWaitlistByEmail: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/server-events/dispatcher", () => ({
  dispatchConversion: vi.fn().mockResolvedValue(undefined),
  generateEventId: vi.fn(() => "evt-fixed"),
}));

import { submitWaitlist, findWaitlistByEmail } from "@/lib/strapi";
import { dispatchConversion } from "@/lib/server-events/dispatcher";

const submit = submitWaitlist as ReturnType<typeof vi.fn>;
const findByEmail = findWaitlistByEmail as ReturnType<typeof vi.fn>;
const dispatch = dispatchConversion as ReturnType<typeof vi.fn>;

const validBody = () => ({
  name: "Ion",
  email: "ion@example.com",
  role: "expeditor",
  cities: ["Chișinău"],
  gdprConsent: true,
  gdprConsentAt: new Date().toISOString(),
  gdprConsentVersion: "2026-04-27",
});

function makeReq(body: unknown) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  submit.mockReset().mockResolvedValue(undefined);
  findByEmail.mockReset().mockResolvedValue(null);
  dispatch.mockReset().mockResolvedValue(undefined);
});

describe("waitlist route — structured error contract", () => {
  it("success still returns 201 {ok:true,event_id} and dispatches the conversion", async () => {
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, event_id: "evt-fixed" });
    expect(submit).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("duplicate email → 409 ALREADY_REGISTERED with the date, no insert, no conversion", async () => {
    findByEmail.mockResolvedValue({ registeredAt: "2026-04-27T08:30:00.000Z" });
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("ALREADY_REGISTERED");
    expect(body.error.message).toContain("27/04/2026");
    expect(body.error.requestId).toBeTruthy();
    expect(res.headers.get("x-request-id")).toBe(body.error.requestId);
    expect(submit).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("Strapi 400 validation → 422 UPSTREAM_VALIDATION carrying the real upstream status", async () => {
    submit.mockRejectedValue(
      new StrapiValidationError("/api/waitlist-submissions", {
        upstreamMessage: "This attribute must be unique",
      }),
    );
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("UPSTREAM_VALIDATION");
    expect(body.error.upstreamStatus).toBe(400);
  });

  it("Strapi 502 → 503 UPSTREAM_DOWN", async () => {
    submit.mockRejectedValue(
      new StrapiUpstreamError("/api/waitlist-submissions", 502),
    );
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("UPSTREAM_DOWN");
  });

  it("if the dedupe lookup itself fails, map the error and do NOT insert", async () => {
    findByEmail.mockRejectedValue(
      new StrapiUpstreamError("/api/waitlist-submissions", 503),
    );
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("UPSTREAM_DOWN");
    expect(submit).not.toHaveBeenCalled();
  });

  it("invalid payload → 400 CLIENT_VALIDATION envelope (not the old {error} shape)", async () => {
    const { cities: _omit, ...rest } = validBody();
    const res = await POST(makeReq(rest));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("CLIENT_VALIDATION");
    expect(submit).not.toHaveBeenCalled();
  });
});
