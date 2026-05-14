/**
 * Serialises a JSON-LD object for inclusion in a `<script>` tag.
 *
 * The replacement of `</` with `<\/` is the standard mitigation for
 * inline-script injection: even though all current callers pass
 * codebase-defined data (no user input), this defends against any
 * future builder accidentally interpolating user-controlled strings.
 */
export function serialiseJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}
