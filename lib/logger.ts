/**
 * Single point of logging for non-test code. Today this is a thin wrapper
 * over `console.*`; introducing it now means a future swap to Sentry,
 * Datadog, or a structured server logger is a one-file change instead of
 * grepping for `console.error` across the codebase.
 *
 * Conventions:
 * - `scope` is a short tag identifying the call site, e.g. "page/termeni",
 *   "layout", "form/waitlist". Keep it stable so logs are greppable.
 * - `error` is optional; pass it when you have an `unknown` from a catch.
 */

export interface Logger {
  error(scope: string, message: string, error?: unknown): void;
  warn(scope: string, message: string, error?: unknown): void;
  info(scope: string, message: string): void;
}

function format(scope: string, message: string): string {
  return `[${scope}] ${message}`;
}

export const logger: Logger = {
  error(scope, message, error) {
    if (error !== undefined) {
      console.error(format(scope, message), error);
    } else {
      console.error(format(scope, message));
    }
  },
  warn(scope, message, error) {
    if (error !== undefined) {
      console.warn(format(scope, message), error);
    } else {
      console.warn(format(scope, message));
    }
  },
  info(scope, message) {
    console.info(format(scope, message));
  },
};
