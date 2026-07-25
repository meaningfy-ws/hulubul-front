import { z } from "zod";

// Shared between the waitlist and sender-questionnaire-v2 flows — both
// capture the same optional, best-effort location signal. See
// design/spec-waitlist-backend.md §6 for the original contract this mirrors.

export const LocationGranted = z.object({
  source: z.literal("geolocation"),
  lat: z.number(),
  lon: z.number(),
  accuracyMeters: z.number().nonnegative(),
});
export const LocationIp = z.object({
  source: z.literal("ip"),
  city: z.string().nullable(),
  country: z.string().length(2).nullable(),
});
export const Location = z.union([LocationGranted, LocationIp]);
export type Location = z.infer<typeof Location>;

/** Resolves an approximate location from CDN/edge geo headers, or null if none are present. */
export function resolveIpLocation(request: Request): z.infer<typeof LocationIp> | null {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;
  const city = request.headers.get("x-vercel-ip-city") ?? null;
  if (!country && !city) return null;
  return { source: "ip", city, country };
}
