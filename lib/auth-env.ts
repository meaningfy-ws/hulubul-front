/**
 * Typed reader for the Stage-1 auth environment variables.
 *
 * Per INV-6, only NEXT_PUBLIC_AUTH_ENABLED crosses the server/client boundary;
 * everything else is read server-side only.
 *
 * Per INV-8 (kill-switch), `readAuthEnv` throws `AuthDisabledError` when the
 * feature is disabled — callers (route handlers, server components) translate
 * that to a 404 or a no-op render.
 */

import {
  AUTH_PROVIDERS,
  PROVIDER_FACEBOOK,
  PROVIDER_GOOGLE,
  PROVIDER_TIKTOK,
  type AuthProvider,
} from "./auth-providers";

// Single owner of the env-key → provider mapping. Used by both readAuthEnv
// (server-side IdP construction) and getEnabledAuthProviders (UI decision).
const PROVIDER_ENV_KEY: Record<AuthProvider, string> = {
  [PROVIDER_GOOGLE]: "ZITADEL_IDP_GOOGLE",
  [PROVIDER_FACEBOOK]: "ZITADEL_IDP_FACEBOOK",
  [PROVIDER_TIKTOK]: "ZITADEL_IDP_TIKTOK",
};

export class AuthDisabledError extends Error {
  constructor() {
    super("Auth feature is disabled (NEXT_PUBLIC_AUTH_ENABLED != 'true').");
    this.name = "AuthDisabledError";
  }
}

export class MissingAuthEnvError extends Error {
  readonly missing: readonly string[];
  constructor(missing: readonly string[]) {
    super(`Missing or invalid auth env variables: ${missing.join(", ")}`);
    this.name = "MissingAuthEnvError";
    this.missing = missing;
  }
}

export interface AuthEnv {
  enabled: true;
  issuer: string;
  clientId: string;
  clientSecret: string;
  idps: Partial<Record<AuthProvider, string>>;
  redirectUri: string;
  cookieSecret: string;
}

const MIN_COOKIE_SECRET_BYTES = 32;

export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

/**
 * Returns the providers whose IdP env is currently configured. Reads
 * process.env at call time — meant to be invoked from server components
 * that already render per-request (e.g. <Signup>) so the result reflects
 * the running container's env, not the build-time env.
 */
export function getEnabledAuthProviders(): readonly AuthProvider[] {
  if (!isAuthEnabled()) return [];
  return AUTH_PROVIDERS.filter((p) => {
    const v = process.env[PROVIDER_ENV_KEY[p]];
    return typeof v === "string" && v.length > 0;
  });
}

export function readAuthEnv(): AuthEnv {
  if (!isAuthEnabled()) throw new AuthDisabledError();

  const issuer = process.env.ZITADEL_ISSUER;
  const clientId = process.env.ZITADEL_CLIENT_ID;
  const clientSecret = process.env.ZITADEL_CLIENT_SECRET;
  const redirectUri = process.env.AUTH_REDIRECT_URI;
  const cookieSecret = process.env.AUTH_COOKIE_SECRET;
  const idpGoogle = process.env[PROVIDER_ENV_KEY[PROVIDER_GOOGLE]];
  const idpFacebook = process.env[PROVIDER_ENV_KEY[PROVIDER_FACEBOOK]];

  const missing: string[] = [];
  if (!issuer) missing.push("ZITADEL_ISSUER");
  if (!clientId) missing.push("ZITADEL_CLIENT_ID");
  if (!clientSecret) missing.push("ZITADEL_CLIENT_SECRET");
  if (!redirectUri) missing.push("AUTH_REDIRECT_URI");
  if (!cookieSecret || cookieSecret.length < MIN_COOKIE_SECRET_BYTES) {
    missing.push("AUTH_COOKIE_SECRET");
  }
  if (!idpGoogle) missing.push("ZITADEL_IDP_GOOGLE");

  if (missing.length > 0) throw new MissingAuthEnvError(missing);

  const idps: Partial<Record<AuthProvider, string>> = {
    [PROVIDER_GOOGLE]: idpGoogle!,
  };
  if (idpFacebook) idps[PROVIDER_FACEBOOK] = idpFacebook;

  return {
    enabled: true,
    issuer: issuer!.replace(/\/$/, ""),
    clientId: clientId!,
    clientSecret: clientSecret!,
    idps,
    redirectUri: redirectUri!,
    cookieSecret: cookieSecret!,
  };
}
