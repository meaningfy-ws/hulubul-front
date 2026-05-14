import { randomUUID } from "node:crypto";
import { dispatchGa4Mp } from "./ga4mp";
import type { ConsentDecision } from "@/lib/consent/types";

/**
 * Fans a conversion event out to every configured server-side
 * destination, gated by the user's consent for the relevant category.
 *
 * v1: GA4 Measurement Protocol only (gated by analytics consent).
 * Future: Meta CAPI + TikTok Events (gated by marketing consent).
 *
 * `Promise.allSettled` so one upstream's failure doesn't block the
 * others, and the route handler's caller never sees a rejection.
 */

export interface ConsentSnapshot {
  analytics: ConsentDecision;
  marketing: ConsentDecision;
}

export interface ConversionEvent {
  /** Snake-case event name (e.g. "waitlist_submit"). */
  eventName: string;
  /** UUID shared with the browser-side gtag event for dedupe. */
  eventId: string;
  /** GA4 client identifier (per-user where possible). */
  clientId: string;
  /** Event parameters / custom dimensions. */
  params: Record<string, unknown>;
}

/**
 * Generate a per-event UUID — used both as the dedupe `event_id`
 * (returned to the browser so its gtag call can echo it) and, when no
 * better identifier is available, as the GA4 `client_id`.
 */
export function generateEventId(): string {
  return randomUUID();
}

export async function dispatchConversion(
  event: ConversionEvent,
  consent: ConsentSnapshot,
): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];

  if (consent.analytics === "granted") {
    tasks.push(dispatchGa4Mp(event));
  }

  // Marketing-gated dispatchers (Meta CAPI, TikTok Events) land here
  // when those modules are added — same shape, same gating rule.

  await Promise.allSettled(tasks);
}
