import { NextResponse } from "next/server";

import { AI_MONTHLY_LIMIT, MOCK_TEST_MONTHLY_LIMIT } from "@/lib/access-control";
import { getAddonBalancesForUser } from "@/lib/addon-credits";
import { mockFixedMonthStartIso, countBillableMockFixedSessions } from "@/lib/mock-test/mock-fixed-quota";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

function normalizeTier(raw: unknown) {
  return raw === "basic" || raw === "premium" || raw === "vip" ? raw : "free";
}

export async function GET() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile }, { data: sessions }, addon] = await Promise.all([
    supabase
      .from("profiles")
      .select("tier, tier_expires_at, ai_credits_used")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("mock_fixed_sessions")
      .select("targets")
      .eq("user_id", user.id)
      .gte("started_at", mockFixedMonthStartIso()),
    getAddonBalancesForUser(user.id),
  ]);

  const tier = normalizeTier(profile?.tier);
  const aiUsed = Math.max(0, Number(profile?.ai_credits_used ?? 0));
  const aiLimit = AI_MONTHLY_LIMIT[tier];
  const aiPlanRemaining = Math.max(0, aiLimit - aiUsed);
  const mockUsed = countBillableMockFixedSessions((sessions ?? []) as Array<{ targets?: unknown }>);
  const mockLimit = MOCK_TEST_MONTHLY_LIMIT[tier];
  const mockPlanRemaining = Math.max(0, mockLimit - mockUsed);

  return NextResponse.json({
    tier,
    expiresAt: (profile?.tier_expires_at as string | null) ?? null,
    ai: {
      used: aiUsed,
      planLimit: aiLimit,
      planRemaining: aiPlanRemaining,
      addonRemaining: addon.feedbackRemaining,
      totalRemaining: aiPlanRemaining + addon.feedbackRemaining,
    },
    mock: {
      used: mockUsed,
      planLimit: mockLimit,
      planRemaining: mockPlanRemaining,
      addonRemaining: addon.mockRemaining,
      totalRemaining: mockPlanRemaining + addon.mockRemaining,
    },
  });
}
