import { gtag } from "@/lib/consent/gtag-bridge";
import type { SurveyRole, WaitlistRole } from "@/lib/roles";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Push a custom event into the dataLayer via the canonical `gtag()`
 * (`gtag("event", name, params)`). When GA4 is loaded the snippet
 * dispatches it; when GA4 isn't loaded (consent denied or env unset)
 * the entry just buffers harmlessly until gtag.js replays it.
 *
 * Uses the shared `gtag()` helper so the entry is an `arguments`
 * object — a plain array would be silently ignored by gtag.js.
 *
 * Migration to GTM (tracking spec §3.1.1) doesn't change this code —
 * GTM picks events up from the same dataLayer.
 */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  gtag("event", name, params);
}

/**
 * Conversion event for a successful waitlist submission.
 *
 * `eventId` is the dedupe key shared with the server-side dispatch
 * (Phase 14) so GA4 / Meta / TikTok can collapse the browser-side
 * and server-side events into one conversion.
 */
export function trackWaitlistSubmit(
  role: WaitlistRole,
  source: string,
  eventId: string,
): void {
  trackEvent("waitlist_submit", { role, source, event_id: eventId });
}

/**
 * Conversion event for a successful survey submission. Same dedupe
 * pattern as `trackWaitlistSubmit`.
 */
export function trackSurveySubmit(
  role: SurveyRole,
  source: string,
  eventId: string,
): void {
  trackEvent("survey_submit", { role, source, event_id: eventId });
}
