/**
 * Pure presenter for the provider buttons that start the OIDC round-trip.
 * Plain `<a>` tags — no client JS.
 *
 * The `providers` list is computed by the orchestrator <Signup>, which calls
 * `getEnabledAuthProviders()` (lib/auth-env). Keeping env access out of this
 * component preserves the layering — UI depends on a typed prop, not on
 * process.env — and makes the component statically renderable and trivially
 * testable.
 *
 * Per INV-8 the kill-switch yields an empty `providers` list. The parent also
 * passes `hidden` to suppress the buttons when a prefill cookie is already in
 * play: re-offering the provider button after a fresh round-trip would be
 * confusing UX since the form is already populated.
 */

import {
  PROVIDER_FACEBOOK,
  PROVIDER_GOOGLE,
  PROVIDER_INSTAGRAM,
  PROVIDER_TIKTOK,
  type AuthProvider,
} from "@/lib/auth-providers";
import { buttonContinueWith } from "@/lib/auth-copy";

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
  if (provider === PROVIDER_INSTAGRAM) {
    // Instagram camera-glyph silhouette. Single-path so it picks up the
    // button text colour like TikTok; brand colour applied via CSS accent.
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
          d="M12 2.16c3.2 0 3.58.012 4.85.07 1.17.054 1.8.25 2.23.415.56.217.96.477 1.38.897.42.42.68.82.9 1.38.165.43.36 1.06.414 2.23.058 1.27.07 1.65.07 4.85s-.012 3.58-.07 4.85c-.054 1.17-.25 1.8-.414 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.897-.43.165-1.06.36-2.23.415-1.27.058-1.65.07-4.85.07s-3.58-.012-4.85-.07c-1.17-.054-1.8-.25-2.23-.415a3.71 3.71 0 01-1.38-.897 3.71 3.71 0 01-.9-1.38c-.165-.43-.36-1.06-.414-2.23C2.172 15.58 2.16 15.2 2.16 12s.012-3.58.07-4.85c.054-1.17.25-1.8.414-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.897.43-.165 1.06-.36 2.23-.415C8.42 2.172 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.014 7.05.072 5.78.13 4.9.336 4.14.63a5.87 5.87 0 00-2.12 1.38A5.87 5.87 0 00.63 4.14C.336 4.9.13 5.78.072 7.05.014 8.33 0 8.74 0 12s.014 3.67.072 4.95c.058 1.27.264 2.15.558 2.91.302.78.706 1.44 1.38 2.12.68.673 1.34 1.077 2.12 1.38.76.294 1.64.5 2.91.558C8.33 23.986 8.74 24 12 24s3.67-.014 4.95-.072c1.27-.058 2.15-.264 2.91-.558a5.87 5.87 0 002.12-1.38 5.87 5.87 0 001.38-2.12c.294-.76.5-1.64.558-2.91.058-1.28.072-1.69.072-4.95s-.014-3.67-.072-4.95c-.058-1.27-.264-2.15-.558-2.91a5.87 5.87 0 00-1.38-2.12A5.87 5.87 0 0019.86.63C19.1.336 18.22.13 16.95.072 15.67.014 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.4-11.85a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"
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
  /** Providers to render, in the order given. */
  providers: readonly AuthProvider[];
  /** When true (e.g. a fresh prefill cookie is active), render nothing. */
  hidden?: boolean;
}

export function AuthButtons({ providers, hidden = false }: AuthButtonsProps) {
  if (hidden || providers.length === 0) return null;

  return (
    <div className="auth-buttons" aria-label="Conectare rapidă">
      {providers.map((provider) => (
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
