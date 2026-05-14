import { NextResponse } from "next/server";
import { consentSubmissionSchema } from "@/lib/consent/schema";
import { strapiFetch, throwStrapiError } from "@/lib/strapi-client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function clip(s: string | null, max: number): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = consentSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Validare nereușită" },
      { status: 400 },
    );
  }

  const headers = request.headers;
  const country =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    null;
  const language = headers.get("accept-language");
  const enriched = {
    ...parsed.data,
    userAgent: clip(headers.get("user-agent"), 512),
    language: language ? language.split(",")[0]!.trim() : null,
    country,
    referrer: clip(headers.get("referer"), 2048),
  };

  const path = "/api/consent-records";
  try {
    const res = await strapiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: enriched }),
    });
    if (!res.ok) throwStrapiError(path, res);
    const body = (await res.json()) as { data: { documentId: string } };
    return NextResponse.json(
      { ok: true, recordId: body.data.documentId },
      { status: 201 },
    );
  } catch (error) {
    // Audit-trail failure must never break the user-facing consent UX.
    // The browser localStorage already reflects the choice; trackers are
    // gated correctly. We log and return 502 — the client treats this
    // as "fire-and-forget didn't fire" and continues.
    logger.error("api.consent", "Strapi POST failed", error);
    return NextResponse.json(
      { ok: false, error: "consent record could not be persisted" },
      { status: 502 },
    );
  }
}
