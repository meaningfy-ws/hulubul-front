/**
 * Single source of truth for Strapi base URL, auth headers, and the typed
 * error hierarchy used by every fetcher in `lib/`.
 *
 * Why this exists: previously `strapiUrl()` and `authHeaders()` were
 * duplicated in three files (`lib/strapi.ts`, `lib/survey.ts`,
 * `lib/routes-api.ts`). A config bug — e.g. trailing-slash handling — had
 * to be fixed in three places. This module is the only place that reads
 * `process.env.NEXT_PUBLIC_STRAPI_URL` or `process.env.STRAPI_API_TOKEN`.
 */

export type StrapiCacheMode = "static" | "fresh" | "no-store";

export function strapiUrl(): string {
  const url = process.env.NEXT_PUBLIC_STRAPI_URL;
  if (!url) throw new Error("NEXT_PUBLIC_STRAPI_URL is not set");
  return url.replace(/\/+$/, "");
}

export function authHeaders(): Record<string, string> {
  const token = process.env.STRAPI_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Error hierarchy (M4) ---------------------------------------------------

/**
 * Base class for every error raised when talking to Strapi. Use the
 * `isStrapiError`, `isStrapiNotFound`, `isStrapiAuthError`,
 * `isStrapiUpstreamError` discriminators rather than `instanceof` — the
 * latter can fail across server/client realm boundaries.
 */
export class StrapiError extends Error {
  readonly path: string;
  readonly status: number;
  constructor(path: string, status: number, message: string) {
    super(message);
    this.name = "StrapiError";
    this.path = path;
    this.status = status;
  }
}

export class StrapiNotFoundError extends StrapiError {
  constructor(path: string) {
    super(path, 404, `Strapi ${path} not found (404).`);
    this.name = "StrapiNotFoundError";
  }
}

export class StrapiAuthError extends StrapiError {
  constructor(path: string, status: number) {
    super(
      path,
      status,
      `Strapi refused the request to ${path} (${status}). Verify STRAPI_API_TOKEN permissions.`,
    );
    this.name = "StrapiAuthError";
  }
}

export class StrapiUpstreamError extends StrapiError {
  constructor(path: string, status: number) {
    super(path, status, `Strapi ${path} failed: ${status}`);
    this.name = "StrapiUpstreamError";
  }
}

const STRAPI_ERROR_NAMES = new Set<string>([
  "StrapiError",
  "StrapiNotFoundError",
  "StrapiAuthError",
  "StrapiUpstreamError",
]);

export function isStrapiError(e: unknown): e is StrapiError {
  return e instanceof Error && STRAPI_ERROR_NAMES.has(e.name);
}

export function isStrapiNotFound(e: unknown): e is StrapiNotFoundError {
  return e instanceof Error && e.name === "StrapiNotFoundError";
}

export function isStrapiAuthError(e: unknown): e is StrapiAuthError {
  return e instanceof Error && e.name === "StrapiAuthError";
}

export function isStrapiUpstreamError(e: unknown): e is StrapiUpstreamError {
  return e instanceof Error && e.name === "StrapiUpstreamError";
}

// --- Fetch helper -----------------------------------------------------------

// Omit `mode` (RequestMode) and `cache` from RequestInit because we resolve
// caching ourselves via `cacheMode`; omit `headers` because we type it as a
// plain Record for ergonomic merging with the auth header.
interface StrapiFetchOptions
  extends Omit<RequestInit, "headers" | "mode" | "cache"> {
  /** Extra headers to merge with the auth header. */
  headers?: Record<string, string>;
  /**
   * How aggressively this response should be cached by Next.js:
   * - `static`: 5 min revalidate (landing/editorial pages).
   * - `fresh`: bypass cache, always fetch fresh (admin lists).
   * - `no-store`: never cache (mutations).
   * Defaults to `no-store` so writes are safe by default.
   */
  mode?: StrapiCacheMode;
}

function nextOptions(mode: StrapiCacheMode): RequestInit {
  switch (mode) {
    case "static":
      return { next: { revalidate: 300 } };
    case "fresh":
      return { next: { revalidate: 0 } };
    case "no-store":
      return { cache: "no-store" };
  }
}

/**
 * Performs a fetch against Strapi with the auth header attached and the
 * cache mode resolved. Returns the raw `Response` so callers control how
 * they parse the body. Does **not** throw on non-OK status — that's the
 * caller's job (usually via the typed error classes above).
 */
export async function strapiFetch(
  path: string,
  options: StrapiFetchOptions = {},
): Promise<Response> {
  const { mode = "no-store", headers, ...rest } = options;
  const url = `${strapiUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...rest,
    ...nextOptions(mode),
    headers: { ...authHeaders(), ...headers },
  });
}

/**
 * Maps a non-OK Strapi response to the appropriate typed error and throws.
 * Callers that want non-throwing behaviour for 404 (e.g. editorial pages)
 * should branch on status before invoking this.
 */
export function throwStrapiError(path: string, res: Response): never {
  if (res.status === 404) throw new StrapiNotFoundError(path);
  if (res.status === 401 || res.status === 403) {
    throw new StrapiAuthError(path, res.status);
  }
  throw new StrapiUpstreamError(path, res.status);
}
