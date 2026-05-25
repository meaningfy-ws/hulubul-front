/**
 * Server-only helper that reads + verifies the Stage-1 prefill cookie.
 *
 * Lives in `lib/` rather than next to its callers because both `Signup` and
 * `Nav` consume it; duplicating the cookie-read in each component would make
 * INV-9 enforcement noisier. Per INV-3 this module is allowed to talk to
 * cookies — it's `lib/zitadel.ts` that must stay cookie-free.
 */

import { cookies } from "next/headers";
import { PREFILL_COOKIE } from "./cookies";
import {
  verifyPrefillCookie,
  type PrefillPayload,
} from "./prefill-cookie";
import { logger } from "./logger";
import { AUTH_EVT } from "./auth-events";

export async function readServerPrefill(): Promise<PrefillPayload | null> {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) return null;
  const jar = await cookies();
  const raw = jar.get(PREFILL_COOKIE)?.value;
  if (!raw) return null;
  try {
    const payload = await verifyPrefillCookie(raw, secret);
    logger.info("server-prefill", AUTH_EVT.prefillConsumed);
    return payload;
  } catch {
    logger.warn("server-prefill", AUTH_EVT.prefillInvalid);
    return null;
  }
}

export function firstNameOf(fullName: string): string | null {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first.length > 0 ? first : null;
}
