import { NextResponse } from "next/server";

import { submitFastTrackRequest } from "@/lib/fast-track-pending";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "");
  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim() || null : null;

  const result = await submitFastTrackRequest(email, fullName);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Could not submit." },
      { status: 400 },
    );
  }

  if ("alreadyPending" in result && result.alreadyPending) {
    return NextResponse.json({
      ok: true,
      alreadyPending: true,
      message:
        "We already have a pending request for this email. We will email you after verification.",
    });
  }

  return NextResponse.json({
    ok: true,
    message:
      "Request received. After we verify your course enrollment, you will get an email from English Plan with your VIP access and password.",
  });
}
