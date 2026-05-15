/**
 * Client-side error reporting. Console-only by design (no third-party
 * SDK): the server already logs the same `requestId`, so a structured
 * browser group is enough to correlate a user report with a server line.
 */

import { ErrorCode } from "./codes";
import { maskEmail } from "./mask";

export interface StructuredError {
  code: ErrorCode;
  message: string;
  upstreamStatus?: number;
  requestId?: string;
  details?: unknown;
}

const ERROR_CODES = new Set<string>(Object.values(ErrorCode));

/**
 * Parses the `{ ok:false, error:{…} }` envelope returned by our route
 * handlers. Returns null for success bodies or any other shape (e.g. the
 * legacy `{ error: "string" }`) so callers can fall back gracefully.
 */
export function parseErrorResponse(body: unknown): StructuredError | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { ok?: unknown; error?: unknown };
  if (b.ok !== false || !b.error || typeof b.error !== "object") return null;
  const e = b.error as Record<string, unknown>;
  if (typeof e.code !== "string" || !ERROR_CODES.has(e.code)) return null;
  return {
    code: e.code as ErrorCode,
    message: typeof e.message === "string" ? e.message : "",
    upstreamStatus:
      typeof e.upstreamStatus === "number" ? e.upstreamStatus : undefined,
    requestId: typeof e.requestId === "string" ? e.requestId : undefined,
    details: e.details,
  };
}

/**
 * Logs a structured, PII-masked group to the browser console. Safe to
 * call from anywhere — never throws, even on a console without `group()`.
 */
export function reportClientError(
  scope: string,
  err: StructuredError,
  ctx: { email?: string; endpoint?: string } = {},
): void {
  const summary = {
    code: err.code,
    upstreamStatus: err.upstreamStatus,
    requestId: err.requestId,
    endpoint: ctx.endpoint,
    email: ctx.email ? maskEmail(ctx.email) : undefined,
    timestamp: new Date().toISOString(),
    details: err.details,
  };
  // Surface validation specifics in the header so the reason is visible
  // without expanding the logged object.
  const issues = (
    err.details as { issues?: { message?: string }[] } | undefined
  )?.issues;
  const detailHint =
    Array.isArray(issues) && issues.length > 0
      ? ` — ${issues
          .map((i) => i?.message)
          .filter(Boolean)
          .join("; ")}`
      : "";
  try {
    const hasGroup = typeof console.group === "function";
    if (hasGroup)
      console.group(`[${scope}] ${err.code} — ${err.message}${detailHint}`);
    console.error(`[${scope}] submit failed`, summary);
    if (hasGroup && typeof console.groupEnd === "function") {
      console.groupEnd();
    }
  } catch {
    // Reporting must never break the UI.
  }
}
