"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackEvent } from "@/lib/tracking/events";

/**
 * Reports Core Web Vitals (LCP, INP, CLS, TTFB, FCP) to GA4 as a
 * `cwv` event. The trackEvent call is automatically gated by the
 * consent layer downstream — when analytics consent is denied, the
 * GA4 snippet isn't loaded and the buffered events are simply not
 * dispatched.
 *
 * Sentry (when added per the monitoring spec) reads the same metric
 * stream independently — it doesn't compete with GA4 for the
 * dispatch.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    trackEvent("cwv", {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
    });
  });
  return null;
}
