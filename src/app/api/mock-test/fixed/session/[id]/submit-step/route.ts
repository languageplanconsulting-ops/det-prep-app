import { NextResponse, after } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  captureGradingRequest,
  finalizeMockFixedResultIfReady,
  gradeStepInBackground,
  isAdminSkippedAnswer,
  isAiGradedTask,
  scoreAnswerWithNormalCriteria,
} from "@/lib/mock-test/fixed-step-grading";
import { createRequestSupabase } from "@/lib/supabase-request-client";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type SubmitBody = { stepIndex?: number; answer?: unknown };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as SubmitBody;
  if (!body.stepIndex || body.stepIndex < 1 || body.stepIndex > 20) {
    return NextResponse.json({ error: "Invalid stepIndex" }, { status: 400 });
  }

  const access = await getAdminAccess();
  const isSimpleAdmin = access.ok && access.simple === true;

  const supabase = isSimpleAdmin ? createServiceRoleSupabase() : await createRequestSupabase(req);
  let userId: string | null = null;

  if (!isSimpleAdmin) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;
  }

  const sessionQuery = supabase
    .from("mock_fixed_sessions")
    .select("id,user_id,set_id,status,current_step,responses,targets")
    .eq("id", id);

  const { data: session, error: sessionError } = isSimpleAdmin
    ? await sessionQuery.single()
    : await sessionQuery.eq("user_id", userId!).single();
  if (sessionError || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "in_progress") return NextResponse.json({ error: "Session already closed" }, { status: 400 });
  if (session.current_step !== body.stepIndex) {
    return NextResponse.json(
      { error: `Invalid step order. Expected step ${session.current_step}` },
      { status: 409 },
    );
  }

  const { data: setItems, error: setItemsError } = await supabase
    .from("mock_fixed_set_items")
    .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
    .eq("set_id", (session as { set_id: string }).set_id)
    .order("step_index", { ascending: true });
  if (setItemsError || !setItems) {
    return NextResponse.json({ error: "Set items not found" }, { status: 404 });
  }

  const step = setItems.find((x: { step_index: number }) => x.step_index === body.stepIndex);
  if (!step) return NextResponse.json({ error: "Step not found in set" }, { status: 400 });

  const prev = Array.isArray(session.responses) ? session.responses : [];
  if (prev.some((r: { step_index?: number }) => r.step_index === body.stepIndex)) {
    return NextResponse.json({ error: "Step already submitted" }, { status: 400 });
  }
  const sessionTargets = (session.targets ?? {}) as Record<string, unknown>;
  const singleStepPreview = sessionTargets.singleStepPreview === true;
  const singleStepIndex = Number(sessionTargets.singleStepIndex ?? 0);

  // AI-graded steps commit instantly and grade in the BACKGROUND so the
  // learner's sequence never waits on an LLM (grading used to run inline here
  // and could take 30s+ on photo writing). Objective tasks, admin skips, and
  // the admin single-step QA preview still score synchronously — they're
  // instant (or, for the preview, the score is the whole point).
  const backgroundGrade =
    isAiGradedTask(step.task_type) &&
    !isAdminSkippedAnswer(body.answer) &&
    !singleStepPreview;

  const score = backgroundGrade
    ? null
    : await scoreAnswerWithNormalCriteria({
        req,
        taskType: step.task_type,
        answer: body.answer,
        correct: step.correct_answer,
        step,
      });

  const next = [
    ...prev,
    {
      step_index: body.stepIndex,
      task_type: step.task_type,
      answer: body.answer,
      score,
      ...(backgroundGrade ? { ai_pending: true } : {}),
    },
  ];
  const isComplete = singleStepPreview
    ? body.stepIndex === singleStepIndex && next.length >= 1
    : next.length >= 20;
  const patch: Record<string, unknown> = {
    responses: next,
    current_step: singleStepPreview
      ? body.stepIndex
      : Math.min(20, body.stepIndex + 1),
  };
  if (isComplete && !singleStepPreview) {
    patch.status = "completed";
    patch.completed_at = new Date().toISOString();
  }
  const { data: updatedSession, error: updateError } = await supabase
    .from("mock_fixed_sessions")
    .update(patch)
    .eq("id", id)
    .eq("status", "in_progress")
    .eq("current_step", body.stepIndex)
    .select("id")
    .maybeSingle();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!updatedSession) {
    return NextResponse.json({ error: "Session changed during submit. Please reload." }, { status: 409 });
  }

  if (backgroundGrade) {
    // Header snapshot must happen before the response is sent; the grade
    // itself runs after the response so the learner advances immediately.
    const gradingReq = captureGradingRequest(req);
    const bgStep = {
      step_index: step.step_index,
      task_type: step.task_type,
      content: (step.content ?? null) as Record<string, unknown> | null,
      correct_answer: step.correct_answer,
    };
    after(() =>
      gradeStepInBackground({
        gradingReq,
        sessionId: id,
        step: bgStep,
        answer: body.answer,
      }),
    );
  }

  if (isComplete && !singleStepPreview) {
    // No-op while any AI grade is still pending — the last background grade
    // (or the results-loading poller's safety net) finalizes the report. The
    // report is therefore always computed from fully-graded responses.
    await finalizeMockFixedResultIfReady(id);
  }

  return NextResponse.json({
    ok: true,
    complete: isComplete,
    singleStepPreview,
    stepScore: score,
    pendingScore: backgroundGrade,
    stepIndex: body.stepIndex,
    taskType: step.task_type,
  });
}
