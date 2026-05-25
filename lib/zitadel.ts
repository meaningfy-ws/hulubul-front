/**
 * Pure OIDC primitives for Zitadel. Per INV-3, this module:
 * - knows nothing about cookies that the application layer chooses to use
 *   (prefill, session) — it only exposes a signed "flow cookie" that carries
 *   the OIDC checks (code_verifier, state, nonce) between /api/auth/start and
 *   /api/auth/callback;
 * - does no PII logging (INV-4): errors carry codes, not user data;
 * - depends only on lib/auth-{providers,env,events} and openid-client + jose.
 *
 * The flow cookie is an HS256-signed JWT (jose). It is NOT the prefill cookie:
 * keeping the two disjoint lets us swap the prefill cookie out for a session
 * cookie in Stage 3 without touching this file (INV-3 reasoning).
 */

import * as client from "openid-client";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { readAuthEnv } from "./auth-env";
import {
  isAuthProvider,
  PROVIDER_FACEBOOK,
  PROVIDER_GOOGLE,
  PROVIDER_TIKTOK,
  type AuthProvider,
} from "./auth-providers";
import { AUTH_STATUS, type AuthStatus } from "./auth-events";

// ── Public types ───────────────────────────────────────────────────────────

export interface ZitadelClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
  provider: AuthProvider;
}

export interface AuthStartParams {
  provider: AuthProvider;
  returnTo: string;
}

export interface AuthStartResult {
  authorizationUrl: string;
  flowCookieValue: string;
}

export interface AuthCallbackParams {
  code: string;
  state: string;
  flowCookieValue: string;
  /**
   * Optional full callback URL used by openid-client to validate the request.
   * If absent, we synthesise one from the env's redirect URI + code + state.
   */
  currentUrl?: URL;
}

export interface FlowCookiePayload {
  codeVerifier: string;
  state: string;
  nonce: string;
  returnTo: string;
  createdAt: number;
}

export class ZitadelAuthError extends Error {
  readonly code: AuthStatus;
  constructor(code: AuthStatus, message: string) {
    super(message);
    this.name = "ZitadelAuthError";
    this.code = code;
  }
}

// ── Flow cookie sign / verify (HS256) ──────────────────────────────────────

const FLOW_COOKIE_TTL_SECONDS = 5 * 60;

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

async function signFlowCookie(
  payload: FlowCookiePayload,
  secret: string,
): Promise<string> {
  return await new SignJWT({
    cv: payload.codeVerifier,
    st: payload.state,
    n: payload.nonce,
    rt: payload.returnTo,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(payload.createdAt)
    .setExpirationTime(payload.createdAt + FLOW_COOKIE_TTL_SECONDS)
    .sign(secretKey(secret));
}

export async function verifyFlowCookie(
  value: string,
  secret: string,
): Promise<FlowCookiePayload> {
  try {
    const { payload } = await jwtVerify(value, secretKey(secret), {
      algorithms: ["HS256"],
    });
    const p = payload as Record<string, unknown>;
    if (
      typeof p.cv !== "string" ||
      typeof p.st !== "string" ||
      typeof p.n !== "string" ||
      typeof p.rt !== "string" ||
      typeof p.iat !== "number"
    ) {
      throw new ZitadelAuthError(
        AUTH_STATUS.invalidState,
        "flow cookie payload malformed",
      );
    }
    return {
      codeVerifier: p.cv,
      state: p.st,
      nonce: p.n,
      returnTo: p.rt,
      createdAt: p.iat,
    };
  } catch (err) {
    if (err instanceof ZitadelAuthError) throw err;
    if (err instanceof joseErrors.JWTExpired) {
      throw new ZitadelAuthError(
        AUTH_STATUS.invalidState,
        "flow cookie expired",
      );
    }
    throw new ZitadelAuthError(
      AUTH_STATUS.invalidState,
      "flow cookie signature invalid",
    );
  }
}

// ── Configuration cache ─────────────────────────────────────────────────────

// One openid-client Configuration per (issuer, clientId) per process. Cheap
// to re-create but discovery() hits the network — caching saves ~50 ms per
// request and keeps the JWKS warm.
let cachedConfig:
  | { issuer: string; clientId: string; config: client.Configuration }
  | null = null;

async function getConfig(): Promise<{
  config: client.Configuration;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  cookieSecret: string;
  idpFor: (p: AuthProvider) => string | undefined;
}> {
  const env = readAuthEnv();
  const wantKey = `${env.issuer}::${env.clientId}`;
  const haveKey = cachedConfig
    ? `${cachedConfig.issuer}::${cachedConfig.clientId}`
    : null;
  if (!cachedConfig || wantKey !== haveKey) {
    const config = await client.discovery(
      new URL(env.issuer),
      env.clientId,
      undefined,
      client.ClientSecretBasic(env.clientSecret),
    );
    // Force ID-token signature verification (defence in depth — TLS is not
    // assumed enough). Without this, oauth4webapi only validates claims.
    client.enableNonRepudiationChecks(config);
    cachedConfig = { issuer: env.issuer, clientId: env.clientId, config };
  }
  return {
    config: cachedConfig.config,
    issuer: env.issuer,
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    redirectUri: env.redirectUri,
    cookieSecret: env.cookieSecret,
    idpFor: (p) => env.idps[p],
  };
}

/** Test-only: reset the discovery cache between tests so re-applied env vars
 * take effect. Exported intentionally — keeping it out of the type-public
 * surface would just be ceremony. */
export function __resetZitadelCache(): void {
  cachedConfig = null;
}

// ── buildAuthStart ──────────────────────────────────────────────────────────

const SCOPES = "openid email profile";

export async function buildAuthStart(
  params: AuthStartParams,
): Promise<AuthStartResult> {
  if (!isAuthProvider(params.provider)) {
    throw new ZitadelAuthError(
      AUTH_STATUS.invalidState,
      `unsupported provider`,
    );
  }
  const ctx = await getConfig();
  const idpHint = ctx.idpFor(params.provider);
  if (!idpHint) {
    throw new ZitadelAuthError(
      AUTH_STATUS.invalidState,
      `IdP not configured for provider`,
    );
  }

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  const url = client.buildAuthorizationUrl(ctx.config, {
    redirect_uri: ctx.redirectUri,
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
    idp_hint: idpHint,
  });

  const createdAt = Math.floor(Date.now() / 1000);
  const flowCookieValue = await signFlowCookie(
    { codeVerifier, state, nonce, returnTo: params.returnTo, createdAt },
    ctx.cookieSecret,
  );

  return {
    authorizationUrl: url.href,
    flowCookieValue,
  };
}

// ── completeAuthCallback ───────────────────────────────────────────────────

const ID_TOKEN_PROVIDER_CLAIMS: Record<string, AuthProvider> = {
  google: PROVIDER_GOOGLE,
  facebook: PROVIDER_FACEBOOK,
  tiktok: PROVIDER_TIKTOK,
};

function inferProvider(claims: Record<string, unknown>): AuthProvider {
  // Zitadel surfaces the upstream IdP via several possible claim shapes.
  // Order matters: prefer explicit, fall back to issuer-substring.
  const raw =
    (typeof claims.provider === "string" && claims.provider) ||
    (typeof claims.idp === "string" && claims.idp) ||
    (typeof claims.amr === "string" && claims.amr) ||
    "";
  const lower = raw.toLowerCase();
  for (const key of Object.keys(ID_TOKEN_PROVIDER_CLAIMS)) {
    if (lower.includes(key)) return ID_TOKEN_PROVIDER_CLAIMS[key];
  }
  // Stage-1 default: we only ship Google. If the upstream isn't named we
  // still return PROVIDER_GOOGLE since that's the only configured idp_hint.
  return PROVIDER_GOOGLE;
}

export async function completeAuthCallback(
  params: AuthCallbackParams,
): Promise<ZitadelClaims> {
  const ctx = await getConfig();
  const flow = await verifyFlowCookie(params.flowCookieValue, ctx.cookieSecret);

  if (flow.state !== params.state) {
    throw new ZitadelAuthError(
      AUTH_STATUS.invalidState,
      "state mismatch",
    );
  }

  const callbackUrl =
    params.currentUrl ??
    (() => {
      const u = new URL(ctx.redirectUri);
      u.searchParams.set("code", params.code);
      u.searchParams.set("state", params.state);
      return u;
    })();

  let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>;
  try {
    tokens = await client.authorizationCodeGrant(ctx.config, callbackUrl, {
      pkceCodeVerifier: flow.codeVerifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    });
  } catch (err) {
    const code = mapTokenError(err);
    throw new ZitadelAuthError(
      code,
      err instanceof Error ? err.message : "token grant failed",
    );
  }

  const idClaims = tokens.claims();
  if (!idClaims) {
    throw new ZitadelAuthError(
      AUTH_STATUS.tokenInvalid,
      "ID token missing or unverifiable",
    );
  }

  const sub = idClaims.sub;
  const email = typeof idClaims.email === "string" ? idClaims.email : "";
  const emailVerified = idClaims.email_verified === true;
  const name =
    typeof idClaims.name === "string" && idClaims.name.length > 0
      ? idClaims.name
      : [idClaims.given_name, idClaims.family_name]
          .filter((s): s is string => typeof s === "string")
          .join(" ")
          .trim();
  const picture =
    typeof idClaims.picture === "string" && idClaims.picture.length > 0
      ? idClaims.picture
      : null;

  if (!sub || !email) {
    throw new ZitadelAuthError(
      AUTH_STATUS.tokenInvalid,
      "ID token missing sub or email",
    );
  }

  return {
    sub,
    email,
    emailVerified,
    name,
    picture,
    provider: inferProvider(idClaims as Record<string, unknown>),
  };
}

function mapTokenError(err: unknown): AuthStatus {
  const msg =
    err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  // openid-client / oauth4webapi surface ID-token validation problems as
  // messages mentioning "jwt", "claim", "signature", "nonce", etc. The state
  // mismatch path is its own predicate.
  if (msg.includes("state")) return AUTH_STATUS.invalidState;
  if (
    msg.includes("jwt") ||
    msg.includes("jws") ||
    msg.includes("claim") ||
    msg.includes("signature") ||
    msg.includes("verification") ||
    msg.includes("nonce") ||
    msg.includes("expired") ||
    msg.includes("not yet valid") ||
    msg.includes("invalid_token") ||
    msg.includes("id token") ||
    msg.includes("id_token") ||
    msg.includes("audience") ||
    msg.includes("issuer") ||
    msg.includes("key") // "no matching key found" from JWKS
  ) {
    return AUTH_STATUS.tokenInvalid;
  }
  return AUTH_STATUS.tokenExchangeFailed;
}
