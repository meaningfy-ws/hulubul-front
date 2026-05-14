import { NextResponse } from "next/server";
import { surveySchema } from "@/lib/survey-schema";
import { submitSurvey } from "@/lib/survey";
import {
  dispatchConversion,
  generateEventId,
} from "@/lib/server-events/dispatcher";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = surveySchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Validare nereușită" },
      { status: 400 },
    );
  }

  // Strip server-only `consent` before forwarding to Strapi.
  const { consent, ...strapiPayload } = parsed.data;

  try {
    await submitSurvey(
      strapiPayload as unknown as Parameters<typeof submitSurvey>[0],
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nu am putut trimite răspunsul. Încearcă din nou.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const eventId = generateEventId();
  await dispatchConversion(
    {
      eventName: "survey_submit",
      eventId,
      clientId: consent?.recordId ?? eventId,
      params: { role: parsed.data.role, source: parsed.data.source },
    },
    consent ?? { analytics: "denied", marketing: "denied" },
  );

  return NextResponse.json(
    { ok: true, event_id: eventId },
    { status: 201 },
  );
}
