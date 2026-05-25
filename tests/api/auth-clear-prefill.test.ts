// @vitest-environment node
// Implements scenarios from features/auth-01-google-prefill.feature:
//   "Forget-me clears the prefill cookie and brings the auth UI back"

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { PREFILL_COOKIE } from "@/lib/cookies";

let POST: typeof import("@/app/api/auth/clear-prefill/route")["POST"];

beforeEach(async () => {
  process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
  ({ POST } = await import("@/app/api/auth/clear-prefill/route"));
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
});

function req() {
  return new Request("http://localhost:3000/api/auth/clear-prefill", {
    method: "POST",
  });
}

describe("Feature: POST /api/auth/clear-prefill", () => {
  describe("Given the kill-switch is on", () => {
    it("Then it responds 204 and emits a Set-Cookie clearing PREFILL_COOKIE", async () => {
      const res = await POST(req());
      expect(res.status).toBe(204);
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain(`${PREFILL_COOKIE}=;`);
      expect(setCookie.toLowerCase()).toContain("max-age=0");
      expect(setCookie.toLowerCase()).toContain("httponly");
      expect(setCookie.toLowerCase()).toContain("samesite=lax");
    });
  });

  describe("Given the kill-switch is off", () => {
    it("Then the route returns 404", async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "false";
      ({ POST } = await import("@/app/api/auth/clear-prefill/route"));
      const res = await POST(req());
      expect(res.status).toBe(404);
    });
  });
});
