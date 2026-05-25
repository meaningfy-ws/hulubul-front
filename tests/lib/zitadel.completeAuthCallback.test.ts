// @vitest-environment node
// Implements scenarios from features/01-google-prefill.feature:
//   Scenario Outline: Callback fails with a security or protocol error
//     - state mismatch / missing flow cookie  -> invalid_state
//     - token endpoint error                   -> token_exchange_failed
//     - bad signature / nonce / iss / aud / exp -> token_invalid
//   Scenario: ID token returns email_verified=false
//   Scenario: happy path returns full ZitadelClaims

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/tests/msw/server";
import {
  buildAuthStart,
  completeAuthCallback,
  verifyFlowCookie,
  ZitadelAuthError,
  __resetZitadelCache,
} from "@/lib/zitadel";
import { PROVIDER_GOOGLE } from "@/lib/auth-providers";
import { AUTH_STATUS } from "@/lib/auth-events";
import {
  applyTestZitadelEnv,
  clearTestZitadelEnv,
  setupMockZitadel,
  TEST_ZITADEL_ENV,
  type MockZitadel,
} from "./zitadel.test-helper";

let mock: MockZitadel;

beforeEach(async () => {
  applyTestZitadelEnv();
  __resetZitadelCache();
  mock = await setupMockZitadel();
});

afterEach(() => {
  clearTestZitadelEnv();
  __resetZitadelCache();
});

async function startAndPrep() {
  const result = await buildAuthStart({
    provider: PROVIDER_GOOGLE,
    returnTo: "/#signup",
  });
  const flow = await verifyFlowCookie(
    result.flowCookieValue,
    process.env.AUTH_COOKIE_SECRET!,
  );
  return { result, flow };
}

describe("Feature: lib/zitadel completeAuthCallback (Stage 1)", () => {
  describe("Given a valid round-trip with a well-formed ID token", () => {
    it("Then it returns a full ZitadelClaims with provider=google", async () => {
      const { result, flow } = await startAndPrep();
      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        sub: "sub-1",
        email: "alice@example.com",
        email_verified: true,
        name: "Alice Doe",
      });
      const claims = await completeAuthCallback({
        code: "auth-code",
        state: flow.state,
        flowCookieValue: result.flowCookieValue,
      });
      expect(claims).toEqual({
        sub: "sub-1",
        email: "alice@example.com",
        emailVerified: true,
        name: "Alice Doe",
        picture: null,
        provider: PROVIDER_GOOGLE,
      });
    });

    it("And propagates email_verified=false when the upstream did not verify it", async () => {
      const { result, flow } = await startAndPrep();
      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        email_verified: false,
      });
      const claims = await completeAuthCallback({
        code: "c",
        state: flow.state,
        flowCookieValue: result.flowCookieValue,
      });
      expect(claims.emailVerified).toBe(false);
    });
  });

  describe("Given a state value that does not match the flow cookie", () => {
    it("Then it throws ZitadelAuthError(invalid_state)", async () => {
      const { result } = await startAndPrep();
      await expect(
        completeAuthCallback({
          code: "c",
          state: "wrong-state",
          flowCookieValue: result.flowCookieValue,
        }),
      ).rejects.toMatchObject({
        name: "ZitadelAuthError",
        code: AUTH_STATUS.invalidState,
      });
    });
  });

  describe("Given a malformed flow cookie", () => {
    it("Then it throws ZitadelAuthError(invalid_state)", async () => {
      await expect(
        completeAuthCallback({
          code: "c",
          state: "x",
          flowCookieValue: "not-a-jws",
        }),
      ).rejects.toMatchObject({ code: AUTH_STATUS.invalidState });
    });
  });

  describe("Given the token endpoint returns 500", () => {
    it("Then it throws ZitadelAuthError(token_exchange_failed)", async () => {
      const { result, flow } = await startAndPrep();
      mock.setTokenResponse(() =>
        HttpResponse.json(
          { error: "server_error" },
          { status: 500 },
        ),
      );
      await expect(
        completeAuthCallback({
          code: "c",
          state: flow.state,
          flowCookieValue: result.flowCookieValue,
        }),
      ).rejects.toBeInstanceOf(ZitadelAuthError);
    });
  });

  describe("Given the ID token has a nonce that does not match", () => {
    it("Then it throws ZitadelAuthError(token_invalid)", async () => {
      const { result, flow } = await startAndPrep();
      await mock.setHappyTokenResponse({
        nonce: "wrong-nonce",
      });
      await expect(
        completeAuthCallback({
          code: "c",
          state: flow.state,
          flowCookieValue: result.flowCookieValue,
        }),
      ).rejects.toMatchObject({ code: AUTH_STATUS.tokenInvalid });
    });
  });

  describe("Given the ID token signature does not match the published JWKS", () => {
    it("Then it throws ZitadelAuthError(token_invalid)", async () => {
      const { result, flow } = await startAndPrep();
      // Forge a JWT with a header that announces an unknown kid so the
      // JWKS lookup fails regardless of caching.
      const { SignJWT, generateKeyPair } = await import("jose");
      const { privateKey } = await generateKeyPair("RS256");
      const now = Math.floor(Date.now() / 1000);
      const forged = await new SignJWT({
        iss: TEST_ZITADEL_ENV.issuer,
        aud: TEST_ZITADEL_ENV.clientId,
        sub: "x",
        email: "x@example.com",
        email_verified: true,
        name: "X",
        nonce: flow.nonce,
        iat: now,
        exp: now + 300,
      })
        .setProtectedHeader({ alg: "RS256", kid: "unknown-kid" })
        .sign(privateKey);
      mock.setTokenResponse(() =>
        HttpResponse.json({
          access_token: "a",
          token_type: "Bearer",
          id_token: forged,
          expires_in: 300,
        }),
      );
      await expect(
        completeAuthCallback({
          code: "c",
          state: flow.state,
          flowCookieValue: result.flowCookieValue,
        }),
      ).rejects.toMatchObject({ code: AUTH_STATUS.tokenInvalid });
    });
  });

  describe("Given the ID token aud does not contain our client_id", () => {
    it("Then it throws ZitadelAuthError(token_invalid)", async () => {
      const { result, flow } = await startAndPrep();
      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        aud: "wrong-client",
      });
      await expect(
        completeAuthCallback({
          code: "c",
          state: flow.state,
          flowCookieValue: result.flowCookieValue,
        }),
      ).rejects.toMatchObject({ code: AUTH_STATUS.tokenInvalid });
    });
  });

  describe("Given the ID token iss does not match our issuer", () => {
    it("Then it throws ZitadelAuthError(token_invalid)", async () => {
      const { result, flow } = await startAndPrep();
      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        iss: "https://attacker.example.com",
      });
      await expect(
        completeAuthCallback({
          code: "c",
          state: flow.state,
          flowCookieValue: result.flowCookieValue,
        }),
      ).rejects.toMatchObject({ code: AUTH_STATUS.tokenInvalid });
    });
  });

  describe("Given the ID token is expired beyond clock skew", () => {
    it("Then it throws ZitadelAuthError(token_invalid)", async () => {
      const { result, flow } = await startAndPrep();
      const past = Math.floor(Date.now() / 1000) - 600;
      await mock.setHappyTokenResponse({
        nonce: flow.nonce,
        iat: past,
        exp: past + 30,
      });
      await expect(
        completeAuthCallback({
          code: "c",
          state: flow.state,
          flowCookieValue: result.flowCookieValue,
        }),
      ).rejects.toMatchObject({ code: AUTH_STATUS.tokenInvalid });
    });
  });
});
