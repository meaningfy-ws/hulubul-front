import { createHash } from "node:crypto";

/**
 * SHA-256 hex digest, lowercase. Matches the format every major
 * conversion API (Meta CAPI, TikTok Events, GA4 MP user_data) requires
 * for hashed PII fields (email, phone).
 *
 * Inputs are normalised first (trim + lowercase) per the Meta CAPI
 * spec so a value entered as "Foo@Bar.COM" hashes to the same bucket
 * as "foo@bar.com" — required for browser-side / server-side dedupe.
 *
 * Returns `null` for empty/whitespace input so callers can omit the
 * field entirely from the payload (sending an empty hash is treated
 * as a real value by some platforms).
 */
export function sha256Hex(value: string): Promise<string | null> {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return Promise.resolve(null);
  const hash = createHash("sha256").update(trimmed).digest("hex");
  return Promise.resolve(hash);
}
