import { describe, it, expect } from "vitest";
import { routePayloadSchema } from "@/lib/routes-schema";

describe("routePayloadSchema", () => {
  const base = { name: "Luxembourg → Chișinău", citiesText: "Luxembourg, Chișinău" };

  it("accepts a minimal valid payload", () => {
    const r = routePayloadSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("approved");
  });

  it("accepts an explicit status", () => {
    const r = routePayloadSchema.safeParse({ ...base, status: "draft" });
    expect(r.success).toBe(true);
  });

  it("accepts optional submittedBy / claimedBy emails", () => {
    const r = routePayloadSchema.safeParse({
      ...base,
      submittedBy: "a@b.com",
      claimedBy: "c@d.com",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = routePayloadSchema.safeParse({ ...base, name: "   " });
    expect(r.success).toBe(false);
  });

  it("rejects empty citiesText", () => {
    const r = routePayloadSchema.safeParse({ ...base, citiesText: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email for submittedBy", () => {
    const r = routePayloadSchema.safeParse({ ...base, submittedBy: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("trims whitespace from name and citiesText", () => {
    const r = routePayloadSchema.safeParse({
      name: "  Lux  ",
      citiesText: "  Lux, Chi  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("Lux");
      expect(r.data.citiesText).toBe("Lux, Chi");
    }
  });
});
