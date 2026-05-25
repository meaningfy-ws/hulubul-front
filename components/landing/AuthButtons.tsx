/**
 * Static, server-rendered list of provider buttons that the visitor clicks
 * to start the OIDC round-trip. No client JS — these are plain `<a>` tags
 * pointing at the server's `/api/auth/start` route.
 *
 * Per INV-8 the kill-switch hides the buttons entirely. Per Stage-2 spec,
 * adding a provider is a matter of:
 *   1. registering the IdP in Zitadel,
 *   2. exposing its numeric IdP id as a server-only env var, and
 *   3. adding the constant + copy entry — no code change here.
 */

import {
  AUTH_PROVIDERS,
  type AuthProvider,
} from "@/lib/auth-providers";
import { buttonContinueWith } from "@/lib/auth-copy";

const PROVIDER_ENV_KEY: Record<AuthProvider, string> = {
  google: "ZITADEL_IDP_GOOGLE",
  facebook: "ZITADEL_IDP_FACEBOOK",
  tiktok: "ZITADEL_IDP_TIKTOK",
};

function isProviderConfigured(provider: AuthProvider): boolean {
  const key = PROVIDER_ENV_KEY[provider];
  const value = process.env[key];
  return typeof value === "string" && value.length > 0;
}

export function AuthButtons() {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true") return null;
  const enabled = AUTH_PROVIDERS.filter(isProviderConfigured);
  if (enabled.length === 0) return null;

  return (
    <div className="auth-buttons" aria-label="Conectare rapidă">
      {enabled.map((provider) => (
        <a
          key={provider}
          className={`auth-button auth-button--${provider}`}
          href={`/api/auth/start?provider=${provider}`}
          rel="nofollow"
        >
          {buttonContinueWith(provider)}
        </a>
      ))}
    </div>
  );
}
