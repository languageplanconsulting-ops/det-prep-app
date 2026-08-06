import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ userId: string }> };

/**
 * Let a learner genuinely REDO a mock set from step 1.
 *
 * Resetting the monthly quota alone does not do this: a half-finished run stays
 * resumable for 7 days, and starting the same set hands back that SAME session
 * at the step they stopped on. So a goodwill "please redo it" — after a broken
 * photo, an outage, anything that spoiled the run — silently dropped the learner
 * back into the spoiled attempt with the bad answers already scored.
 *
 * Voiding the run closes it (no longer resumable) and marks it quotaExempt so
 * the ruined attempt costs them nothing. Nothing is deleted: `mock_fixed_results`
 * rows are the report/history surface and a half-finished run has none, so a
 * voided attempt simply never appears rather than showing up as a bad score.
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    setId?: string;
    steps?: number[];
    reason?: string;
  } | null;

  const supabase = createServiceRoleSupabase();

  const steps = Array.from(
    new Set((body?.steps ?? []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 20)),
  ).sort((a, b) => a - b);

  // Reopening specific steps of a FINISHED run — the learner keeps the other 19
  // answers and only redoes what the bug spoiled. This is the usual case: by the
  // time support hears about it, they have already pushed through to the end.
  if (steps.length > 0) {
    // No sessionId given → their latest finished run, which is what support is
    // almost always looking at when a learner writes in about a spoiled question.
    let lookup = supabase
      .from("mock_fixed_sessions")
      .select("id,set_id,status,responses,targets,started_at")
      .eq("user_id", userId)
      .in("status", ["completed", "in_progress"])
      .order("started_at", { ascending: false })
      .limit(1);
    if (body?.sessionId) lookup = lookup.eq("id", body.sessionId);

    const { data: found, error: sessionErr } = await lookup;
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 500 });
    const session = found?.[0];
    if (!session) return NextResponse.json({ error: "Mock run not found for this learner." }, { status: 404 });
    if (session.status !== "completed" && session.status !== "in_progress") {
      return NextResponse.json({ error: `Cannot reopen a ${session.status} run.` }, { status: 409 });
    }

    const targets = (session.targets ?? {}) as Record<string, unknown>;
    const { error: updateError } = await supabase
      .from("mock_fixed_sessions")
      .update({
        status: "in_progress",
        completed_at: null,
        current_step: steps[0],
        // Answers stay put; submit-step replaces each reopened step's entry as
        // it comes in, then re-finalizes the report over the full 20.
        targets: {
          ...targets,
          retakeSteps: steps,
          retakeOpened: { at: new Date().toISOString(), reason: body?.reason ?? null, steps },
        },
      })
      .eq("id", session.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await logAdminAction({
      adminId: auth.adminUserId,
      targetUserId: userId,
      action: "reopen_mock_steps_for_retake",
      previousValue: { sessionId: session.id, status: session.status },
      newValue: { retakeSteps: steps },
      reason: typeof body?.reason === "string" ? body.reason : null,
    });

    return NextResponse.json({ ok: true, reopened: { sessionId: session.id, steps } });
  }

  let query = supabase
    .from("mock_fixed_sessions")
    .select("id,set_id,current_step,targets,started_at")
    .eq("user_id", userId)
    .eq("status", "in_progress");
  if (body?.sessionId) query = query.eq("id", body.sessionId);
  if (body?.setId) query = query.eq("set_id", body.setId);

  const { data: rows, error: fetchError } = await query;
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: "No in-progress mock run found for this learner." },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();
  const voided: Array<{ id: string; setId: string; stoppedAtStep: number }> = [];

  for (const row of rows) {
    const targets = (row.targets ?? {}) as Record<string, unknown>;
    const { error: updateError } = await supabase
      .from("mock_fixed_sessions")
      .update({
        status: "abandoned",
        completed_at: now,
        targets: {
          ...targets,
          quotaExempt: true,
          voidedForRedo: { at: now, reason: body?.reason ?? null },
        },
      })
      .eq("id", row.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    voided.push({
      id: row.id as string,
      setId: row.set_id as string,
      stoppedAtStep: Number(row.current_step ?? 1),
    });
  }

  await logAdminAction({
    adminId: auth.adminUserId,
    targetUserId: userId,
    action: "void_mock_run_for_redo",
    previousValue: { inProgress: voided },
    newValue: { voided: voided.length },
    reason: typeof body?.reason === "string" ? body.reason : null,
  });

  return NextResponse.json({ ok: true, voided });
}
