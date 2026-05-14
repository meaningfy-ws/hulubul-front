/**
 * Translates an arbitrary error from a form submission into a Romanian,
 * user-readable message. Used by SignupForm and SurveyForm so users see
 * "Conexiunea nu funcționează…" instead of "Failed to fetch" or
 * "Strapi /api/survey-responses failed: 404".
 *
 * `defaultMessage` is what we show when the error has no recognisable
 * shape and no useful `.message` — typically the form's own fallback copy.
 */
export function humanizeFormError(
  error: unknown,
  defaultMessage: string,
): string {
  const network =
    "Conexiunea la server nu funcționează. Verifică internetul și încearcă din nou.";
  const upstream =
    "Serverul nu poate prelucra cererea acum. Încearcă din nou peste câteva minute. Dacă persistă, scrie-ne la contact@hulubul.com.";

  // fetch() throws a TypeError on network failure / CORS / DNS / abort.
  if (error instanceof TypeError) return network;

  if (error instanceof Error) {
    const m = error.message;
    if (/failed to fetch|networkerror|network request failed/i.test(m)) {
      return network;
    }
    // Upstream Strapi failures bubble up through our /api/* routes with
    // shapes like "Strapi /api/foo failed: 404". Hide the technical detail
    // from end users.
    if (/strapi .*failed:\s*\d+/i.test(m)) return upstream;
    if (m.length > 0) return m;
  }
  return defaultMessage;
}
