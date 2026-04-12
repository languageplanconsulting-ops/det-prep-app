import { NextResponse } from "next/server";
import { generateInteractiveSpeakingNextQuestion } from "@/lib/gemini-interactive-speaking-next";
import {
  INTERACTIVE_SPEAKING_NEXT_QUESTION_GEMINI_MODEL,
  INTERACTIVE_SPEAKING_TURN_COUNT,
} from "@/lib/interactive-speaking-constants";

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
  const scenarioTitleEn = o.scenarioTitleEn;
  const scenarioTitleTh = o.scenarioTitleTh;
  const starterQuestionEn = o.starterQuestionEn;
  const starterQuestionTh = o.starterQuestionTh;
  const nextTurnNumber = o.nextTurnNumber;
  const historyRaw = o.history;

  if (typeof scenarioTitleEn !== "string" || !scenarioTitleEn.trim()) {
    return NextResponse.json({ error: "scenarioTitleEn required" }, { status: 400 });
  }
  if (typeof starterQuestionEn !== "string" || !starterQuestionEn.trim()) {
    return NextResponse.json({ error: "starterQuestionEn required" }, { status: 400 });
  }
  if (
    typeof nextTurnNumber !== "number" ||
    nextTurnNumber < 2 ||
    nextTurnNumber > INTERACTIVE_SPEAKING_TURN_COUNT
  ) {
    return NextResponse.json(
      { error: `nextTurnNumber must be 2–${INTERACTIVE_SPEAKING_TURN_COUNT}` },
      { status: 400 },
    );
  }
  if (!Array.isArray(historyRaw)) {
    return NextResponse.json({ error: "history must be an array" }, { status: 400 });
  }

  const history = historyRaw.map((h) => {
    const x = h as Record<string, unknown>;
    return {
      questionEn: String(x.questionEn ?? ""),
      answerTranscript: String(x.answerTranscript ?? ""),
    };
  });

  if (history.length !== nextTurnNumber - 1) {
    return NextResponse.json(
      { error: `history length must be nextTurnNumber - 1 (expected ${nextTurnNumber - 1})` },
      { status: 400 },
    );
  }

  try {
    const out = await generateInteractiveSpeakingNextQuestion({
      apiKey: key,
      model: INTERACTIVE_SPEAKING_NEXT_QUESTION_GEMINI_MODEL,
      scenarioTitleEn: scenarioTitleEn.trim(),
      scenarioTitleTh: typeof scenarioTitleTh === "string" ? scenarioTitleTh.trim() : "",
      starterQuestionEn: starterQuestionEn.trim(),
      starterQuestionTh: typeof starterQuestionTh === "string" ? starterQuestionTh.trim() : "",
      history,
      nextTurnNumber,
    });
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed";
    console.error("[interactive-speaking-next]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
