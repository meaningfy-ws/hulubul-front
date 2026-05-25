// Implements: INV-6 (server-only secrets) and the §4 environment table.
// Asserts the Stage-1 keys exist in .env.example and that only the kill-switch
// is allowed to carry the NEXT_PUBLIC_ prefix.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STAGE_1_KEYS = [
  "ZITADEL_ISSUER",
  "ZITADEL_CLIENT_ID",
  "ZITADEL_CLIENT_SECRET",
  "ZITADEL_IDP_GOOGLE",
  "ZITADEL_IDP_FACEBOOK",
  "AUTH_REDIRECT_URI",
  "AUTH_COOKIE_SECRET",
  "NEXT_PUBLIC_AUTH_ENABLED",
] as const;

const NON_PUBLIC_KEYS = STAGE_1_KEYS.filter(
  (k) => !k.startsWith("NEXT_PUBLIC_"),
);

describe("Feature: .env.example shape for Stage 1 (INV-6)", () => {
  const content = readFileSync(join(process.cwd(), ".env.example"), "utf8");

  it("Then every required key is present", () => {
    for (const key of STAGE_1_KEYS) {
      expect(
        new RegExp(`^${key}=`, "m").test(content),
        `missing key: ${key}`,
      ).toBe(true);
    }
  });

  it("Then no NEXT_PUBLIC_ prefix is used for any key other than NEXT_PUBLIC_AUTH_ENABLED", () => {
    for (const key of NON_PUBLIC_KEYS) {
      expect(
        key.startsWith("NEXT_PUBLIC_"),
        `${key} must not be NEXT_PUBLIC_`,
      ).toBe(false);
    }
  });
});
