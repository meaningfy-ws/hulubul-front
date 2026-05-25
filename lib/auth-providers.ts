/**
 * Provider identifiers used as keys throughout the auth code path.
 *
 * Per INV-5 (no free strings), every comparison, lookup, and log entry
 * referring to a provider MUST use one of these constants — never a
 * literal string like "google".
 */

export const PROVIDER_GOOGLE = "google" as const;
export const PROVIDER_FACEBOOK = "facebook" as const;
export const PROVIDER_TIKTOK = "tiktok" as const;

export type AuthProvider =
  | typeof PROVIDER_GOOGLE
  | typeof PROVIDER_FACEBOOK
  | typeof PROVIDER_TIKTOK;

export const AUTH_PROVIDERS: readonly AuthProvider[] = [
  PROVIDER_GOOGLE,
  PROVIDER_FACEBOOK,
  PROVIDER_TIKTOK,
] as const;

export function isAuthProvider(value: unknown): value is AuthProvider {
  return (
    typeof value === "string" &&
    (AUTH_PROVIDERS as readonly string[]).includes(value)
  );
}
