import { describe, expect, it } from "vitest";
import { maskEmail } from "@/lib/errors/mask";

describe("maskEmail", () => {
  it("keeps the first local char and the full domain, masking the rest", () => {
    expect(maskEmail("adsavciuc55@gmail.com")).toBe("a***@gmail.com");
  });

  it("masks a single-char local part too", () => {
    expect(maskEmail("a@b.com")).toBe("a***@b.com");
  });

  it("trims and lowercases before masking", () => {
    expect(maskEmail("  Foo@Bar.COM ")).toBe("f***@bar.com");
  });

  it("returns *** for empty or non-email input (never leaks, never throws)", () => {
    expect(maskEmail("")).toBe("***");
    expect(maskEmail("notanemail")).toBe("***");
    expect(maskEmail(undefined as unknown as string)).toBe("***");
  });
});
