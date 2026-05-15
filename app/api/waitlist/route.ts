import { NextResponse } from "next/server";
import { waitlistSchema } from "@/lib/waitlist-schema";
import { submitWaitlist, findDuplicateRegistration } from "@/lib/strapi";
import {
  dispatchConversion,
  generateEventId,
} from "@/lib/server-events/dispatcher";
import { isStrapiError } from "@/lib/strapi-client";
import {
  ErrorCode,
  codeForUpstreamStatus,
  httpStatusForCode,
} from "@/lib/errors/codes";
import { messageForCode } from "@/lib/errors/messages";
import { maskEmail } from "@/lib/errors/mask";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** Classifies any thrown failure into a taxonomy code + real upstream status. */
function classify(error: unknown): {
  code: ErrorCode;
  upstreamStatus?: number;
} {
  if (isStrapiError(error)) {
    return {
      code: codeForUpstreamStatus(error.status),
      upstreamStatus: error.status,
    };
  }
  // `fetch()` itself failing (DNS/connection/timeout) → backend down.
  if (
    error instanceof TypeError ||
    (error instanceof Error &&
      /failed to fetch|networkerror|network request failed|fetch failed/i.test(
        error.message,
      ))
  ) {
    return { code: ErrorCode.UpstreamDown, upstreamStatus: 0 };
  }
  return { code: ErrorCode.Unknown };
}

/** Builds the structured error response + correlated x-request-id header. */
function errorResponse(
  code: ErrorCode,
  requestId: string,
  opts: { upstreamStatus?: number; registeredAt?: string; details?: unknown } = {},
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message: messageForCode(code, { registeredAt: opts.registeredAt }),
        upstreamStatus: opts.upstreamStatus,
        requestId,
        details: opts.details,
      },
    },
    {
      status: httpStatusForCode(code),
      headers: { "x-request-id": requestId },
    },
  );
}

interface DeviceSignature {
  userAgent: string;
  platform: string | null;
  language: string | null;
  viewport: { w: number; h: number } | null;
  timezone: string | null;
  dnt: boolean;
}

function clip(s: string | null, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function buildDevice(
  request: Request,
  client?: { viewport?: { w: number; h: number }; timezone?: string },
): DeviceSignature {
  const ua = clip(request.headers.get("user-agent"), 512);
  const lang = request.headers.get("accept-language");
  const platform = request.headers.get("sec-ch-ua-platform");
  const dnt = request.headers.get("dnt") === "1";
  return {
    userAgent: ua,
    platform: platform ? platform.replace(/"/g, "") : null,
    language: lang ? lang.split(",")[0]!.trim() : null,
    viewport: client?.viewport ?? null,
    timezone: client?.timezone ?? null,
    dnt,
  };
}

function resolveIpLocation(request: Request) {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;
  const city = request.headers.get("x-vercel-ip-city") ?? null;
  if (!country && !city) return null;
  return { source: "ip" as const, city, country };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorResponse(ErrorCode.ClientValidation, requestId, {
      details: {
        issues: [{ field: "(payload)", message: "Cerere invalidă." }],
      },
    });
  }

  const parsed = waitlistSchema.safeParse(json);
  if (!parsed.success) {
    // Every issue with its field path, so the client can tell the user
    // exactly what's missing instead of a generic "check the form".
    const issues = parsed.error.issues.map((iss) => ({
      field: iss.path.join(".") || "(payload)",
      message: iss.message,
    }));
    return errorResponse(ErrorCode.ClientValidation, requestId, {
      details: { issues },
    });
  }

  const data = parsed.data;
  const device = buildDevice(request, data.client);

  let location = data.location ?? null;
  if (data.locationConsent === "not_asked" && !location) {
    location = resolveIpLocation(request);
  }

  // Strip the `client` hint and the `consent` (server-side only) — they
  // weren't part of the Strapi schema. Strapi receives just the
  // submission fields.
  const enriched: Record<string, unknown> = { ...data, device, location };
  delete enriched.client;
  delete enriched.consent;

  // Soft dedupe: block only an EXACT repeat (same email + role + cities).
  // A different role or different cities is a legitimate new registration
  // (e.g. one parent, kids in Italy and France, one email). On an exact
  // repeat we tell the user it was already registered on that date and to
  // be patient — nothing more. A failure in the lookup itself is treated
  // like any other upstream failure — we do NOT fall through to insert.
  try {
    const existing = await findDuplicateRegistration({
      email: data.email,
      role: data.role,
      cities: data.cities,
    });
    if (existing) {
      logger.info(
        "api/waitlist",
        `dedupe hit reqId=${requestId} email=${maskEmail(data.email)} registeredAt=${existing.registeredAt}`,
      );
      return errorResponse(ErrorCode.AlreadyRegistered, requestId, {
        registeredAt: existing.registeredAt,
      });
    }
  } catch (error) {
    const { code, upstreamStatus } = classify(error);
    logger.error(
      "api/waitlist",
      `dedupe lookup failed reqId=${requestId} code=${code} upstream=${upstreamStatus} email=${maskEmail(data.email)}`,
      error,
    );
    return errorResponse(code, requestId, { upstreamStatus });
  }

  try {
    await submitWaitlist(
      enriched as unknown as Parameters<typeof submitWaitlist>[0],
    );
  } catch (error) {
    const { code, upstreamStatus } = classify(error);
    const upstreamMessage = isStrapiError(error)
      ? error.upstreamMessage
      : error instanceof Error
        ? error.message
        : undefined;
    logger.error(
      "api/waitlist",
      `submit failed reqId=${requestId} code=${code} upstream=${upstreamStatus} email=${maskEmail(data.email)} strapi=${JSON.stringify(upstreamMessage)}`,
      error,
    );
    return errorResponse(code, requestId, { upstreamStatus });
  }

  // Generate the dedupe key. Returned to the client so the browser-side
  // gtag('event') can carry the same event_id, allowing GA4 to collapse
  // the two events into one conversion.
  const eventId = generateEventId();

  // Server-side dispatch — fire-and-forget, never blocks the response.
  // dispatchConversion respects consent: only fires GA4 MP when
  // analytics consent is granted.
  await dispatchConversion(
    {
      eventName: "waitlist_submit",
      eventId,
      clientId: data.consent?.recordId ?? eventId,
      params: { role: data.role, source: data.source ?? "landing" },
    },
    data.consent ?? { analytics: "denied", marketing: "denied" },
  );

  return NextResponse.json(
    { ok: true, event_id: eventId },
    { status: 201 },
  );
}
