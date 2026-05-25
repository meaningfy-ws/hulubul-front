/**
 * Short-lived signed cookie carrying Google/Facebook claims from
 * `/api/auth/callback` back to the SignupForm.
 *
 * Design choices:
 * - HS256 (HMAC) over RSA/ECDSA: symmetric key suffices because both signer
 *   and verifier live in our server process.
 * - TTL is enforced by re-checking `iat` on verify (10 minutes). We do NOT
 *   rely on the cookie's own Max-Age for security — the cookie's lifetime
 *   bound and the JWS's `iat` check are belt + braces.
 * - Single use is the route layer's job, not this module's. We expose pure
 *   sign / verify.
 */

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { isAuthProvider, type AuthProvider } from "./auth-providers";

export const PREFILL_TTL_SECONDS = 10 * 60;

export interface PrefillPayload {
  email: string;
  name: string;
  emailVerified: boolean;
  provider: AuthProvider;
  iat: number;
}

export interface SignablePrefill {
  email: string;
  name: string;
  emailVerified: boolean;
  provider: AuthProvider;
}

export class PrefillCookieInvalidError extends Error {
  constructor(reason: string) {
    super(`Prefill cookie invalid: ${reason}`);
    this.name = "PrefillCookieInvalidError";
  }
}

export class PrefillCookieExpiredError extends Error {
  constructor() {
    super("Prefill cookie expired");
    this.name = "PrefillCookieExpiredError";
  }
}

function secretKey(secret: string): Uint8Array {
  // Buffer.from is always Node's Uint8Array, avoiding realm-mismatch under
  // test environments where jsdom replaces TextEncoder's prototype.
  return Buffer.from(secret, "utf8");
}

export async function signPrefillCookie(
  payload: SignablePrefill,
  secret: string,
  iatSecondsOverride?: number,
): Promise<string> {
  const iat = iatSecondsOverride ?? Math.floor(Date.now() / 1000);
  return await new SignJWT({
    email: payload.email,
    name: payload.name,
    emailVerified: payload.emailVerified,
    provider: payload.provider,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(iat + PREFILL_TTL_SECONDS)
    .sign(secretKey(secret));
}

export async function verifyPrefillCookie(
  value: string,
  secret: string,
): Promise<PrefillPayload> {
  let claims: Record<string, unknown>;
  try {
    const result = await jwtVerify(value, secretKey(secret), {
      algorithms: ["HS256"],
    });
    claims = result.payload as Record<string, unknown>;
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      throw new PrefillCookieExpiredError();
    }
    throw new PrefillCookieInvalidError(
      err instanceof Error ? err.name : "unknown",
    );
  }

  // Belt + braces: re-check iat against the documented TTL even though jose
  // already enforced `exp`. Defends against tokens signed without exp.
  const iat = typeof claims.iat === "number" ? claims.iat : NaN;
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(iat)) {
    throw new PrefillCookieInvalidError("missing iat");
  }
  if (now - iat > PREFILL_TTL_SECONDS) {
    throw new PrefillCookieExpiredError();
  }

  if (
    typeof claims.email !== "string" ||
    typeof claims.name !== "string" ||
    typeof claims.emailVerified !== "boolean" ||
    !isAuthProvider(claims.provider)
  ) {
    throw new PrefillCookieInvalidError("malformed payload");
  }

  return {
    email: claims.email,
    name: claims.name,
    emailVerified: claims.emailVerified,
    provider: claims.provider,
    iat,
  };
}
