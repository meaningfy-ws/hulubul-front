// @vitest-environment node
// Implements scenarios from auth-02-facebook-tiktok.feature (TikTok track).
// Same pattern as the Facebook / Instagram integration tests.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyTestZitadelEnv,
  clearTestZitadelEnv,
  setupMockZitadel,
  TEST_ZITADEL_ENV,
  type MockZitadel,
} from "@/tests/lib/zitadel.test-helper";
import { __resetZitadelCache, verifyFlowCookie } from "@/lib/zitadel";
import { verifyPrefillCookie } from "@/lib/prefill-cookie";
import { OIDC_FLOW_COOKIE, PREFILL_COOKIE } from "@/lib/cookies";
import { PROVIDER_TIKTOK } from "@/lib/auth-providers";
import { AUTH_STATUS } from "@/lib/auth-events";

const TIKTOK_IDP = "555";

let startGet: typeof import("@/app/api/auth/start/route")["GET"];
let callbackGet: typeof import("@/app/api/auth/callback/route")["GET"];
let mock: MockZitadel;

beforeEach(async () => {
  applyTestZitadelEnv({ ...TEST_ZITADEL_ENV, idpTiktok: TIKTOK_IDP });
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

describe("Feature: end-to-end /api/auth/start → /api/auth/callback (TikTok)", () => {
  describe("Given ZITADEL_IDP_TIKTOK is set and a happy TikTok round-trip with email", () => {
    it("Then start redirects with the TikTok idp_hint and the callback writes a TikTok-tagged prefill cookie", async () => {
      const startRes = await startGet(
        new Request("http://localhost:3000/api/auth/start?provider=tiktok"),
      );
      expect(startRes.status).toBe(302);

      const location = startRes.headers.get("location") ?? "";
      expect(location).toMatch(/idp_hint=555(?:&|$)/);

      const flowCookie = getSetCookieValue(startRes, OIDC_FLOW_COOKIE);
      expect(flowCookie).toBeTruthy();
      const flow = await verifyFlowCookie(
        flowCookie!,
        process.env.AUTH_COOKIE_SECRET!,
      );

      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        sub: "tt-sub-1",
        email: "diana@example.com",
        email_verified: true,
        name: "Diana Vee",
        provider: "tiktok",
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
        email: "diana@example.com",
        name: "Diana Vee",
        emailVerified: true,
        provider: PROVIDER_TIKTOK,
      });
    });
  });

  describe("Given the user cancels at TikTok", () => {
    it("Then callback redirects to /#signup?auth_status=cancelled with no prefill cookie", async () => {
      await startGet(
        new Request("http://localhost:3000/api/auth/start?provider=tiktok"),
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

  describe("Given ZITADEL_IDP_TIKTOK is NOT set", () => {
    it("Then provider=tiktok returns 400 (IdP not configured)", async () => {
      delete process.env.ZITADEL_IDP_TIKTOK;
      __resetZitadelCache();
      const res = await startGet(
        new Request("http://localhost:3000/api/auth/start?provider=tiktok"),
      );
      expect(res.status).toBe(400);
    });
  });
});
