import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSha, buildSignature } from "@/lib/build-info";

afterEach(() => vi.unstubAllEnvs());

describe("buildSha / buildSignature", () => {
  it("returns the full sha and a 7-char short signature when the env is set", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_BUILD_SHA",
      "2f64ec1abc1234567890abcdef1234567890abcd",
    );
    expect(buildSha()).toBe("2f64ec1abc1234567890abcdef1234567890abcd");
    expect(buildSignature()).toBe("2f64ec1");
  });

  it("trims surrounding whitespace", () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_SHA", "  abcdef1234  ");
    expect(buildSignature()).toBe("abcdef1");
  });

  it("returns null when unset, empty, or not a hex sha (no 'undefined' in footer)", () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_SHA", "");
    expect(buildSha()).toBeNull();
    expect(buildSignature()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_BUILD_SHA", "not-a-sha");
    expect(buildSignature()).toBeNull();
  });
});
