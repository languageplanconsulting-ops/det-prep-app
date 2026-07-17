import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  captureGradingRequest,
  finalizeMockFixedResultIfReady,
  gradePendingStepsAndFinalize,
} from "@/lib/mock-test/fixed-step-grading";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRequestSupabase } from "@/lib/supabase-request-client";

/** How long a completed session may sit with pending AI grades before this
 *  poller stops waiting for the background tasks and grades inline itself. */
const PENDING_GRADE_GRACE_MS = 45_000;

/**
 * Results are finalized asynchronously: AI-graded steps commit instantly during
 * the test and their LLM grades land in the background. This poller (the
 * results-loading screen hits it every 5s) is both the readiness check and the
 * safety net — if a background grade died, it re-grades inline after a grace
 * period so the learner never waits forever and the report always aggregates
 * real scores.
 */
async function resolveReady(
  req: Request,
  session: { id: string; status: string; completed_at?: string | null },
  hasResult: boolean,
): Promise<boolean> {
  if (hasResult) return true;
  if (session.status !== "completed") return false;

  // Cheap path: all grades landed — just materialize the result row.
  if (await finalizeMockFixedResultIfReady(session.id)) return true;

  const completedAtMs = session.completed_at ? new Date(session.completed_at).getTime() : 0;
  const waitedMs = completedAtMs > 0 ? Date.now() - completedAtMs : Number.POSITIVE_INFINITY;
  if (waitedMs > PENDING_GRADE_GRACE_MS) {
    return gradePendingStepsAndFinalize(session.id, captureGradingRequest(req));
  }
  return false;
}

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const access = await getAdminAccess();
  if (access.ok && access.simple === true) {
    const supabase = createServiceRoleSupabase();

    const { data: session, error: sessionErr } = await supabase
      .from("mock_fixed_sessions")
      .select("id,user_id,targets,status,completed_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: result, error: resultErr } = await supabase
      .from("mock_fixed_results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (resultErr) return NextResponse.json({ error: resultErr.message }, { status: 500 });

    const targets = (session.targets ?? {}) as Record<string, unknown>;
    const adminPreviewMode = targets.adminPreviewMode === true;
    return NextResponse.json({
      ready: await resolveReady(req, session, Boolean(result?.id)),
      adminPreviewMode,
      sessionStatus: session.status,
    });
  }

  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session, error: sessionErr } = await supabase
    .from("mock_fixed_sessions")
    .select("id,user_id,targets,status,completed_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: result, error: resultErr } = await supabase
    .from("mock_fixed_results")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (resultErr) return NextResponse.json({ error: resultErr.message }, { status: 500 });

  const targets = (session.targets ?? {}) as Record<string, unknown>;
  const adminPreviewMode = targets.adminPreviewMode === true;
  return NextResponse.json({
    ready: await resolveReady(req, session, Boolean(result?.id)),
    adminPreviewMode,
    sessionStatus: session.status,
  });
}
