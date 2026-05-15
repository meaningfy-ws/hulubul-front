"use client";

import { useEffect, useRef } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { useConsent } from "@/components/consent/ConsentProvider";
import {
  pushConsentDefault,
  pushConsentUpdate,
} from "@/lib/consent/gtag-bridge";
import { resolveGaId } from "@/lib/tracking/config";

/**
 * Mounts the GA4 snippet via @next/third-parties.
 *
 * **Consent Mode v2 — Advanced mode** (per Google's docs at
 * https://developers.google.com/tag-platform/security/guides/consent?consentmode=advanced):
 *
 *   - The gtag.js loader is mounted on every visit. This is the key
 *     difference from "Basic" mode — the script always loads, so Tag
 *     Assistant and other auditors can verify the install.
 *
 *   - **No cookies are set and no full hits are sent** until the user
 *     grants `analytics_storage`. While denied, GA4 sends "cookieless
 *     pings" that let Google do behavioral modeling for the
 *     unconsented traffic.
 *
 *   - The Consent Mode v2 default ("everything denied") is pushed via
 *     a separate inline `<Script strategy="beforeInteractive">` in
 *     app/layout.tsx — guaranteed to run BEFORE gtag.js parses, so
 *     no race window where unconsented hits could fire.
 *
 *   - When consent changes (banner save / withdraw), an `update` push
 *     is fired here. GA4 reconciles buffered hits accordingly.
 *
 * Production GA4 ID is hardcoded in `lib/tracking/config.ts` — env
 * var `NEXT_PUBLIC_GA_ID` is an override for staging/preview to
 * point at a separate property, or empty string to disable in dev.
 */
export function Analytics() {
  const { state } = useConsent();
  const gaId = resolveGaId(process.env.NEXT_PUBLIC_GA_ID);
  const lastPushedRef = useRef<string | null>(null);

  useEffect(() => {
    // Defensive client-side default — the inline script in layout.tsx
    // already pushed it before gtag.js loaded, but pushing again is
    // idempotent and survives any race in HMR / soft navigation.
    pushConsentDefault();
  }, []);

  useEffect(() => {
    // Skip the very first render — `default` already covers it.
    // Only push `update` when consent actually transitions.
    const fingerprint = `${state.analytics}|${state.marketing}`;
    if (lastPushedRef.current === fingerprint) return;
    if (lastPushedRef.current !== null) {
      pushConsentUpdate({
        analytics: state.analytics,
        marketing: state.marketing,
      });
    }
    lastPushedRef.current = fingerprint;
  }, [state.analytics, state.marketing]);

  if (!gaId) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
