// @vitest-environment node
// End-to-end integration: drives /api/auth/start through to /api/auth/callback
// with MSW mocking Zitadel discovery, token, and JWKS endpoints. Verifies the
// cookie hand-off and the final redirect target.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyTestZitadelEnv,
  clearTestZitadelEnv,
  setupMockZitadel,
  type MockZitadel,
} from "@/tests/lib/zitadel.test-helper";
import { __resetZitadelCache, verifyFlowCookie } from "@/lib/zitadel";
import { verifyPrefillCookie } from "@/lib/prefill-cookie";
import { OIDC_FLOW_COOKIE, PREFILL_COOKIE } from "@/lib/cookies";
import { PROVIDER_GOOGLE } from "@/lib/auth-providers";
import { AUTH_STATUS } from "@/lib/auth-events";

let startGet: typeof import("@/app/api/auth/start/route")["GET"];
let callbackGet: typeof import("@/app/api/auth/callback/route")["GET"];
let mock: MockZitadel;

beforeEach(async () => {
  applyTestZitadelEnv();
  __resetZitadelCache();
  mock = await setupMockZitadel();
  ({ GET: startGet } = await import("@/app/api/auth/start/route"));
  ({ GET: callbackGet } = await import("@/app/api/auth/callback/route"));
});

afterEach(() => {
  clearTestZitadelEnv();
  __resetZitadelCache();
});

function getSetCookieValue(res: Response, name: string): string | null {
  const cookies = res.headers.getSetCookie?.() ?? [
    res.headers.get("set-cookie") ?? "",
  ];
  for (const c of cookies) {
    const m = c.match(new RegExp(`^${name}=([^;]*)`));
    if (m) return m[1];
  }
  return null;
}

describe("Feature: end-to-end /api/auth/start → /api/auth/callback", () => {
  describe("Given a happy Google round-trip", () => {
    it("Then start sets a flow cookie, callback consumes it and sets a prefill cookie", async () => {
      const startRes = await startGet(
        new Request("http://localhost:3000/api/auth/start?provider=google"),
      );
      expect(startRes.status).toBe(302);

      const flowCookie = getSetCookieValue(startRes, OIDC_FLOW_COOKIE);
      expect(flowCookie).toBeTruthy();
      const flow = await verifyFlowCookie(
        flowCookie!,
        process.env.AUTH_COOKIE_SECRET!,
      );

      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        sub: "sub-1",
        email: "alice@example.com",
        email_verified: true,
        name: "Alice Doe",
      });

      const callbackRes = await callbackGet(
        new Request(
          `http://localhost:3000/api/auth/callback?code=c&state=${encodeURIComponent(flow.state)}`,
          { headers: { cookie: `${OIDC_FLOW_COOKIE}=${flowCookie}` } },
        ),
      );
      expect(callbackRes.status).toBe(302);
      expect(callbackRes.headers.get("location")).toBe("/#signup");

      const prefillCookie = getSetCookieValue(callbackRes, PREFILL_COOKIE);
      expect(prefillCookie).toBeTruthy();
      const payload = await verifyPrefillCookie(
        prefillCookie!,
        process.env.AUTH_COOKIE_SECRET!,
      );
      expect(payload).toMatchObject({
        email: "alice@example.com",
        name: "Alice Doe",
        emailVerified: true,
        provider: PROVIDER_GOOGLE,
      });
    });
  });

  describe("Given the user cancels at Google", () => {
    it("Then start sets a flow cookie that callback never consumes; callback redirects to /#signup?auth_status=cancelled with no prefill cookie", async () => {
      await startGet(
        new Request("http://localhost:3000/api/auth/start?provider=google"),
      );
      const callbackRes = await callbackGet(
        new Request(
          "http://localhost:3000/api/auth/callback?error=access_denied",
        ),
      );
      expect(callbackRes.headers.get("location")).toBe(
        `/#signup?auth_status=${AUTH_STATUS.cancelled}`,
      );
      expect(getSetCookieValue(callbackRes, PREFILL_COOKIE)).toBeNull();
    });
  });
});
