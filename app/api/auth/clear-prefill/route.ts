/**
 * POST /api/auth/clear-prefill
 *
 * Clears the Stage-1 PREFILL_COOKIE. Invoked by the SignupForm's "Nu ești tu?
 * Șterge." (forget me) button. The client follows the response with a
 * `location.reload()` so the async server components (`<Nav>`, `<Signup>`)
 * re-render without the cookie — nav reverts to the CMS CTA, the provider
 * button row reappears, the form goes empty.
 *
 * Not in scope for Stage 1: ending the upstream Zitadel/Google session. The
 * full logout flow ships in Stage 3 (see design/epic-signup/03-auth-middleware.md).
 */

import { isAuthEnabled } from "@/lib/auth-env";
import { PREFILL_COOKIE } from "@/lib/cookies";

function notFound(): Response {
  return new Response(null, { status: 404 });
}

function clearPrefillCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PREFILL_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

export async function POST(_request: Request): Promise<Response> {
  if (!isAuthEnabled()) return notFound();
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": clearPrefillCookieHeader() },
  });
}
