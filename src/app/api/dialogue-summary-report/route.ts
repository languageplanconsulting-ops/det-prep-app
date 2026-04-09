import { NextResponse } from "next/server";
import { DIALOGUE_SUMMARY_MIN_WORDS } from "@/lib/dialogue-summary-constants";
import { generateDialogueSummaryReportWithGemini } from "@/lib/gemini-dialogue-summary";
import type { DialogueSummaryExam } from "@/types/dialogue-summary";

export const maxDuration = 120;

function isExam(v: unknown): v is DialogueSummaryExam {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.titleEn === "string" &&
    typeof o.titleTh === "string" &&
    Array.isArray(o.scenarioSentences) &&
    Array.isArray(o.dialogue)
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
  const summary = o.summary;
  const exam = o.exam;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof summary !== "string") {
    return NextResponse.json({ error: "summary must be a string" }, { status: 400 });
  }
  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < DIALOGUE_SUMMARY_MIN_WORDS) {
    return NextResponse.json(
      { error: `Summary must contain at least ${DIALOGUE_SUMMARY_MIN_WORDS} words` },
      { status: 400 },
    );
  }
  if (!isExam(exam)) {
    return NextResponse.json({ error: "exam object invalid" }, { status: 400 });
  }

  const submittedAt = typeof o.submittedAt === "string" ? o.submittedAt : new Date().toISOString();

  try {
    const report = await generateDialogueSummaryReportWithGemini({
      apiKey: key,
      attemptId,
      exam,
      summary,
      submittedAt,
      wordCount,
    });
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed";
    console.error("[dialogue-summary-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
