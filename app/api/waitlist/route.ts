import { NextResponse } from "next/server";
import { waitlistSchema } from "@/lib/waitlist-schema";
import { submitWaitlist } from "@/lib/strapi";

export const runtime = "nodejs";

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
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Validare nereușită" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const device = buildDevice(request, data.client);

  let location = data.location ?? null;
  if (data.locationConsent === "not_asked" && !location) {
    location = resolveIpLocation(request);
  }

  // Strip the `client` hint — its content was merged into `device`.
  const enriched: Record<string, unknown> = { ...data, device, location };
  delete enriched.client;

  try {
    await submitWaitlist(
      enriched as unknown as Parameters<typeof submitWaitlist>[0],
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nu am putut trimite formularul. Încearcă din nou.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
