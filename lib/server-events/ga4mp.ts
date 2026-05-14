import { logger } from "@/lib/logger";

/**
 * Server-side dispatcher for the GA4 Measurement Protocol.
 *
 * Called from `app/api/{waitlist,survey}/route.ts` after the Strapi
 * row is created. The same `event_id` is also sent browser-side via
 * gtag, so GA4 collapses the two events into one.
 *
 * Failures are logged but never thrown — analytics must never block a
 * real submission.
 */

export interface Ga4MpEvent {
  /** Event name (e.g. "waitlist_submit"). Must be ≤ 40 chars, snake_case. */
  eventName: string;
  /** UUID shared with the browser-side gtag event for dedupe. */
  eventId: string;
  /**
   * GA4 client identifier. Browser gtag uses a cookie value; for
   * server-side events from a route handler we generate a stable per-user
   * id where possible, otherwise a per-event UUID. Required by the API.
   */
  clientId: string;
  /** Event parameters. Become custom dimensions/metrics in GA4. */
  params: Record<string, unknown>;
}

const GA4_MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

export async function dispatchGa4Mp(event: Ga4MpEvent): Promise<boolean> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) {
    // Silent skip when not configured. Local dev + early production
    // before the secret is provisioned land here. The browser-side
    // event still flows when consent is granted; the server-side
    // dedupe is just unavailable.
    return false;
  }

  const url = `${GA4_MP_ENDPOINT}?measurement_id=${encodeURIComponent(
    measurementId,
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  const body = {
    client_id: event.clientId,
    events: [
      {
        name: event.eventName,
        params: { ...event.params, event_id: event.eventId },
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.error(
        "server-events.ga4mp",
        `GA4 MP responded ${res.status} for ${event.eventName}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    logger.error("server-events.ga4mp", "GA4 MP fetch failed", error);
    return false;
  }
}
