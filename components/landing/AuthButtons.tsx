/**
 * Server-rendered list of provider buttons that the visitor clicks to start
 * the OIDC round-trip. Plain `<a>` tags — no client JS.
 *
 * Per INV-8 the kill-switch hides the buttons. The parent `<Signup>` also
 * passes `hidden` to suppress the buttons when a prefill cookie is already in
 * play: re-offering the provider button after a fresh round-trip would be
 * confusing UX since the form is already populated.
 */

import { unstable_noStore as noStore } from "next/cache";
import {
  AUTH_PROVIDERS,
  PROVIDER_FACEBOOK,
  PROVIDER_GOOGLE,
  PROVIDER_TIKTOK,
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

function ProviderGlyph({ provider }: { provider: AuthProvider }) {
  if (provider === PROVIDER_GOOGLE) {
    // Google's official "G" mark — keep it inline to avoid an extra request
    // and CSP allow-listing for a remote asset.
    return (
      <svg
        className="auth-button__glyph"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.46-1.13 2.7-2.4 3.53v2.93h3.87c2.27-2.09 3.58-5.17 3.58-8.7z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.87-2.93c-1.08.72-2.45 1.16-4.06 1.16-3.12 0-5.77-2.1-6.71-4.93H1.29v3.09C3.26 21.3 7.31 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.29 14.37A7.21 7.21 0 014.9 12c0-.82.14-1.62.39-2.37V6.54H1.29A11.93 11.93 0 000 12c0 1.94.46 3.77 1.29 5.46l4-3.09z"
        />
        <path
          fill="#EA4335"
          d="M12 4.74c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.54l4 3.09C6.23 6.84 8.88 4.74 12 4.74z"
        />
      </svg>
    );
  }
  if (provider === PROVIDER_FACEBOOK) {
    return (
      <svg
        className="auth-button__glyph"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#1877F2"
          d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.69.23 2.69.23v2.96h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"
        />
      </svg>
    );
  }
  if (provider === PROVIDER_TIKTOK) {
    return (
      <svg
        className="auth-button__glyph"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V8.66a8.16 8.16 0 005.05 1.74V6.94a4.85 4.85 0 01-2.12-.25z"
        />
      </svg>
    );
  }
  return null;
}

export interface AuthButtonsProps {
  /** When true (e.g. a fresh prefill cookie is active), render nothing. */
  hidden?: boolean;
}

export function AuthButtons({ hidden = false }: AuthButtonsProps = {}) {
  // `isProviderConfigured` reads ZITADEL_IDP_* via a computed key, which
  // Next can't statically inline. Opt this subtree out of the static cache
  // so the values are read from the container's runtime env at request
  // time — applies to every provider in AUTH_PROVIDERS automatically.
  noStore();
  if (hidden) return null;
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
          <ProviderGlyph provider={provider} />
          <span className="auth-button__label">
            {buttonContinueWith(provider)}
          </span>
        </a>
      ))}
    </div>
  );
}
