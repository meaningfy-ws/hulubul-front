/**
 * Structured-log event names for the auth code path (INV-5).
 *
 * Per INV-4, log entries carry only non-identifying metadata
 * (provider, request_id, latency_ms, error code).
 */

export const AUTH_EVT = {
  startRequested: "auth.start.requested",
  startDisabled: "auth.start.disabled",
  startUnreachable: "auth.start.unreachable",
  callbackSuccess: "auth.callback.success",
  callbackSuccessUnverified: "auth.callback.success.unverified",
  callbackFailed: "auth.callback.failed",
  prefillConsumed: "auth.prefill.consumed",
  prefillInvalid: "auth.prefill.invalid",
} as const;

export type AuthEvent = (typeof AUTH_EVT)[keyof typeof AUTH_EVT];

/**
 * Stable status codes appearing as `?auth_status=<code>` on the redirect URL.
 * The user-facing notification bubble (Stage 4) maps each to copy.
 */
export const AUTH_STATUS = {
  cancelled: "cancelled",
  unreachable: "unreachable",
  invalidState: "invalid_state",
  tokenExchangeFailed: "token_exchange_failed",
  tokenInvalid: "token_invalid",
} as const;

export type AuthStatus = (typeof AUTH_STATUS)[keyof typeof AUTH_STATUS];
