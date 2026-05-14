import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/server-events/hash";

describe("sha256Hex", () => {
  it("returns the SHA-256 hex digest, lowercase", async () => {
    // Reference: echo -n "hello" | sha256sum
    expect(await sha256Hex("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("normalises by trimming + lowercasing input first (per Meta CAPI spec)", async () => {
    const a = await sha256Hex("  Foo@Bar.COM  ");
    const b = await sha256Hex("foo@bar.com");
    expect(a).toBe(b);
  });

  it("returns null for empty input (caller should omit the field)", async () => {
    expect(await sha256Hex("")).toBeNull();
    expect(await sha256Hex("   ")).toBeNull();
  });
});
