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
/** One field-level validation problem reported by Strapi. */
export interface StrapiErrorDetail {
  /** Dotted field path, e.g. "email". */
  path?: string;
  message: string;
}

export interface StrapiErrorOptions {
  /** Strapi's own `error.message` (the human "why"), preserved for logs. */
  upstreamMessage?: string;
  /** Flattened `error.details.errors[]` from Strapi, if present. */
  details?: StrapiErrorDetail[];
}

/**
 * Base class for every error raised when talking to Strapi. Use the
 * `isStrapiError`, `isStrapiNotFound`, `isStrapiAuthError`,
 * `isStrapiUpstreamError` discriminators rather than `instanceof` — the
 * latter can fail across server/client realm boundaries.
 */
export class StrapiError extends Error {
  readonly path: string;
  readonly status: number;
  /** Strapi's own message body, kept so failures are diagnosable. */
  readonly upstreamMessage?: string;
  readonly details?: StrapiErrorDetail[];
  constructor(
    path: string,
    status: number,
    message: string,
    opts: StrapiErrorOptions = {},
  ) {
    super(message);
    this.name = "StrapiError";
    this.path = path;
    this.status = status;
    this.upstreamMessage = opts.upstreamMessage;
    this.details = opts.details;
  }
}

export class StrapiNotFoundError extends StrapiError {
  constructor(path: string, opts: StrapiErrorOptions = {}) {
    super(path, 404, `Strapi ${path} not found (404).`, opts);
    this.name = "StrapiNotFoundError";
  }
}

export class StrapiAuthError extends StrapiError {
  constructor(path: string, status: number, opts: StrapiErrorOptions = {}) {
    super(
      path,
      status,
      `Strapi refused the request to ${path} (${status}). Verify STRAPI_API_TOKEN permissions.`,
      opts,
    );
    this.name = "StrapiAuthError";
  }
}

export class StrapiUpstreamError extends StrapiError {
  constructor(path: string, status: number, opts: StrapiErrorOptions = {}) {
    super(path, status, `Strapi ${path} failed: ${status}`, opts);
    this.name = "StrapiUpstreamError";
  }
}

/** Strapi rejected the payload with HTTP 400 (schema/validation/unique). */
export class StrapiValidationError extends StrapiError {
  constructor(path: string, opts: StrapiErrorOptions = {}) {
    super(path, 400, `Strapi ${path} rejected the payload (400).`, opts);
    this.name = "StrapiValidationError";
  }
}

const STRAPI_ERROR_NAMES = new Set<string>([
  "StrapiError",
  "StrapiNotFoundError",
  "StrapiAuthError",
  "StrapiUpstreamError",
  "StrapiValidationError",
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

export function isStrapiValidationError(
  e: unknown,
): e is StrapiValidationError {
  return e instanceof Error && e.name === "StrapiValidationError";
}

/**
 * Reads a non-OK Strapi `Response`, extracts its error envelope
 * (`{ error: { message, details: { errors[] } } }`), and returns the
 * matching typed error with Strapi's own message + field details attached.
 *
 * Unlike `throwStrapiError` (sync, body-blind, kept for existing callers),
 * this preserves the "why" so a failure is one log line instead of an
 * investigation. Never throws while parsing — a non-JSON body (e.g. an
 * HTML 502 from a proxy) still yields a correctly-classified error.
 */
export async function parseStrapiError(
  path: string,
  res: Response,
): Promise<StrapiError> {
  let upstreamMessage: string | undefined;
  let details: StrapiErrorDetail[] | undefined;
  try {
    const body = (await res.json()) as {
      error?: {
        message?: string;
        details?: { errors?: Array<{ path?: unknown; message?: string }> };
      };
    };
    if (typeof body?.error?.message === "string") {
      upstreamMessage = body.error.message;
    }
    const errs = body?.error?.details?.errors;
    if (Array.isArray(errs) && errs.length > 0) {
      details = errs.map((e) => ({
        path: Array.isArray(e.path) ? e.path.join(".") : undefined,
        message: typeof e.message === "string" ? e.message : "",
      }));
    }
  } catch {
    // Non-JSON body — classify by status only.
  }

  const opts: StrapiErrorOptions = { upstreamMessage, details };
  if (res.status === 404) return new StrapiNotFoundError(path, opts);
  if (res.status === 401 || res.status === 403) {
    return new StrapiAuthError(path, res.status, opts);
  }
  if (res.status === 400) return new StrapiValidationError(path, opts);
  return new StrapiUpstreamError(path, res.status, opts);
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
