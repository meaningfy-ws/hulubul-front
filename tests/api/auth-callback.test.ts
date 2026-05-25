// @vitest-environment node
// Implements scenarios:
//   "User cancels at Google's consent screen"
//   "Callback fails with a security or protocol error" (state mismatch etc.)
//   "Kill-switch off — buttons hidden, routes 404"
//   "First-time Google sign-in prefills the waitlist form" (callback half)

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyTestZitadelEnv,
  clearTestZitadelEnv,
  setupMockZitadel,
  type MockZitadel,
} from "@/tests/lib/zitadel.test-helper";
import {
  __resetZitadelCache,
  buildAuthStart,
  verifyFlowCookie,
} from "@/lib/zitadel";
import { PROVIDER_GOOGLE } from "@/lib/auth-providers";
import { OIDC_FLOW_COOKIE, PREFILL_COOKIE } from "@/lib/cookies";
import { AUTH_STATUS } from "@/lib/auth-events";

let GET: typeof import("@/app/api/auth/callback/route")["GET"];
let mock: MockZitadel;

beforeEach(async () => {
  applyTestZitadelEnv();
  __resetZitadelCache();
  mock = await setupMockZitadel();
  ({ GET } = await import("@/app/api/auth/callback/route"));
});

afterEach(() => {
  clearTestZitadelEnv();
  __resetZitadelCache();
});

async function startFlow() {
  const start = await buildAuthStart({
    provider: PROVIDER_GOOGLE,
    returnTo: "/#signup",
  });
  const flow = await verifyFlowCookie(
    start.flowCookieValue,
    process.env.AUTH_COOKIE_SECRET!,
  );
  return { start, flow };
}

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

function cookieHeader(name: string, value: string) {
  return `${name}=${value}`;
}

describe("Feature: GET /api/auth/callback", () => {
  describe("Given the kill-switch is off", () => {
    it("Then the callback returns 404", async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "false";
      __resetZitadelCache();
      ({ GET } = await import("@/app/api/auth/callback/route"));
      const res = await GET(req("http://localhost:3000/api/auth/callback?code=x&state=y"));
      expect(res.status).toBe(404);
    });
  });

  describe("Given the user cancelled at Google (error=access_denied)", () => {
    it("Then the callback redirects to /#signup?auth_status=cancelled with no prefill cookie", async () => {
      const res = await GET(
        req(
          "http://localhost:3000/api/auth/callback?error=access_denied&error_description=denied",
        ),
      );
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        `/#signup?auth_status=${AUTH_STATUS.cancelled}`,
      );
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).not.toContain(`${PREFILL_COOKIE}=`);
      // Flow cookie should be cleared on any callback end.
      expect(setCookie).toContain(`${OIDC_FLOW_COOKIE}=;`);
    });
  });

  describe("Given a happy callback with a valid code, state, and flow cookie", () => {
    it("Then the callback responds 302 /#signup and sets a prefill cookie + clears the flow cookie", async () => {
      const { start, flow } = await startFlow();
      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        sub: "sub-1",
        email: "alice@example.com",
        email_verified: true,
        name: "Alice Doe",
      });
      const res = await GET(
        req(
          `http://localhost:3000/api/auth/callback?code=ok-code&state=${flow.state}`,
          { cookie: cookieHeader(OIDC_FLOW_COOKIE, start.flowCookieValue) },
        ),
      );
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/#signup");
      const setCookies = res.headers.getSetCookie?.() ?? [
        res.headers.get("set-cookie") ?? "",
      ];
      const cookiesStr = setCookies.join("\n");
      expect(cookiesStr).toContain(`${PREFILL_COOKIE}=`);
      expect(cookiesStr).toContain(`${OIDC_FLOW_COOKIE}=;`);
    });
  });

  describe("Given a state value that does not match the flow cookie", () => {
    it("Then the callback redirects to /#signup?auth_status=invalid_state", async () => {
      const { start } = await startFlow();
      const res = await GET(
        req(
          "http://localhost:3000/api/auth/callback?code=ok-code&state=wrong-state",
          { cookie: cookieHeader(OIDC_FLOW_COOKIE, start.flowCookieValue) },
        ),
      );
      expect(res.headers.get("location")).toBe(
        `/#signup?auth_status=${AUTH_STATUS.invalidState}`,
      );
    });
  });

  describe("Given the flow cookie is missing", () => {
    it("Then the callback redirects to /#signup?auth_status=invalid_state", async () => {
      const res = await GET(
        req("http://localhost:3000/api/auth/callback?code=ok-code&state=anything"),
      );
      expect(res.headers.get("location")).toBe(
        `/#signup?auth_status=${AUTH_STATUS.invalidState}`,
      );
    });
  });

  describe("Given an attacker injects a return_to query param", () => {
    it("Then the final redirect ignores it and lands on /#signup (open-redirect guard)", async () => {
      const { start, flow } = await startFlow();
      await mock.setHappyTokenResponse({ nonce: flow.nonce });
      const res = await GET(
        req(
          `http://localhost:3000/api/auth/callback?code=ok&state=${flow.state}&return_to=https://evil.example.com`,
          { cookie: cookieHeader(OIDC_FLOW_COOKIE, start.flowCookieValue) },
        ),
      );
      expect(res.headers.get("location")).toBe("/#signup");
    });
  });
});
