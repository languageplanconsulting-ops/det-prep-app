import { NextResponse } from "next/server";

import { AI_MONTHLY_LIMIT, MOCK_TEST_MONTHLY_LIMIT } from "@/lib/access-control";
import { readAuthoritativeProfile } from "@/lib/authoritative-profile";
import { getAddonBalancesForUser, getVipWeeklyAiQuotaForUser } from "@/lib/addon-credits";
import { mockFixedMonthStartIso, countBillableMockFixedSessions } from "@/lib/mock-test/mock-fixed-quota";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { getAdminAccess } from "@/lib/admin-auth";
import { ensureProfileForAuthUser } from "@/lib/ensure-profile";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

export async function GET(request: Request) {
  const { user, supabase } = await getRequestAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminAccess = await getAdminAccess();

  await ensureProfileForAuthUser({
    userId: user.id,
    email: user.email ?? "",
    fullName:
      (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  });

  const [profile, { data: sessions }, addon] = await Promise.all([
    // Authoritative (service-role) profile read so a stale user-token can't make a paying
    // customer's quota resolve as "free". Mirrors /api/me.
    readAuthoritativeProfile(
      user.id,
      supabase,
      "tier, role, tier_expires_at, vip_granted_by_course, ai_credits_used, lifetime_ai_used, ai_quota_mode, ai_monthly_limit_override",
    ),
    supabase
      .from("mock_fixed_sessions")
      .select("targets")
      .eq("user_id", user.id)
      .gte("started_at", mockFixedMonthStartIso()),
    getAddonBalancesForUser(user.id),
  ]);

  const tier = adminAccess.ok
    ? "vip"
    : resolveEffectiveTierFromProfile({
        tier: profile?.tier,
        tier_expires_at: (profile?.tier_expires_at as string | null | undefined) ?? null,
        vip_granted_by_course: profile?.vip_granted_by_course === true,
      });
  const isAdmin = profile?.role === "admin" || adminAccess.ok;
  const aiUsed = Math.max(0, Number(profile?.ai_credits_used ?? 0));
  const lifetimeAiUsed = profile?.lifetime_ai_used === true;
  const aiLimit = AI_MONTHLY_LIMIT[tier];
  const vipWeekly = tier === "vip" && !isAdmin ? await getVipWeeklyAiQuotaForUser(user.id) : null;
  const vipMonthlyOnly = vipWeekly?.mode === "monthly_override";
  const aiPlanRemaining = isAdmin
    ? Number.MAX_SAFE_INTEGER
    : tier === "free"
      ? lifetimeAiUsed
        ? 0
        : 1
      : tier === "vip" && vipWeekly
        ? vipMonthlyOnly
          ? vipWeekly.monthlyPlanRemaining
          : vipWeekly.weeklyVisibleRemaining
        : Math.max(0, aiLimit - aiUsed);
  const aiUsedDisplay =
    tier === "vip" && vipWeekly
      ? vipMonthlyOnly
        ? vipWeekly.monthlyPlanUsed
        : vipWeekly.used
      : aiUsed;
  const aiPlanLimitDisplay =
    tier === "vip" && vipWeekly
      ? vipMonthlyOnly
        ? vipWeekly.monthlyPlanLimit
        : vipWeekly.weeklyVisibleLimit
      : aiLimit;
  const aiAddonRemaining =
    tier === "vip" && vipWeekly
      ? vipMonthlyOnly
        ? vipWeekly.monthlyExtraRemaining
        : vipWeekly.monthlyVisibleRemaining
      : addon.feedbackRemaining;
  const aiTotalRemaining =
    tier === "vip" && vipWeekly
      ? vipWeekly.remaining
      : aiPlanRemaining + addon.feedbackRemaining;
  const aiTotalLimit =
    tier === "vip" && vipWeekly
      ? vipMonthlyOnly
        ? vipWeekly.monthlyPlanLimit + vipWeekly.monthlyExtraRemaining
        : vipWeekly.weeklyVisibleLimit + vipWeekly.monthlyVisibleRemaining
      : aiPlanLimitDisplay + addon.feedbackRemaining;
  const mockUsed = countBillableMockFixedSessions((sessions ?? []) as Array<{ targets?: unknown }>);
  const mockLimit = MOCK_TEST_MONTHLY_LIMIT[tier];
  const mockPlanRemaining = isAdmin ? Number.MAX_SAFE_INTEGER : Math.max(0, mockLimit - mockUsed);

  return NextResponse.json({
    tier,
    isAdmin,
    expiresAt: (profile?.tier_expires_at as string | null) ?? null,
    ai: {
      mode:
        tier === "vip" && vipWeekly
          ? vipMonthlyOnly
            ? "monthly_override"
            : "weekly"
          : "monthly_standard",
      used: aiUsedDisplay,
      planLimit: aiPlanLimitDisplay,
      planRemaining: aiPlanRemaining,
      addonRemaining: aiAddonRemaining,
      totalRemaining: aiTotalRemaining,
      totalLimit: aiTotalLimit,
      weeklyUsed:
        tier === "vip" && vipWeekly && !vipMonthlyOnly ? vipWeekly.used : null,
      weeklyLimit:
        tier === "vip" && vipWeekly && !vipMonthlyOnly
          ? vipWeekly.weeklyVisibleLimit
          : null,
      weeklyRemaining:
        tier === "vip" && vipWeekly && !vipMonthlyOnly
          ? vipWeekly.weeklyVisibleRemaining
          : null,
      weeklyRenewsAt:
        tier === "vip" && vipWeekly && !vipMonthlyOnly ? vipWeekly.renewsAt : null,
      monthlyUsed:
        tier === "vip" && vipWeekly && vipMonthlyOnly ? vipWeekly.monthlyPlanUsed : aiUsed,
      monthlyLimit:
        tier === "vip" && vipWeekly && vipMonthlyOnly
          ? vipWeekly.monthlyPlanLimit
          : aiPlanLimitDisplay,
      monthlyPlanRemaining:
        tier === "vip" && vipWeekly && vipMonthlyOnly
          ? vipWeekly.monthlyPlanRemaining
          : aiPlanRemaining,
      monthlyAddonRemaining: aiAddonRemaining,
      monthlyRemaining:
        tier === "vip" && vipWeekly
          ? vipMonthlyOnly
            ? vipWeekly.remaining
            : vipWeekly.monthlyVisibleRemaining
          : aiPlanRemaining + addon.feedbackRemaining,
      monthlyRenewsAt:
        tier === "vip" && vipWeekly && vipMonthlyOnly
          ? vipWeekly.monthlyPlanRenewsAt
          : ((profile?.tier_expires_at as string | null) ?? null),
      extraExpiry: tier === "vip" && vipWeekly ? vipWeekly.monthlyExtraExpiresAt : null,
    },
    vipWeekly: vipWeekly
      ? {
          mode: vipWeekly.mode,
          used: vipWeekly.used,
          baseLimit: vipWeekly.baseLimit,
          baseRemaining: vipWeekly.baseRemaining,
          weeklyExtraRemaining: vipWeekly.weeklyExtraRemaining,
          monthlyExtraRemaining: vipWeekly.monthlyExtraRemaining,
          weeklyVisibleRemaining: vipWeekly.weeklyVisibleRemaining,
          weeklyVisibleLimit: vipWeekly.weeklyVisibleLimit,
          monthlyVisibleRemaining: vipWeekly.monthlyVisibleRemaining,
          weeklyOverrideActive: vipWeekly.weeklyOverrideActive,
          monthlyOverrideActive: vipWeekly.monthlyOverrideActive,
          extraLimit: vipWeekly.extraLimit,
          totalLimit: vipWeekly.totalLimit,
          remaining: vipWeekly.remaining,
          renewsAt: vipWeekly.renewsAt,
          extraExpiresAt: vipWeekly.extraExpiresAt,
          monthlyExtraExpiresAt: vipWeekly.monthlyExtraExpiresAt,
          monthlyPlanUsed: vipWeekly.monthlyPlanUsed,
        }
      : null,
    mock: {
      used: mockUsed,
      planLimit: mockLimit,
      planRemaining: mockPlanRemaining,
      addonRemaining: addon.mockRemaining,
      totalRemaining: mockPlanRemaining + addon.mockRemaining,
    },
  });
}
