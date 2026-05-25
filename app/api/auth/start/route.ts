/**
 * GET /api/auth/start?provider=<google|facebook|tiktok>
 *
 * Entry point for the OIDC round-trip:
 * - validates the kill-switch and the requested provider;
 * - builds a Zitadel authorize URL (with PKCE + state + nonce);
 * - sets the short-lived OIDC flow cookie;
 * - redirects the user to Zitadel.
 *
 * `return_to` is intentionally not honoured (S1-R2 / Stage-1 spec):
 * Stage 1 always returns to `/#signup`. Stage 3 will revisit.
 */

import { isAuthEnabled } from "@/lib/auth-env";
import { isAuthProvider, type AuthProvider } from "@/lib/auth-providers";
import { OIDC_FLOW_COOKIE } from "@/lib/cookies";
import { buildAuthStart, ZitadelAuthError } from "@/lib/zitadel";
import { logger } from "@/lib/logger";
import { AUTH_EVT } from "@/lib/auth-events";

const FLOW_COOKIE_MAX_AGE = 5 * 60;
const RETURN_TO = "/#signup";
const UNREACHABLE_REDIRECT = `${RETURN_TO}?auth_status=unreachable`;

function notFound(): Response {
  return new Response(null, { status: 404 });
}

function badRequest(reason: string): Response {
  return new Response(reason, { status: 400 });
}

function flowCookieHeader(value: string): string {
  // Production sets Secure; dev (HTTP localhost) keeps cookie usable.
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${OIDC_FLOW_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${FLOW_COOKIE_MAX_AGE}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthEnabled()) return notFound();

  const url = new URL(request.url);
  const providerParam = url.searchParams.get("provider");
  if (!providerParam || !isAuthProvider(providerParam)) {
    return badRequest("invalid provider");
  }
  const provider: AuthProvider = providerParam;

  try {
    const result = await buildAuthStart({ provider, returnTo: RETURN_TO });
    logger.info("api/auth/start", AUTH_EVT.startRequested);
    return new Response(null, {
      status: 302,
      headers: {
        location: result.authorizationUrl,
        "set-cookie": flowCookieHeader(result.flowCookieValue),
      },
    });
  } catch (err) {
    if (err instanceof ZitadelAuthError) {
      // ZitadelAuthError with invalid_state means we couldn't even build the
      // URL (unknown provider IdP). Surface as 400.
      return badRequest("auth start failed");
    }
    logger.warn(
      "api/auth/start",
      AUTH_EVT.startUnreachable,
      err instanceof Error ? err.message : "unknown",
    );
    return new Response(null, {
      status: 302,
      headers: { location: UNREACHABLE_REDIRECT },
    });
  }
}
