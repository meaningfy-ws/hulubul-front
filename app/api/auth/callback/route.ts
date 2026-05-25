/**
 * GET /api/auth/callback?code=…&state=…
 *
 * Completes the OIDC round-trip:
 * - if Zitadel returned an `error` query param (user cancelled), redirect
 *   to the signup form with `auth_status=cancelled`;
 * - otherwise verify state+nonce, exchange code, verify ID token, and write
 *   a single-use prefill cookie. Always clear the OIDC flow cookie.
 *
 * `return_to` is hardcoded to `/#signup` (S1-R2: open-redirect guard).
 */

import { isAuthEnabled, readAuthEnv } from "@/lib/auth-env";
import {
  OIDC_FLOW_COOKIE,
  PREFILL_COOKIE,
} from "@/lib/cookies";
import {
  completeAuthCallback,
  ZitadelAuthError,
} from "@/lib/zitadel";
import { signPrefillCookie } from "@/lib/prefill-cookie";
import {
  AUTH_EVT,
  AUTH_STATUS,
  type AuthStatus,
} from "@/lib/auth-events";
import { logger } from "@/lib/logger";

const RETURN_TO = "/#signup";
const PREFILL_COOKIE_MAX_AGE = 10 * 60;

function notFound(): Response {
  return new Response(null, { status: 404 });
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function buildClearFlowCookieHeader(): string {
  const secure = isProd() ? "; Secure" : "";
  return `${OIDC_FLOW_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

function buildPrefillCookieHeader(value: string): string {
  const secure = isProd() ? "; Secure" : "";
  return `${PREFILL_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${PREFILL_COOKIE_MAX_AGE}`;
}

function redirectWithStatus(
  status: AuthStatus | null,
  extraSetCookies: string[] = [buildClearFlowCookieHeader()],
): Response {
  const location = status ? `${RETURN_TO}?auth_status=${status}` : RETURN_TO;
  const headers = new Headers({ location });
  for (const c of extraSetCookies) headers.append("set-cookie", c);
  return new Response(null, { status: 302, headers });
}

function readFlowCookieFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === OIDC_FLOW_COOKIE) return rest.join("=");
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthEnabled()) return notFound();

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    logger.info("api/auth/callback", AUTH_EVT.callbackFailed);
    return redirectWithStatus(AUTH_STATUS.cancelled);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirectWithStatus(AUTH_STATUS.invalidState);
  }

  const flowCookieValue = readFlowCookieFromRequest(request);
  if (!flowCookieValue) {
    return redirectWithStatus(AUTH_STATUS.invalidState);
  }

  let env;
  try {
    env = readAuthEnv();
  } catch {
    return notFound();
  }

  try {
    const claims = await completeAuthCallback({
      code,
      state,
      flowCookieValue,
      currentUrl: new URL(`${env.redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`),
    });
    const prefillValue = await signPrefillCookie(
      {
        email: claims.email,
        name: claims.name,
        emailVerified: claims.emailVerified,
        provider: claims.provider,
      },
      env.cookieSecret,
    );
    logger.info(
      "api/auth/callback",
      claims.emailVerified
        ? AUTH_EVT.callbackSuccess
        : AUTH_EVT.callbackSuccessUnverified,
    );
    return redirectWithStatus(null, [
      buildPrefillCookieHeader(prefillValue),
      buildClearFlowCookieHeader(),
    ]);
  } catch (err) {
    const status =
      err instanceof ZitadelAuthError
        ? err.code
        : AUTH_STATUS.tokenExchangeFailed;
    logger.warn(
      "api/auth/callback",
      AUTH_EVT.callbackFailed,
      err instanceof Error ? err.message : "unknown",
    );
    return redirectWithStatus(status);
  }
}
