/**
 * Cookie names used across the auth code path (INV-5: no free strings).
 *
 * Stage 1 introduces PREFILL_COOKIE and OIDC_FLOW_COOKIE. Stage 3 will add
 * SESSION_COOKIE. Test code and route handlers MUST reference these constants
 * rather than inlining the underlying string.
 */

export const PREFILL_COOKIE = "hulubul.auth.prefill" as const;
export const OIDC_FLOW_COOKIE = "hulubul.auth.flow" as const;
// Reserved for Stage 3; exported here so the dependency-cruiser rules and
// no-free-strings test see one source of truth for cookie names.
export const SESSION_COOKIE = "hulubul.auth.session" as const;

export type AuthCookieName =
  | typeof PREFILL_COOKIE
  | typeof OIDC_FLOW_COOKIE
  | typeof SESSION_COOKIE;
