/**
 * Romanian user-facing copy for the auth flow.
 *
 * Single source of truth — no inline literals anywhere else in `components/`,
 * `app/api/auth/`, or `lib/{prefill-cookie,zitadel}.ts`. INV-5.
 *
 * The backend spec `design/epic-signup/backend-spec-auth-copy-fields.md`
 * describes the eventual migration of this content to a Strapi component.
 */

import type { AuthProvider } from "./auth-providers";

export const AUTH_COPY = {
  buttonContinueWith: {
    google: "Continuă cu Google",
    facebook: "Continuă cu Facebook",
    instagram: "Continuă cu Instagram",
    tiktok: "Continuă cu TikTok",
  },
  verifiedTag: {
    google: "verificat prin Google",
    facebook: "verificat prin Facebook",
    instagram: "verificat prin Instagram",
    tiktok: "verificat prin TikTok",
  },
  notice: {
    cancelled:
      "Conectarea cu {provider} nu a fost finalizată. Poți completa formularul manual.",
    unreachable:
      "Conectarea este temporar indisponibilă. Încearcă din nou sau completează formularul manual.",
    generic:
      "Nu am putut finaliza conectarea. Încearcă din nou sau completează formularul manual.",
  },
} as const;

export type NoticeKey = keyof typeof AUTH_COPY.notice;

const PROVIDER_DISPLAY_NAME: Record<AuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export function buttonContinueWith(provider: AuthProvider): string {
  return AUTH_COPY.buttonContinueWith[provider];
}

export function verifiedTag(provider: AuthProvider): string {
  return AUTH_COPY.verifiedTag[provider];
}

export function providerDisplayName(provider: AuthProvider): string {
  return PROVIDER_DISPLAY_NAME[provider];
}

export function notice(
  key: NoticeKey,
  vars?: { provider?: string },
): string {
  const template = AUTH_COPY.notice[key];
  if (!vars?.provider) return template.replace("{provider}", "").trim();
  return template.replace("{provider}", vars.provider);
}
