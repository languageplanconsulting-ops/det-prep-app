import { NextResponse } from "next/server";

import { consumeAddonCreditsForUser, getAddonBalancesForUser } from "@/lib/addon-credits";
import { getAdminAccess } from "@/lib/admin-auth";
import { MOCK_TEST_MONTHLY_LIMIT, type Tier } from "@/lib/access-control";
import { ensureProfileForAuthUser } from "@/lib/ensure-profile";
import { FIXED_MOCK_STEP_COUNT } from "@/lib/mock-test/fixed-sequence";
import { countBillableMockFixedSessions, mockFixedMonthStartIso } from "@/lib/mock-test/mock-fixed-quota";
import { isMockTestAvailableNow } from "@/lib/mock-test/mock-test-availability";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

type StartBody = {
  setId?: string;
  adminPreviewMode?: boolean;
  skipTimerMode?: boolean;
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
    const skipTimerMode = body.skipTimerMode === true;
    const previewSeparateMode = body.previewSeparateMode === true;
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

  const supabase = await createRouteHandlerSupabase();
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
  const skipTimerMode = isAdmin && body.skipTimerMode === true;
  const previewSeparateMode = isAdmin && body.previewSeparateMode === true;
  const previewStepIndex = normalizePreviewStep(body.previewStepIndex ?? 1);

  if (!isAdmin && !isMockTestAvailableNow()) {
    return NextResponse.json({ error: "Mock test is not available yet" }, { status: 403 });
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
        singleStepPreview: previewSeparateMode,
        singleStepIndex: previewSeparateMode ? previewStepIndex : null,
      },
      responses: [],
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to start session" }, { status: 500 });
  return NextResponse.json({ sessionId: data.id });
}
