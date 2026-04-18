import { NextResponse } from "next/server";

import { calculateAllSubscores, calculateOverallScore } from "@/lib/mock-test/scoring";
import type { ScoringSessionInput } from "@/lib/mock-test/scoring";
import { generateInsightSummary, gradeDetResponse } from "@/lib/mock-test/grader";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const maxDuration = 300;

function extractTextAnswer(answer: unknown): string {
  if (answer == null) return "";
  if (typeof answer === "string") return answer;
  if (typeof answer === "object" && "text" in (answer as object)) {
    return String((answer as { text?: string }).text ?? "");
  }
  return JSON.stringify(answer);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: session, error: se } = await supabase
      .from("mock_test_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (se || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.engine_version === 2 && session.status === "completed") {
      return NextResponse.json({ ok: true, skipped: "v2_already_scored" });
    }

    const now = new Date().toISOString();
    await supabase
      .from("mock_test_sessions")
      .update({ status: "processing", submitted_at: now })
      .eq("id", sessionId);

    const phaseResponses = JSON.parse(
      JSON.stringify(session.phase_responses ?? {}),
    ) as ScoringSessionInput["phase_responses"];

    const aiPhases = [5, 6, 7, 8, 9, 10] as const;
    for (const p of aiPhases) {
      const block = phaseResponses?.[String(p)];
      if (!block?.items) continue;
      for (const item of block.items) {
        if (typeof item.aiScore === "number") continue;
        const text = extractTextAnswer(item.answer);
        if (!text.trim()) {
          item.aiScore = 0;
          continue;
        }
        try {
          const graded = await gradeDetResponse(
            text,
            `Phase ${p} open response. Question type: ${String(item.questionType ?? "open")}.`,
            { userId: user.id },
          );
          item.aiScore = graded.score;
        } catch {
          item.aiScore = 5;
        }
      }
    }

    const scoringInput: ScoringSessionInput = {
      phase_responses: phaseResponses,
      ai_responses: session.ai_responses ?? {},
    };

    const subscores = calculateAllSubscores(scoringInput);
    const overall = calculateOverallScore(subscores);
    const insights = await generateInsightSummary(subscores, { userId: user.id });

    const adaptiveLog = session.phase_responses;

    await supabase.from("mock_test_results").delete().eq("session_id", sessionId);

    const { error: re } = await supabase.from("mock_test_results").insert({
      session_id: sessionId,
      user_id: user.id,
      overall_score: overall,
      literacy_score: subscores.literacy,
      comprehension_score: subscores.comprehension,
      conversation_score: subscores.conversation,
      production_score: subscores.production,
      adaptive_log: adaptiveLog,
      score_history: null,
      ai_feedback: {
        insights,
        subscores,
      },
      processing_started_at: now,
      processing_completed_at: new Date().toISOString(),
    });

    if (re) {
      console.error("[mock-test/process] insert result", re.message);
      return NextResponse.json({ error: "Could not save results" }, { status: 500 });
    }

    await supabase
      .from("mock_test_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        phase_responses: phaseResponses,
      })
      .eq("id", sessionId);

    return NextResponse.json({ ok: true, overall, subscores });
  } catch (e) {
    console.error("[mock-test/process]", e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
