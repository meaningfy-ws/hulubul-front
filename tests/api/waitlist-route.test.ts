import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/waitlist/route";

vi.mock("@/lib/strapi", () => ({
  submitWaitlist: vi.fn().mockResolvedValue(undefined),
}));

import { submitWaitlist } from "@/lib/strapi";

const isoNow = () => new Date().toISOString();

const validBody = () => ({
  name: "Ion",
  email: "ion@example.com",
  role: "expeditor",
  cities: ["Lux", "Chișinău"],
  gdprConsent: true,
  gdprConsentAt: isoNow(),
  gdprConsentVersion: "2026-04-27",
});

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
      "accept-language": "ro-RO,ro;q=0.9",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  (submitWaitlist as ReturnType<typeof vi.fn>).mockClear();
});

describe("Feature: /api/waitlist route handler", () => {
  describe("Given a valid v2 payload", () => {
    it("When POSTed, Then the route returns 201 and forwards to submitWaitlist once", async () => {
      const res = await POST(makeReq(validBody()));
      expect(res.status).toBe(201);
      expect(submitWaitlist).toHaveBeenCalledOnce();
    });
  });

  describe("Given a legacy 'routes'-only payload (no cities)", () => {
    it("When POSTed, Then the route rejects with 400 and submitWaitlist is not called", async () => {
      const { cities: _omit, ...rest } = validBody();
      const res = await POST(makeReq({ ...rest, routes: "Lux - KIV" }));
      expect(res.status).toBe(400);
      expect(submitWaitlist).not.toHaveBeenCalled();
    });
  });

  describe("Given a payload missing gdprConsent", () => {
    it("When POSTed, Then the route rejects with 400", async () => {
      const { gdprConsent: _omit, ...rest } = validBody();
      const res = await POST(makeReq(rest));
      expect(res.status).toBe(400);
    });
  });

  describe("Given a malformed JSON body", () => {
    it("When POSTed, Then the route rejects with 400 and a clear message", async () => {
      const req = new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Given a User-Agent header longer than 512 chars", () => {
    it("When POSTed, Then device.userAgent is clipped to 512 chars", async () => {
      const longUa = "x".repeat(600);
      await POST(makeReq(validBody(), { "user-agent": longUa }));
      const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(arg.device.userAgent.length).toBe(512);
    });
  });

  describe("Given client.viewport and client.timezone hints", () => {
    it("When POSTed, Then device merges them and the 'client' wrapper is stripped", async () => {
      await POST(
        makeReq({
          ...validBody(),
          client: {
            viewport: { w: 1280, h: 800 },
            timezone: "Europe/Luxembourg",
          },
        }),
      );
      const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(arg.device.viewport).toEqual({ w: 1280, h: 800 });
      expect(arg.device.timezone).toBe("Europe/Luxembourg");
      expect(arg).not.toHaveProperty("client");
    });
  });

  describe("Given locationConsent is 'not_asked' and IP-country headers are present", () => {
    it("When POSTed, Then location is filled from the headers (IP fallback)", async () => {
      await POST(
        makeReq(
          { ...validBody(), locationConsent: "not_asked" },
          {
            "x-vercel-ip-country": "LU",
            "x-vercel-ip-city": "Luxembourg",
          },
        ),
      );
      const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(arg.location).toEqual({
        source: "ip",
        city: "Luxembourg",
        country: "LU",
      });
    });
  });

  describe("Given locationConsent is 'granted' with a precise location", () => {
    it("When POSTed, Then IP fallback does NOT override the precise location", async () => {
      await POST(
        makeReq(
          {
            ...validBody(),
            locationConsent: "granted",
            location: {
              source: "geolocation",
              lat: 49.6,
              lon: 6.1,
              accuracyMeters: 30,
            },
          },
          { "x-vercel-ip-country": "LU", "x-vercel-ip-city": "Luxembourg" },
        ),
      );
      const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(arg.location.source).toBe("geolocation");
    });
  });

  describe("Given locationConsent is 'denied'", () => {
    it("When POSTed, Then location stays null even if IP headers are present", async () => {
      await POST(
        makeReq(
          { ...validBody(), locationConsent: "denied", location: null },
          { "x-vercel-ip-country": "LU", "x-vercel-ip-city": "Luxembourg" },
        ),
      );
      const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(arg.location).toBeNull();
    });
  });

  describe("Given Strapi rejects the forwarded request", () => {
    it("When POSTed, Then the route returns 502", async () => {
      (submitWaitlist as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("strapi down"),
      );
      const res = await POST(makeReq(validBody()));
      expect(res.status).toBe(502);
    });
  });
});
