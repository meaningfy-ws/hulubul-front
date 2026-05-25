// @vitest-environment node
// Implements scenarios: "First-time Google sign-in prefills the waitlist form"
// (start half — the URL we hand to the user before they ever see Google).

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildAuthStart, ZitadelAuthError } from "@/lib/zitadel";
import {
  applyTestZitadelEnv,
  clearTestZitadelEnv,
  setupMockZitadel,
  TEST_ZITADEL_ENV,
} from "./zitadel.test-helper";
import { PROVIDER_GOOGLE, PROVIDER_FACEBOOK } from "@/lib/auth-providers";
import { verifyFlowCookie } from "@/lib/zitadel";

beforeEach(async () => {
  applyTestZitadelEnv();
  await setupMockZitadel();
});

afterEach(() => clearTestZitadelEnv());

describe("Feature: lib/zitadel buildAuthStart (Stage 1)", () => {
  describe("Given a happy Google auth start request", () => {
    it("Then the authorization URL contains client_id, scope, PKCE, state, nonce, redirect_uri, idp_hint", async () => {
      const result = await buildAuthStart({
        provider: PROVIDER_GOOGLE,
        returnTo: "/#signup",
      });

      const url = new URL(result.authorizationUrl);
      expect(url.origin + url.pathname).toBe(
        `${TEST_ZITADEL_ENV.issuer}/oauth/v2/authorize`,
      );
      const p = url.searchParams;
      expect(p.get("client_id")).toBe(TEST_ZITADEL_ENV.clientId);
      expect(p.get("response_type")).toBe("code");
      expect(p.get("scope")?.split(" ").sort()).toEqual([
        "email",
        "openid",
        "profile",
      ]);
      expect(p.get("code_challenge_method")).toBe("S256");
      expect(p.get("code_challenge")).toBeTruthy();
      expect(p.get("state")).toBeTruthy();
      expect(p.get("nonce")).toBeTruthy();
      expect(p.get("redirect_uri")).toBe(TEST_ZITADEL_ENV.redirectUri);
      expect(p.get("idp_hint")).toBe(TEST_ZITADEL_ENV.idpGoogle);
      // prompt=select_account so visitors with multiple Google accounts get
      // the picker every time, not whichever account is currently "primary".
      expect(p.get("prompt")).toBe("select_account");
    });

    it("Then the flow cookie value decodes back to {code_verifier, state, nonce, returnTo, createdAt}", async () => {
      const result = await buildAuthStart({
        provider: PROVIDER_GOOGLE,
        returnTo: "/#signup",
      });
      const cookie = await verifyFlowCookie(
        result.flowCookieValue,
        process.env.AUTH_COOKIE_SECRET!,
      );
      const url = new URL(result.authorizationUrl);
      expect(cookie.state).toBe(url.searchParams.get("state"));
      expect(cookie.nonce).toBe(url.searchParams.get("nonce"));
      expect(typeof cookie.codeVerifier).toBe("string");
      expect(cookie.codeVerifier.length).toBeGreaterThan(20);
      expect(cookie.returnTo).toBe("/#signup");
      expect(typeof cookie.createdAt).toBe("number");
    });
  });

  describe("Given an unsupported provider in the request", () => {
    it("Then buildAuthStart throws a ZitadelAuthError", async () => {
      await expect(
        buildAuthStart({
          provider: PROVIDER_FACEBOOK,
          returnTo: "/#signup",
        }),
      ).rejects.toBeInstanceOf(ZitadelAuthError);
    });
  });
});
