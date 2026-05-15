/**
 * Deployed-commit signature, for lack of a real version scheme yet.
 *
 * `NEXT_PUBLIC_BUILD_SHA` is resolved at build time in `next.config.ts`
 * from what our self-hosted build exposes: `BUILD_SHA` (passed by the
 * ops deploy as a Docker build-arg) or `GITHUB_SHA` (CI fallback). It
 * must be `NEXT_PUBLIC_` so the value is inlined into the client bundle.
 *
 * The ops deploy (`infrastructure-stacks/deploy-hulubul.yml`) already
 * receives the commit as the `sha` input — passing it into the build as
 * `BUILD_SHA` (Docker build-arg → ENV) is all that's needed to light
 * this up. Until then `buildSignature()` returns null and the footer
 * simply omits the line (never renders "undefined").
 */

export function buildSha(): string | null {
  const raw = process.env.NEXT_PUBLIC_BUILD_SHA?.trim();
  if (!raw) return null;
  if (!/^[0-9a-f]{7,40}$/i.test(raw)) return null;
  return raw;
}

/** Short 7-char form for display, or null when the sha is unknown. */
export function buildSignature(): string | null {
  const sha = buildSha();
  return sha ? sha.slice(0, 7) : null;
}
