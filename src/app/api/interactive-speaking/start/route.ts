import { NextResponse } from "next/server";
import { reserveInteractiveSpeakingCreditForAttempt } from "@/lib/addon-credits";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const attemptId = o.attemptId;
  const scenarioId = o.scenarioId;

  if (typeof attemptId !== "string" || !attemptId.trim()) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof scenarioId !== "string" || !scenarioId.trim()) {
    return NextResponse.json({ error: "scenarioId required" }, { status: 400 });
  }

  try {
    const userId = await getOptionalAuthUserId();
    if (!userId) {
      return NextResponse.json({ ok: true, charged: false, source: null, alreadyReserved: false });
    }

    const reserved = await reserveInteractiveSpeakingCreditForAttempt({
      userId,
      attemptId: attemptId.trim(),
      scenarioId: scenarioId.trim(),
    });
    if (!reserved.ok) {
      const status = reserved.reason?.includes("quota") ? 402 : 500;
      return NextResponse.json({ error: reserved.reason ?? "Could not reserve AI credit" }, { status });
    }

    return NextResponse.json({
      ok: true,
      charged: false,
      source: reserved.source,
      alreadyReserved: reserved.alreadyReserved ?? false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start session";
    console.error("[interactive-speaking-start]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
