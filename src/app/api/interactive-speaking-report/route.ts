import { NextResponse } from "next/server";
import { generateInteractiveSpeakingReportWithGemini } from "@/lib/gemini-interactive-speaking-report";
import { INTERACTIVE_SPEAKING_TURN_COUNT } from "@/lib/interactive-speaking-constants";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";

export const maxDuration = 120;

export async function POST(req: Request) {
  const fromEnv = process.env.GEMINI_API_KEY?.trim();
  const fromHeader = req.headers.get("x-gemini-api-key")?.trim();
  const key = fromEnv || fromHeader;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "No Gemini key. Set GEMINI_API_KEY in .env.local (or your server environment).",
      },
      { status: 503 },
    );
  }

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
  const scenarioTitleEn = o.scenarioTitleEn;
  const scenarioTitleTh = o.scenarioTitleTh;
  const prepMinutes = o.prepMinutes;
  const turnsRaw = o.turns;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof scenarioId !== "string" || !scenarioId) {
    return NextResponse.json({ error: "scenarioId required" }, { status: 400 });
  }
  if (typeof scenarioTitleEn !== "string" || !scenarioTitleEn.trim()) {
    return NextResponse.json({ error: "scenarioTitleEn required" }, { status: 400 });
  }
  if (typeof prepMinutes !== "number" || prepMinutes < 0 || prepMinutes > 60) {
    return NextResponse.json({ error: "prepMinutes invalid" }, { status: 400 });
  }
  if (!Array.isArray(turnsRaw) || turnsRaw.length !== INTERACTIVE_SPEAKING_TURN_COUNT) {
    return NextResponse.json(
      { error: `turns must be an array of length ${INTERACTIVE_SPEAKING_TURN_COUNT}` },
      { status: 400 },
    );
  }

  const turns = turnsRaw.map((t, i) => {
    const x = t as Record<string, unknown>;
    return {
      turnIndex: typeof x.turnIndex === "number" ? x.turnIndex : i + 1,
      questionEn: String(x.questionEn ?? ""),
      questionTh: String(x.questionTh ?? ""),
      transcript: String(x.transcript ?? ""),
    };
  });

  const wordCount = turns
    .map((t) => t.transcript.trim())
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  if (wordCount < 20) {
    return NextResponse.json(
      {
        error: `Combined answers too short — speak a bit more across all ${INTERACTIVE_SPEAKING_TURN_COUNT} turns.`,
      },
      { status: 400 },
    );
  }

  try {
    const model = await resolveGeminiTextModel();
    const report = await generateInteractiveSpeakingReportWithGemini({
      apiKey: key,
      model,
      attemptId,
      scenarioId,
      scenarioTitleEn: scenarioTitleEn.trim(),
      scenarioTitleTh: typeof scenarioTitleTh === "string" ? scenarioTitleTh.trim() : "",
      prepMinutes,
      turns,
    });
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed";
    console.error("[interactive-speaking-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
