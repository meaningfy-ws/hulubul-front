import { NextResponse } from "next/server";
import { waitlistSchema } from "@/lib/waitlist-schema";
import { submitWaitlist } from "@/lib/strapi";

export const runtime = "nodejs";

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

  try {
    await submitWaitlist(parsed.data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nu am putut trimite formularul. Încearcă din nou.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
