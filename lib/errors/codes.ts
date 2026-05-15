/**
 * Stable, machine-readable taxonomy for every failure the waitlist/survey
 * submit path can produce. Pure domain logic — no I/O, no framework.
 *
 * `codeForUpstreamStatus` maps a Strapi (or network) status to a code;
 * `httpStatusForCode` maps a code to the HTTP status *our* route returns.
 * Keeping both here means the route, the client console reporter, and the
 * user-facing copy all agree on one vocabulary instead of sniffing strings.
 */

export enum ErrorCode {
  /** Upstream unreachable or 5xx (incl. fetch throwing → status 0). */
  UpstreamDown = "UPSTREAM_DOWN",
  /** Strapi rejected the payload with 400 (schema/validation). */
  UpstreamValidation = "UPSTREAM_VALIDATION",
  /** Email already on the waitlist. */
  AlreadyRegistered = "ALREADY_REGISTERED",
  /** Too many attempts (429). */
  RateLimited = "RATE_LIMITED",
  /** 401/403 — server token misconfigured. Never surfaced verbatim. */
  AuthMisconfig = "AUTH_MISCONFIG",
  /** Upstream 404. */
  NotFound = "NOT_FOUND",
  /** Our own Zod validation failed before reaching Strapi. */
  ClientValidation = "CLIENT_VALIDATION",
  /** Anything we could not classify. */
  Unknown = "UNKNOWN",
}

/**
 * Maps an upstream HTTP status to a code. `0` means the fetch itself threw
 * (DNS/connection/timeout) — treated as the backend being down.
 */
export function codeForUpstreamStatus(status: number): ErrorCode {
  if (status === 0) return ErrorCode.UpstreamDown;
  if (status >= 500) return ErrorCode.UpstreamDown;
  switch (status) {
    case 400:
      return ErrorCode.UpstreamValidation;
    case 401:
    case 403:
      return ErrorCode.AuthMisconfig;
    case 404:
      return ErrorCode.NotFound;
    case 409:
      return ErrorCode.AlreadyRegistered;
    case 429:
      return ErrorCode.RateLimited;
    default:
      return ErrorCode.Unknown;
  }
}

/** The HTTP status our own route handler should return for a given code. */
export function httpStatusForCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.UpstreamDown:
      return 503;
    case ErrorCode.UpstreamValidation:
      return 422;
    case ErrorCode.AlreadyRegistered:
      return 409;
    case ErrorCode.RateLimited:
      return 429;
    case ErrorCode.AuthMisconfig:
      return 500;
    case ErrorCode.NotFound:
      return 404;
    case ErrorCode.ClientValidation:
      return 400;
    case ErrorCode.Unknown:
      return 502;
  }
}
