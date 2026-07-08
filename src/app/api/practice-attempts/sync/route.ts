import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";

type AttemptPayload = {
  taskType: string;
  scorePct: number;
  detail?: Record<string, unknown>;
  setId?: string | null;
  stepIndex?: number | null;
};

function isAttemptPayload(o: unknown): o is AttemptPayload {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  return typeof r.taskType === "string" && r.taskType.length > 0 && typeof r.scorePct === "number";
}

/**
 * Insert one practice attempt (web-completed exam/daily-practice set). Shares
 * the same practice_attempts table the mobile app writes to, so scores sync
 * both directions between web and app for the same account.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { attempt?: unknown } | null;
    const attempt = body?.attempt;
    if (!isAttemptPayload(attempt)) {
      return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
    }

    const { error } = await supabase.from("practice_attempts").insert({
      user_id: user.id,
      source: "web",
      set_id: attempt.setId ?? null,
      step_index: attempt.stepIndex ?? null,
      task_type: attempt.taskType,
      score_pct: attempt.scorePct,
      detail: attempt.detail ?? {},
    });

    if (error) {
      // Table may not be deployed yet (see supabase/manual_run_practice_attempts.sql)
      // — don't break the exam-submit flow over it.
      console.error("[practice-attempts/sync] insert", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[practice-attempts/sync] POST", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

/**
 * Fetch every practice attempt for the signed-in user, optionally filtered by
 * task_type. Used to merge mobile-completed scores into the web progress maps.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const taskType = url.searchParams.get("taskType");

    let query = supabase
      .from("practice_attempts")
      .select("task_type, score_pct, detail, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (taskType) query = query.eq("task_type", taskType);

    const { data, error } = await query;
    if (error) {
      console.error("[practice-attempts/sync] GET", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempts: data ?? [] });
  } catch (e) {
    console.error("[practice-attempts/sync] GET", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
