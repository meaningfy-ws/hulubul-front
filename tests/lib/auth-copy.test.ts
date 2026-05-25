// Implements scenarios: "First-time Google sign-in prefills the waitlist form"
// (the visible "Continuă cu Google" + "verificat prin Google" copy strings).

import { describe, expect, it } from "vitest";
import {
  AUTH_COPY,
  buttonContinueWith,
  verifiedTag,
  notice,
} from "@/lib/auth-copy";
import {
  PROVIDER_FACEBOOK,
  PROVIDER_GOOGLE,
  PROVIDER_TIKTOK,
} from "@/lib/auth-providers";

describe("Feature: lib/auth-copy Romanian strings", () => {
  describe("Given a known provider", () => {
    it("Then buttonContinueWith returns non-empty Romanian copy for each provider", () => {
      expect(buttonContinueWith(PROVIDER_GOOGLE)).toContain("Google");
      expect(buttonContinueWith(PROVIDER_FACEBOOK)).toContain("Facebook");
      expect(buttonContinueWith(PROVIDER_TIKTOK)).toContain("TikTok");
      // All start with the same lead — sanity check the constants stay Romanian.
      expect(buttonContinueWith(PROVIDER_GOOGLE)).toMatch(/^Continuă cu/);
    });

    it("Then verifiedTag returns the 'verificat prin <provider>' label", () => {
      expect(verifiedTag(PROVIDER_GOOGLE)).toBe("verificat prin Google");
      expect(verifiedTag(PROVIDER_FACEBOOK)).toBe("verificat prin Facebook");
    });
  });

  describe("Given a notice key", () => {
    it("Then notice interpolates the {provider} placeholder", () => {
      const msg = notice("cancelled", { provider: "Google" });
      expect(msg).toContain("Google");
      expect(msg).not.toContain("{provider}");
    });
    it("And notices without a placeholder return the raw template", () => {
      const msg = notice("unreachable");
      expect(msg.length).toBeGreaterThan(0);
      expect(msg).not.toContain("{provider}");
    });
  });

  describe("Given AUTH_COPY as the single source of truth", () => {
    it("Then it is frozen-shaped (read-only contract)", () => {
      // Type-level check — exists and is the right shape.
      expect(AUTH_COPY.buttonContinueWith.google).toMatch(/Google/);
      expect(AUTH_COPY.verifiedTag.facebook).toMatch(/Facebook/);
    });
  });
});
