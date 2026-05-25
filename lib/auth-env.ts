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
  PROVIDER_FACEBOOK,
  PROVIDER_GOOGLE,
  type AuthProvider,
} from "./auth-providers";

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

export function readAuthEnv(): AuthEnv {
  if (!isAuthEnabled()) throw new AuthDisabledError();

  const issuer = process.env.ZITADEL_ISSUER;
  const clientId = process.env.ZITADEL_CLIENT_ID;
  const clientSecret = process.env.ZITADEL_CLIENT_SECRET;
  const redirectUri = process.env.AUTH_REDIRECT_URI;
  const cookieSecret = process.env.AUTH_COOKIE_SECRET;
  const idpGoogle = process.env.ZITADEL_IDP_GOOGLE;
  const idpFacebook = process.env.ZITADEL_IDP_FACEBOOK;

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
