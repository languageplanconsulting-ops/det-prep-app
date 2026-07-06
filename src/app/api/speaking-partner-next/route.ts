import { NextResponse } from "next/server";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generateSpeakingPartnerNextQuestion } from "@/lib/gemini-speaking-partner-next";
import { normalizeGradingErrorMessage } from "@/lib/grading-error-message";
import { getRequestAuthUser } from "@/lib/supabase-request-client";
import {
  SPEAKING_PARTNER_NEXT_QUESTION_GEMINI_MODEL,
  SPEAKING_PARTNER_TURN_COUNT,
} from "@/lib/speaking-partner-constants";

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
  const topicSeedEn = o.topicSeedEn;
  const nextTurnNumber = o.nextTurnNumber;
  const historyRaw = o.history;

  if (typeof topicSeedEn !== "string" || !topicSeedEn.trim()) {
    return NextResponse.json({ error: "topicSeedEn required" }, { status: 400 });
  }
  if (
    typeof nextTurnNumber !== "number" ||
    nextTurnNumber < 2 ||
    nextTurnNumber > SPEAKING_PARTNER_TURN_COUNT
  ) {
    return NextResponse.json(
      { error: `nextTurnNumber must be 2–${SPEAKING_PARTNER_TURN_COUNT}` },
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
    const { user } = await getRequestAuthUser(req);
    const userId = user?.id ?? null;
    const out = await generateSpeakingPartnerNextQuestion({
      apiKey: key,
      model: SPEAKING_PARTNER_NEXT_QUESTION_GEMINI_MODEL,
      topicSeedEn: topicSeedEn.trim(),
      history,
      nextTurnNumber,
    });
    const { usage, ...payload } = out;
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "speaking_partner_next_question",
        provider: "gemini",
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: { nextTurnNumber },
      });
    }
    return NextResponse.json(payload);
  } catch (e) {
    const message = normalizeGradingErrorMessage(e);
    console.error("[speaking-partner-next]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
