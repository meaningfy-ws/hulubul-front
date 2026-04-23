import { describe, it, expect } from "vitest";
import { waitlistSchema } from "@/lib/waitlist-schema";

describe("waitlistSchema", () => {
  const base = {
    name: "Ion Popescu",
    email: "ion@example.com",
    role: "expeditor" as const,
    routes: "Luxembourg - Chișinău",
  };

  it("accepts a full valid payload with whatsapp", () => {
    const result = waitlistSchema.safeParse({
      ...base,
      whatsapp: "+352 621 123 456",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the minimum valid payload (no whatsapp)", () => {
    const result = waitlistSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.whatsapp).toBeUndefined();
  });

  it("rejects unknown role values", () => {
    const result = waitlistSchema.safeParse({ ...base, role: "invader" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email format", () => {
    const result = waitlistSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = waitlistSchema.safeParse({ ...base, name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects missing routes", () => {
    const { routes: _omit, ...withoutRoutes } = base;
    const result = waitlistSchema.safeParse(withoutRoutes);
    expect(result.success).toBe(false);
  });

  it("rejects empty routes string", () => {
    const result = waitlistSchema.safeParse({ ...base, routes: "   " });
    expect(result.success).toBe(false);
  });

  it("trims whitespace on all string fields", () => {
    const result = waitlistSchema.safeParse({
      name: "  Ion  ",
      email: "  ion@example.com  ",
      whatsapp: "  +373 600 00 000  ",
      role: "ambele",
      routes: "  LUX - KIV  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ion");
      expect(result.data.email).toBe("ion@example.com");
      expect(result.data.whatsapp).toBe("+373 600 00 000");
      expect(result.data.routes).toBe("LUX - KIV");
    }
  });

  it("treats empty whatsapp as undefined", () => {
    const result = waitlistSchema.safeParse({ ...base, whatsapp: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.whatsapp).toBeUndefined();
  });
});
