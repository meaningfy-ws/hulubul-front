import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/waitlist/route";
import {
  StrapiUpstreamError,
  StrapiValidationError,
} from "@/lib/strapi-client";

vi.mock("@/lib/strapi", () => ({
  submitWaitlist: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/server-events/dispatcher", () => ({
  dispatchConversion: vi.fn().mockResolvedValue(undefined),
  generateEventId: vi.fn(() => "evt-fixed"),
}));

import { submitWaitlist } from "@/lib/strapi";
import { dispatchConversion } from "@/lib/server-events/dispatcher";

const submit = submitWaitlist as ReturnType<typeof vi.fn>;
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

  it("Per INV-2: a repeated email + role + cities still inserts (waitlist is event-shaped)", async () => {
    // Same payload twice in a row — both must succeed. INV-2 prohibits the
    // frontend from short-circuiting duplicates: identity-uniqueness lives
    // in Zitadel, not in the waitlist collection.
    const body = validBody();
    const first = await POST(makeReq(body));
    expect(first.status).toBe(201);
    const second = await POST(makeReq(body));
    expect(second.status).toBe(201);
    expect(submit).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(2);
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

  it("invalid payload → 400 CLIENT_VALIDATION with per-field issues in details", async () => {
    // The real user scenario: no city chip added → cities: [] (the
    // form sends an empty array, not an omitted key).
    const res = await POST(makeReq({ ...validBody(), cities: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("CLIENT_VALIDATION");
    const issues = body.error.details.issues as {
      field: string;
      message: string;
    }[];
    expect(Array.isArray(issues)).toBe(true);
    const cityIssue = issues.find((i) => i.field === "cities");
    expect(cityIssue).toBeDefined();
    expect(cityIssue!.message).toMatch(/oraș/i); // "Adaugă cel puțin un oraș."
    expect(submit).not.toHaveBeenCalled();
  });
});
