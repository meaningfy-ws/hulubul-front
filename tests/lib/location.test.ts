import { describe, expect, it } from "vitest";
import { resolveIpLocation } from "@/lib/location";

function reqWithHeaders(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/test", { headers });
}

describe("Feature: resolveIpLocation", () => {
  describe("Given x-vercel-ip-country and x-vercel-ip-city headers", () => {
    it("When resolved, Then it returns an IP location from those headers", () => {
      const result = resolveIpLocation(
        reqWithHeaders({ "x-vercel-ip-country": "LU", "x-vercel-ip-city": "Luxembourg" }),
      );
      expect(result).toEqual({ source: "ip", city: "Luxembourg", country: "LU" });
    });
  });

  describe("Given only a cf-ipcountry header (no Vercel country header)", () => {
    it("When resolved, Then country falls back to the Cloudflare header", () => {
      const result = resolveIpLocation(reqWithHeaders({ "cf-ipcountry": "MD" }));
      expect(result).toEqual({ source: "ip", city: null, country: "MD" });
    });
  });

  describe("Given both x-vercel-ip-country and cf-ipcountry are present", () => {
    it("When resolved, Then the Vercel header wins", () => {
      const result = resolveIpLocation(
        reqWithHeaders({ "x-vercel-ip-country": "LU", "cf-ipcountry": "MD" }),
      );
      expect(result?.country).toBe("LU");
    });
  });

  describe("Given no geo headers are present", () => {
    it("When resolved, Then it returns null", () => {
      expect(resolveIpLocation(reqWithHeaders({}))).toBeNull();
    });
  });
});
