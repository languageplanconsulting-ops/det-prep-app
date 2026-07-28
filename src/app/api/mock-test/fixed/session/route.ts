import { NextResponse } from "next/server";

import { consumeAddonCreditsForUser, getAddonBalancesForUser } from "@/lib/addon-credits";
import { getAdminAccess } from "@/lib/admin-auth";
import { MOCK_TEST_MONTHLY_LIMIT, type Tier } from "@/lib/access-control";
import { recordBusinessEvent } from "@/lib/business-events";
import { ensureProfileForAuthUser } from "@/lib/ensure-profile";
import { FIXED_MOCK_STEP_COUNT } from "@/lib/mock-test/fixed-sequence";
import {
  countBillableMockFixedSessions,
  isBillableMockFixedSession,
  mockFixedMonthStartIso,
} from "@/lib/mock-test/mock-fixed-quota";
import { isMockTestAvailableNow } from "@/lib/mock-test/mock-test-availability";
import {
  abandonStaleFixedMockSessions,
  mockFixedResumeCutoffIso,
} from "@/lib/mock-test/session-integrity";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRequestSupabase } from "@/lib/supabase-request-client";

type StartBody = {
  setId?: string;
  adminPreviewMode?: boolean;
  skipTimerMode?: boolean;
  fastPassPreviewMode?: boolean;
  previewSeparateMode?: boolean;
  previewStepIndex?: number;
  targets?: {
    total?: number;
    listening?: number;
    speaking?: number;
    reading?: number;
    writing?: number;
  };
};

function normalizePreviewStep(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(FIXED_MOCK_STEP_COUNT, Math.round(n)));
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

type ResumableRow = {
  id: string;
  set_id: string;
  status: string;
  current_step: number | null;
  responses: unknown;
  targets: unknown;
  started_at: string | null;
  completed_at: string | null;
};

/**
 * A real learner run — never an admin preview, single-step QA, fast-pass, or
 * untimed session. `isBillableMockFixedSession` covers preview/QA/exempt runs;
 * the extra flags catch an admin launch that only set a timing override, which
 * must not be resumable as a normal attempt.
 */
function isLearnerRun(row: { targets?: unknown }): boolean {
  if (!isBillableMockFixedSession(row.targets)) return false;
  const t = (row.targets ?? {}) as Record<string, unknown>;
  return t.skipTimerMode !== true && t.fastPassPreviewMode !== true;
}

/**
 * Unfinished business for this learner:
 *  - `inProgress`: half-done runs, newest first, one entry per set. The start
 *    page turns these into "ทำต่อ · ข้อ N/20" so a learner who dropped out at
 *    step 10 of Mock 2 gets straight back to step 10 of Mock 2.
 *  - `pendingReports`: runs that finished but whose report row never
 *    materialized (background AI grading died, tab closed during the 10-minute
 *    processing screen). Without a link back, these are invisible forever.
 */
export async function GET(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ inProgress: [], pendingReports: [] }, { headers: NO_STORE_HEADERS });
  }

  const { data: rows } = await supabase
    .from("mock_fixed_sessions")
    .select("id,set_id,status,current_step,responses,targets,started_at,completed_at")
    .eq("user_id", user.id)
    .in("status", ["in_progress", "completed"])
    .gte("started_at", mockFixedResumeCutoffIso())
    .order("started_at", { ascending: false });

  const all = ((rows ?? []) as ResumableRow[]).filter(isLearnerRun);

  const seenSets = new Set<string>();
  const inProgress = all
    .filter((r) => r.status === "in_progress")
    .filter((r) => {
      if (seenSets.has(r.set_id)) return false;
      seenSets.add(r.set_id);
      return true;
    })
    .map((r) => ({
      sessionId: r.id,
      setId: r.set_id,
      currentStep: Math.max(1, Math.min(FIXED_MOCK_STEP_COUNT, Number(r.current_step ?? 1))),
      answeredCount: Array.isArray(r.responses) ? r.responses.length : 0,
      startedAt: r.started_at,
    }));

  const completed = all.filter((r) => r.status === "completed");
  let pendingReports: Array<{ sessionId: string; setId: string; completedAt: string | null }> = [];
  if (completed.length > 0) {
    const { data: resultRows } = await supabase
      .from("mock_fixed_results")
      .select("session_id")
      .eq("user_id", user.id)
      .in(
        "session_id",
        completed.map((r) => r.id),
      );
    const finalized = new Set((resultRows ?? []).map((r: { session_id: string }) => r.session_id));
    pendingReports = completed
      .filter((r) => !finalized.has(r.id))
      .map((r) => ({ sessionId: r.id, setId: r.set_id, completedAt: r.completed_at }));
  }

  return NextResponse.json({ inProgress, pendingReports }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as StartBody;
  if (!body.setId) return NextResponse.json({ error: "setId is required" }, { status: 400 });

  const access = await getAdminAccess();
  const isSimpleAdmin = access.ok && access.simple === true;

  if (isSimpleAdmin) {
    const supabase = createServiceRoleSupabase();

    // Fixed mock sessions require a real `profiles.id` because of FKs.
    // Prefer a real admin profile id, but fall back to any existing profile id.
    const { data: adminRows, error: adminErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 });

    const surrogateUserId =
      (adminRows?.[0] as { id?: string } | undefined)?.id ??
      (await supabase.from("profiles").select("id").limit(1)).data?.[0]?.id;

    if (!surrogateUserId) {
      return NextResponse.json(
        { error: "No profiles row found. Create at least one user/profile first." },
        { status: 500 },
      );
    }

    const { data: setRow, error: setError } = await supabase
      .from("mock_fixed_sets")
      .select("id,mock_fixed_set_items(count)")
      .eq("id", body.setId)
      .eq("is_active", true)
      .maybeSingle();
    const stepCount = setRow?.mock_fixed_set_items?.[0]?.count ?? 0;
    if (setError || !setRow || stepCount !== FIXED_MOCK_STEP_COUNT) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    const adminPreviewMode = body.adminPreviewMode === true;
    const fastPassPreviewMode = body.fastPassPreviewMode === true;
    const skipTimerMode = body.skipTimerMode === true || fastPassPreviewMode;
    const previewSeparateMode = body.previewSeparateMode === true && !fastPassPreviewMode;
    const previewStepIndex = normalizePreviewStep(body.previewStepIndex ?? 1);

    const { data, error } = await supabase
      .from("mock_fixed_sessions")
      .insert({
        user_id: surrogateUserId,
        set_id: body.setId,
        status: "in_progress",
        current_step: previewSeparateMode ? previewStepIndex : 1,
        targets: {
          ...(body.targets ?? {}),
          monthlyUsed: 0,
          adminPreviewMode,
          skipTimerMode,
          fastPassPreviewMode,
          singleStepPreview: previewSeparateMode,
          singleStepIndex: previewSeparateMode ? previewStepIndex : null,
        },
        responses: [],
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to start session" }, { status: 500 });
    }
    return NextResponse.json({ sessionId: data.id });
  }

  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureProfileForAuthUser({
    userId: user.id,
    email: user.email ?? "",
    fullName:
      (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  });

  const { data: setRow, error: setError } = await supabase
    .from("mock_fixed_sets")
    .select("id,mock_fixed_set_items(count)")
    .eq("id", body.setId)
    .eq("is_active", true)
    .maybeSingle();
  const stepCount = setRow?.mock_fixed_set_items?.[0]?.count ?? 0;
  if (setError || !setRow || stepCount !== FIXED_MOCK_STEP_COUNT) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role,tier,tier_expires_at,vip_granted_by_course")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = me?.role === "admin";
  const adminPreviewMode = isAdmin && body.adminPreviewMode === true;
  const fastPassPreviewMode = isAdmin && body.fastPassPreviewMode === true;
  const skipTimerMode = isAdmin && (body.skipTimerMode === true || fastPassPreviewMode);
  const previewSeparateMode = isAdmin && body.previewSeparateMode === true && !fastPassPreviewMode;
  const previewStepIndex = normalizePreviewStep(body.previewStepIndex ?? 1);

  if (!isAdmin && !isMockTestAvailableNow()) {
    return NextResponse.json({ error: "Mock test is not available yet" }, { status: 403 });
  }

  // ── Resume before charge ────────────────────────────────────────────────
  // Starting a set the learner is already part-way through hands back the SAME
  // session at its saved step. This runs BEFORE the quota/add-on block on
  // purpose: the credit was consumed when the run began, so continuing it must
  // never cost a second one — and must work even when the monthly quota is now
  // exhausted. Preview/QA launches are excluded so admin flows stay predictable.
  const wantsPreviewRun = adminPreviewMode || previewSeparateMode || fastPassPreviewMode || skipTimerMode;
  if (!wantsPreviewRun) {
    const { data: resumableRows } = await supabase
      .from("mock_fixed_sessions")
      .select("id,set_id,current_step,targets,started_at")
      .eq("user_id", user.id)
      .eq("set_id", body.setId)
      .eq("status", "in_progress")
      .gte("started_at", mockFixedResumeCutoffIso())
      .order("started_at", { ascending: false })
      .limit(5);
    const resumable = (resumableRows ?? []).find((r) => isLearnerRun(r));
    if (resumable) {
      return NextResponse.json({
        sessionId: resumable.id,
        resumed: true,
        currentStep: Math.max(1, Math.min(FIXED_MOCK_STEP_COUNT, Number(resumable.current_step ?? 1))),
      });
    }
  }

  const monthStart = mockFixedMonthStartIso();
  const { data: sessionRows } = await supabase
    .from("mock_fixed_sessions")
    .select("targets")
    .eq("user_id", user.id)
    .gte("started_at", monthStart);
  const billableUsed = countBillableMockFixedSessions(sessionRows);

  const tier = resolveEffectiveTierFromProfile({
    tier: me?.tier,
    tier_expires_at: (me?.tier_expires_at as string | null | undefined) ?? null,
    vip_granted_by_course: me?.vip_granted_by_course === true,
  });
  const monthlyLimit = MOCK_TEST_MONTHLY_LIMIT[tier];
  const addonBalances = !isAdmin ? await getAddonBalancesForUser(user.id) : { mockRemaining: 0, feedbackRemaining: 0, rows: [] };
  if (!isAdmin && (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0)) {
    if (addonBalances.mockRemaining <= 0) {
      return NextResponse.json({ error: "Your plan does not include mock tests" }, { status: 403 });
    }
  }
  if (!isAdmin && Number.isFinite(monthlyLimit) && billableUsed >= monthlyLimit) {
    if (addonBalances.mockRemaining <= 0) {
      return NextResponse.json(
        { error: `Monthly mock test limit reached for ${tier} plan` },
        { status: 403 },
      );
    }
  }

  const shouldConsumeAddon =
    !isAdmin &&
    ((Number.isFinite(monthlyLimit) && billableUsed >= monthlyLimit) ||
      (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0));
  if (shouldConsumeAddon) {
    const consumed = await consumeAddonCreditsForUser(user.id, "mock", 1);
    if (!consumed.ok) {
      return NextResponse.json({ error: "No extra mock add-on credit available" }, { status: 403 });
    }
  }

  // Sweep only sessions that aged out of the resume window. Recent half-done
  // runs are deliberately left in_progress so the resume branch above can hand
  // them back (a learner may have Mock 2 paused at step 10 while they start
  // Mock 3 — both stay resumable).
  if (!isAdmin) {
    await abandonStaleFixedMockSessions(supabase, user.id);
  }

  const { data, error } = await supabase
    .from("mock_fixed_sessions")
    .insert({
      user_id: user.id,
      set_id: body.setId,
      status: "in_progress",
      current_step: previewSeparateMode ? previewStepIndex : 1,
        targets: {
          ...(body.targets ?? {}),
          monthlyUsed: billableUsed,
          addonMockUsed: shouldConsumeAddon,
          adminPreviewMode,
          skipTimerMode,
          fastPassPreviewMode,
          singleStepPreview: previewSeparateMode,
          singleStepIndex: previewSeparateMode ? previewStepIndex : null,
      },
      responses: [],
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to start session" }, { status: 500 });

  await recordBusinessEvent({
    userId: user.id,
    email: user.email ?? null,
    eventType: "mock_test_started",
    eventSource: "mock_fixed_session",
    eventLabel: body.setId,
    metadata: {
      setId: body.setId,
      tier,
      addonMockUsed: shouldConsumeAddon,
      monthlyUsed: billableUsed,
      sessionId: data.id,
    },
  });

  return NextResponse.json({ sessionId: data.id });
}
