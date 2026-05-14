import { isStrapiUpstreamError, isStrapiAuthError } from "./strapi-client";

/**
 * Translates an arbitrary error from a form submission into a Romanian,
 * user-readable message. Used by SignupForm and SurveyForm so users see
 * "Conexiunea nu funcționează…" instead of "Failed to fetch" or
 * "Strapi /api/survey-senders failed: 404".
 *
 * Resolution order:
 * 1. Typed Strapi errors (StrapiUpstreamError, StrapiAuthError) → friendly
 *    upstream copy. Uses the `name`-based discriminator so it works across
 *    server/client realm boundaries, where `instanceof` can fail.
 * 2. `TypeError` (the shape `fetch()` raises on network failure) → network copy.
 * 3. Errors whose message matches network-failure patterns → network copy.
 * 4. Errors whose message matches the legacy "Strapi … failed: NNN" pattern
 *    → upstream copy. Defensive fallback for callers that haven't migrated to
 *    typed errors yet.
 * 5. Any other Error.message → passed through verbatim (covers Zod messages
 *    and similar caller-side validation).
 * 6. Anything else → `defaultMessage`.
 */
export function humanizeFormError(
  error: unknown,
  defaultMessage: string,
): string {
  const network =
    "Conexiunea la server nu funcționează. Verifică internetul și încearcă din nou.";
  const upstream =
    "Serverul nu poate prelucra cererea acum. Încearcă din nou peste câteva minute. Dacă persistă, scrie-ne la contact@hulubul.com.";

  if (isStrapiUpstreamError(error) || isStrapiAuthError(error)) return upstream;
  if (error instanceof TypeError) return network;

  if (error instanceof Error) {
    const m = error.message;
    if (/failed to fetch|networkerror|network request failed/i.test(m)) {
      return network;
    }
    if (/strapi .*failed:\s*\d+/i.test(m)) return upstream;
    if (m.length > 0) return m;
  }
  return defaultMessage;
}
