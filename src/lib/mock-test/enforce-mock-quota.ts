import { MOCK_TEST_MONTHLY_LIMIT, type Tier } from "@/lib/access-control";
import { consumeAddonCreditsForUser, getAddonBalancesForUser } from "@/lib/addon-credits";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import {
  countBillableMockFixedSessions,
  mockFixedMonthStartIso,
} from "@/lib/mock-test/mock-fixed-quota";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MockQuotaResult =
  | { ok: true; tier: Tier; billableUsed: number; addonConsumed: boolean }
  | { ok: false; status: number; error: string };

/**
 * Counts a user's billable mock attempts across BOTH the fixed and legacy session
 * tables for the current calendar month, enforces the tier monthly cap, and
 * falls back to add-on mock credits. Skips entirely for admins.
 */
export async function enforceMockMonthlyLimit(args: {
  supabase: SupabaseClient;
  userId: string;
  isAdmin: boolean;
  profile: {
    tier: string | null | undefined;
    tier_expires_at: string | null | undefined;
    vip_granted_by_course: boolean | null | undefined;
  } | null;
}): Promise<MockQuotaResult> {
  const { supabase, userId, isAdmin, profile } = args;
  const tier = resolveEffectiveTierFromProfile({
    tier: profile?.tier ?? null,
    tier_expires_at: profile?.tier_expires_at ?? null,
    vip_granted_by_course: profile?.vip_granted_by_course === true,
  });

  if (isAdmin) {
    return { ok: true, tier, billableUsed: 0, addonConsumed: false };
  }

  const monthStart = mockFixedMonthStartIso();
  const [fixed, legacy] = await Promise.all([
    supabase
      .from("mock_fixed_sessions")
      .select("targets")
      .eq("user_id", userId)
      .gte("started_at", monthStart),
    supabase
      .from("mock_test_sessions")
      .select("id")
      .eq("user_id", userId)
      .gte("started_at", monthStart),
  ]);

  const billableUsed =
    countBillableMockFixedSessions(fixed.data as Array<{ targets?: unknown }> | null) +
    ((legacy.data as Array<unknown> | null)?.length ?? 0);

  const monthlyLimit = MOCK_TEST_MONTHLY_LIMIT[tier];
  const planHasMocks = Number.isFinite(monthlyLimit) && monthlyLimit > 0;
  const overPlanLimit = planHasMocks && billableUsed >= monthlyLimit;
  const needsAddon = !planHasMocks || overPlanLimit;

  if (needsAddon) {
    const balances = await getAddonBalancesForUser(userId);
    if (balances.mockRemaining <= 0) {
      return {
        ok: false,
        status: 403,
        error: planHasMocks
          ? `Monthly mock test limit reached for ${tier} plan`
          : "Your plan does not include mock tests",
      };
    }
    const consumed = await consumeAddonCreditsForUser(userId, "mock", 1);
    if (!consumed.ok) {
      return {
        ok: false,
        status: 403,
        error: "No extra mock add-on credit available",
      };
    }
    return { ok: true, tier, billableUsed, addonConsumed: true };
  }

  return { ok: true, tier, billableUsed, addonConsumed: false };
}
