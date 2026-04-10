import { NextResponse } from "next/server";
import { generateWritingReportWithGemini } from "@/lib/gemini-writing";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import type { WritingTopic } from "@/types/writing";

export const maxDuration = 120;

function isTopic(v: unknown): v is WritingTopic {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.titleEn === "string" &&
    typeof o.titleTh === "string" &&
    typeof o.promptEn === "string" &&
    typeof o.promptTh === "string"
  );
}

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
  const essay = o.essay;
  const followUpAnswers = o.followUpAnswers;
  const prepMinutes = o.prepMinutes;
  const topic = o.topic;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof essay !== "string") {
    return NextResponse.json({ error: "essay must be a string" }, { status: 400 });
  }
  if (followUpAnswers !== undefined && !Array.isArray(followUpAnswers)) {
    return NextResponse.json({ error: "followUpAnswers must be an array of strings" }, { status: 400 });
  }
  const followUpAnswerStrings = Array.isArray(followUpAnswers)
    ? followUpAnswers.map((x) => String(x ?? ""))
    : undefined;
  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    return NextResponse.json(
      { error: "essay must contain at least 50 words" },
      { status: 400 },
    );
  }
  if (typeof prepMinutes !== "number" || prepMinutes < 0 || prepMinutes > 60) {
    return NextResponse.json({ error: "prepMinutes invalid" }, { status: 400 });
  }
  if (!isTopic(topic)) {
    return NextResponse.json({ error: "topic object invalid" }, { status: 400 });
  }

  try {
    const model = await resolveGeminiTextModel();
    const report = await generateWritingReportWithGemini({
      apiKey: key,
      model,
      attemptId,
      topic,
      essay,
      followUpAnswers: followUpAnswerStrings,
      prepMinutes,
    });
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed";
    console.error("[writing-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
