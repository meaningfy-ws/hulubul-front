"use client";

import { useEffect, useRef } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { useConsent } from "@/components/consent/ConsentProvider";
import {
  pushConsentDefault,
  pushConsentUpdate,
} from "@/lib/consent/gtag-bridge";

/**
 * Mounts the GA4 snippet via @next/third-parties — but only when:
 *   - `NEXT_PUBLIC_GA_ID` is set (production-ready), AND
 *   - the user has granted analytics consent.
 *
 * Local dev: leave `NEXT_PUBLIC_GA_ID` unset and nothing tracker-side
 * loads, regardless of banner state.
 *
 * Consent Mode v2 plumbing:
 *   - The default state ("everything denied") is pushed once on mount,
 *     before the GA4 snippet is requested. This satisfies Google's
 *     requirement that a `default` exist before any `update`.
 *   - When consent changes (banner save / withdraw), an `update` is
 *     pushed. GA4 reconciles buffered hits accordingly.
 *
 * The Meta Pixel and LinkedIn Insight helpers were dropped from this
 * file. They'll come back via GTM (see tracking spec §3.1.1).
 */
export function Analytics() {
  const { state } = useConsent();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const allowGa = state.analytics === "granted" && Boolean(gaId);
  const defaultPushedRef = useRef(false);

  useEffect(() => {
    if (!defaultPushedRef.current) {
      pushConsentDefault();
      defaultPushedRef.current = true;
    }
  }, []);

  useEffect(() => {
    pushConsentUpdate({
      analytics: state.analytics,
      marketing: state.marketing,
    });
  }, [state.analytics, state.marketing]);

  if (!allowGa) return null;
  return <GoogleAnalytics gaId={gaId!} />;
}
