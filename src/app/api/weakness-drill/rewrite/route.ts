import { NextResponse, type NextRequest } from "next/server";

import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import {
  DRILL_MAX_REWRITE_ATTEMPTS,
  checkRewrite,
  loadDrillById,
  toDrillView,
} from "@/lib/weakness-drill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Checks the learner's practice sentence. Optional step: failures here never touch the report. */
export async function POST(req: NextRequest) {
  try {
    const userId = await getOptionalAuthUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as { drillId?: unknown; text?: unknown } | null;
    if (typeof body?.drillId !== "string") {
      return NextResponse.json({ error: "drillId required" }, { status: 400 });
    }
    const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 300) : "";
    if (text.split(" ").filter(Boolean).length < 3) {
      return NextResponse.json({ error: "Write a full sentence", code: "too_short" }, { status: 400 });
    }

    const row = await loadDrillById(userId, body.drillId);
    if (!row) return NextResponse.json({ error: "Drill not found" }, { status: 404 });
    if (row.step1_choice_id == null) {
      return NextResponse.json({ error: "Answer the question first", code: "step1_first" }, { status: 409 });
    }
    if (row.rewrite_passed) {
      return NextResponse.json({ passed: true, hintTh: "", drill: toDrillView(row) });
    }
    if (row.rewrite_attempts >= DRILL_MAX_REWRITE_ATTEMPTS) {
      return NextResponse.json({ error: "No attempts left", code: "no_attempts" }, { status: 429 });
    }

    const model = await resolveGeminiTextModel();
    const keys = resolveGradingKeysFromRequest(req, model);
    const result = await checkRewrite({
      topicEn: row.topic_en || row.topic_th,
      stemEn: row.stem_en,
      text,
      model,
      keys,
    });
    if (result.usage) {
      scheduleApiUsageLog({
        userId,
        operation: "weakness_drill_check",
        provider: result.usage.provider,
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        meta: { drillId: row.id },
      });
    }

    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase
      .from("weakness_drills")
      .update({
        rewrite_attempts: row.rewrite_attempts + 1,
        rewrite_passed: result.passed,
        rewrite_text: text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ passed: result.passed, hintTh: result.hintTh, drill: toDrillView(data as typeof row) });
  } catch (e) {
    console.error("[weakness-drill/rewrite]", e);
    return NextResponse.json({ error: "Could not check your sentence", code: "error" }, { status: 500 });
  }
}
