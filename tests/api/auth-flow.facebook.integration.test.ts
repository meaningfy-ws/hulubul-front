// @vitest-environment node
// Implements scenarios from auth-02-facebook-tiktok.feature:
//   "Facebook prefill happy path"
//   "Facebook cancel path mirrors Google cancel path"
//
// Mirrors auth-flow.integration.test.ts (Google) precisely — the whole point
// of Stage 2 is that adding a provider requires no new code paths, only a
// different env value and a different provider name on the way in.

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
import { PROVIDER_FACEBOOK } from "@/lib/auth-providers";
import { AUTH_STATUS } from "@/lib/auth-events";

const FACEBOOK_IDP = "333";

let startGet: typeof import("@/app/api/auth/start/route")["GET"];
let callbackGet: typeof import("@/app/api/auth/callback/route")["GET"];
let mock: MockZitadel;

beforeEach(async () => {
  applyTestZitadelEnv({ ...TEST_ZITADEL_ENV, idpFacebook: FACEBOOK_IDP });
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

describe("Feature: end-to-end /api/auth/start → /api/auth/callback (Facebook)", () => {
  describe("Given ZITADEL_IDP_FACEBOOK is set and a happy Facebook round-trip", () => {
    it("Then start redirects to Zitadel with the Facebook idp_hint and the callback writes a Facebook-tagged prefill cookie", async () => {
      const startRes = await startGet(
        new Request(
          "http://localhost:3000/api/auth/start?provider=facebook",
        ),
      );
      expect(startRes.status).toBe(302);

      const location = startRes.headers.get("location") ?? "";
      expect(location).toMatch(/idp_hint=333(?:&|$)/);

      const flowCookie = getSetCookieValue(startRes, OIDC_FLOW_COOKIE);
      expect(flowCookie).toBeTruthy();
      const flow = await verifyFlowCookie(
        flowCookie!,
        process.env.AUTH_COOKIE_SECRET!,
      );

      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        sub: "fb-sub-1",
        email: "bob@example.com",
        email_verified: true,
        name: "Bob Roe",
        // Zitadel surfaces the upstream IdP via these claim shapes;
        // inferProvider in lib/zitadel.ts looks at provider/idp/amr.
        provider: "facebook",
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
        email: "bob@example.com",
        name: "Bob Roe",
        emailVerified: true,
        provider: PROVIDER_FACEBOOK,
      });
    });
  });

  describe("Given the user cancels at Facebook", () => {
    it("Then callback redirects to /#signup?auth_status=cancelled with no prefill cookie (mirrors Google)", async () => {
      await startGet(
        new Request(
          "http://localhost:3000/api/auth/start?provider=facebook",
        ),
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

  describe("Given ZITADEL_IDP_FACEBOOK is NOT set", () => {
    it("Then provider=facebook returns 400 (IdP not configured)", async () => {
      delete process.env.ZITADEL_IDP_FACEBOOK;
      __resetZitadelCache();
      const res = await startGet(
        new Request(
          "http://localhost:3000/api/auth/start?provider=facebook",
        ),
      );
      expect(res.status).toBe(400);
    });
  });
});
