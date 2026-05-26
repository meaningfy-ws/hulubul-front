// Helpers for stubbing Zitadel discovery + token + JWKS endpoints in tests.
// Generates a real RSA key pair so ID-token signatures verify correctly.

import { HttpResponse, http } from "msw";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type KeyLike,
} from "jose";
import { server } from "@/tests/msw/server";

export interface TestZitadelEnv {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  cookieSecret: string;
  idpGoogle: string;
  /** Optional — set to exercise the Facebook (Stage-2) provider path. */
  idpFacebook?: string;
  /** Optional — set to exercise the Instagram (Stage-2) provider path. */
  idpInstagram?: string;
  /** Optional — set to exercise the TikTok (Stage-2) provider path. */
  idpTiktok?: string;
}

export const TEST_ZITADEL_ENV: TestZitadelEnv = {
  issuer: "https://issuer.test.zitadel.cloud",
  clientId: "111@hulubul",
  clientSecret: "test-client-secret",
  redirectUri: "http://localhost:3000/api/auth/callback",
  cookieSecret: "this-is-a-32-byte-test-cookie-secret-padding",
  idpGoogle: "222",
};

export function applyTestZitadelEnv(env: TestZitadelEnv = TEST_ZITADEL_ENV) {
  process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
  process.env.ZITADEL_ISSUER = env.issuer;
  process.env.ZITADEL_CLIENT_ID = env.clientId;
  process.env.ZITADEL_CLIENT_SECRET = env.clientSecret;
  process.env.ZITADEL_IDP_GOOGLE = env.idpGoogle;
  if (env.idpFacebook) {
    process.env.ZITADEL_IDP_FACEBOOK = env.idpFacebook;
  }
  if (env.idpInstagram) {
    process.env.ZITADEL_IDP_INSTAGRAM = env.idpInstagram;
  }
  if (env.idpTiktok) {
    process.env.ZITADEL_IDP_TIKTOK = env.idpTiktok;
  }
  process.env.AUTH_REDIRECT_URI = env.redirectUri;
  process.env.AUTH_COOKIE_SECRET = env.cookieSecret;
}

export function clearTestZitadelEnv() {
  for (const k of [
    "NEXT_PUBLIC_AUTH_ENABLED",
    "ZITADEL_ISSUER",
    "ZITADEL_CLIENT_ID",
    "ZITADEL_CLIENT_SECRET",
    "ZITADEL_IDP_GOOGLE",
    "ZITADEL_IDP_FACEBOOK",
    "ZITADEL_IDP_INSTAGRAM",
    "ZITADEL_IDP_TIKTOK",
    "AUTH_REDIRECT_URI",
    "AUTH_COOKIE_SECRET",
  ]) {
    delete process.env[k];
  }
}

export function discoveryDoc(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/v2/authorize`,
    token_endpoint: `${issuer}/oauth/v2/token`,
    jwks_uri: `${issuer}/oauth/v2/keys`,
    userinfo_endpoint: `${issuer}/oidc/v1/userinfo`,
    end_session_endpoint: `${issuer}/oidc/v1/end_session`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint_auth_methods_supported: ["client_secret_basic"],
  };
}

export interface MockZitadel {
  publicKeyJwk: Record<string, unknown> & { kid?: string };
  privateKey: KeyLike;
  /** Sign a fresh ID token with arbitrary claim overrides. */
  signIdToken: (
    overrides?: Record<string, unknown>,
  ) => Promise<string>;
  /** Reset any installed token-endpoint behaviour. */
  setTokenResponse: (
    handler: (request: Request) => Response | Promise<Response>,
  ) => void;
  /** Convenience: have the token endpoint return a happy response with the
   * provided ID-token claims. */
  setHappyTokenResponse: (
    idTokenClaims: Record<string, unknown>,
  ) => Promise<void>;
}

export async function setupMockZitadel(
  env: TestZitadelEnv = TEST_ZITADEL_ENV,
): Promise<MockZitadel> {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = (await exportJWK(publicKey)) as unknown as Record<
    string,
    unknown
  >;
  publicJwk.kid = "test-kid-1";
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";

  let tokenHandler: (req: Request) => Response | Promise<Response> = () =>
    new Response("not configured", { status: 500 });

  server.use(
    http.get(`${env.issuer}/.well-known/openid-configuration`, () =>
      HttpResponse.json(discoveryDoc(env.issuer)),
    ),
    http.get(`${env.issuer}/oauth/v2/keys`, () =>
      HttpResponse.json({ keys: [publicJwk] }),
    ),
    http.post(`${env.issuer}/oauth/v2/token`, ({ request }) =>
      Promise.resolve(tokenHandler(request)),
    ),
  );

  async function signIdToken(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: env.issuer,
      aud: env.clientId,
      sub: "user-sub-1",
      email: "alice@example.com",
      email_verified: true,
      name: "Alice Doe",
      iat: now,
      exp: now + 300,
      ...overrides,
    };
    return await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test-kid-1" })
      .sign(privateKey);
  }

  return {
    publicKeyJwk: publicJwk,
    privateKey,
    signIdToken,
    setTokenResponse(handler) {
      tokenHandler = handler;
    },
    async setHappyTokenResponse(claims) {
      const idToken = await signIdToken(claims);
      tokenHandler = () =>
        HttpResponse.json({
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 300,
          id_token: idToken,
          scope: "openid email profile",
        });
    },
  };
}
