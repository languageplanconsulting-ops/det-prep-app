import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { fetchRevenueAnalytics } from "@/lib/admin-subscription-data";

type TierKey = "free" | "basic" | "premium" | "vip";

type TopCostUser = {
  userId: string;
  email: string;
  fullName: string | null;
  totalThb: number;
  events: number;
};

type ConversionPoint = {
  month: string;
  total: number;
  paid: number;
  free: number;
  conversionPct: number;
};

export async function fetchExecutiveSummary() {
  const supabase = createServiceRoleSupabase();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = monthStart;
  const last30 = new Date(now.getTime() - 30 * 86400 * 1000);

  const [profilesRes, paymentsRes, churnRes, apiUsageRes, studyRes, revenue] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, tier, tier_expires_at, vip_granted_by_course, created_at"),
      supabase
        .from("payment_history")
        .select("user_id, amount, status, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("admin_actions")
        .select("created_at")
        .or("action.eq.revoke_access,action.eq.stripe_subscription_cancelled,action.eq.stripe_subscription_deleted")
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("api_usage_logs")
        .select("user_id, cost_thb, created_at")
        .gte("created_at", last30.toISOString()),
      supabase
        .from("study_sessions")
        .select("user_id, started_at, completed")
        .gte("started_at", last30.toISOString()),
      fetchRevenueAnalytics(),
    ]);

  const profiles = (profilesRes.data ?? []) as Record<string, unknown>[];
  const payments = (paymentsRes.data ?? []) as Record<string, unknown>[];
  const churnRows = (churnRes.data ?? []) as Record<string, unknown>[];
  const apiUsageRows = (apiUsageRes.data ?? []) as Record<string, unknown>[];
  const studyRows = (studyRes.data ?? []) as Record<string, unknown>[];

  const tierCounts: Record<TierKey, number> = {
    free: 0,
    basic: 0,
    premium: 0,
    vip: 0,
  };
  let activePaid = 0;

  for (const row of profiles) {
    const tier = normalizeTier(row.tier);
    const active = isPaidActive(row);
    if (active && tier !== "free") {
      activePaid += 1;
      tierCounts[tier] += 1;
    } else if (tier === "free") {
      tierCounts.free += 1;
    } else {
      tierCounts.free += 1;
    }
  }

  const totalUsers = profiles.length;
  const freeUsers = tierCounts.free;
  const paidConversionPct =
    totalUsers > 0 ? round1((activePaid / totalUsers) * 100) : 0;

  let mrrThis = 0;
  let mrrPrev = 0;
  for (const payment of payments) {
    if (payment.status !== "succeeded") continue;
    const amount = Number(payment.amount) || 0;
    const created = new Date(String(payment.created_at ?? ""));
    if (created >= monthStart) {
      mrrThis += amount;
    } else if (created >= prevMonthStart && created < prevMonthEnd) {
      mrrPrev += amount;
    }
  }

  const mrrDeltaSatang = mrrThis - mrrPrev;
  const mrrDeltaPct = mrrPrev > 0 ? round1((mrrDeltaSatang / mrrPrev) * 100) : 0;
  const arrSatang = mrrThis * 12;
  const churnThisMonth = churnRows.length;
  const churnRatePct = activePaid > 0 ? round1((churnThisMonth / activePaid) * 100) : 0;

  const apiByUser = new Map<string, { totalThb: number; events: number }>();
  let aiCostThb30d = 0;
  for (const row of apiUsageRows) {
    const userId =
      typeof row.user_id === "string" && row.user_id.trim() ? row.user_id : null;
    const costThb = Number(row.cost_thb) || 0;
    aiCostThb30d += costThb;
    if (!userId) continue;
    const current = apiByUser.get(userId) ?? { totalThb: 0, events: 0 };
    current.totalThb += costThb;
    current.events += 1;
    apiByUser.set(userId, current);
  }

  const activeLearners30d = new Set(
    studyRows
      .map((row) => (typeof row.user_id === "string" ? row.user_id : ""))
      .filter(Boolean),
  ).size;
  const completedAttempts30d = studyRows.filter((row) => row.completed === true).length;
  const aiCostPerActiveLearnerThb =
    activeLearners30d > 0 ? round2(aiCostThb30d / activeLearners30d) : 0;
  const aiCostPerPaidUserThb = activePaid > 0 ? round2(aiCostThb30d / activePaid) : 0;
  const estimatedNetThb30d = round2(mrrThis / 100 - aiCostThb30d);

  const topCostUsers: TopCostUser[] = profiles
    .map((profile) => {
      const id = String(profile.id ?? "");
      const cost = apiByUser.get(id);
      if (!cost) return null;
      return {
        userId: id,
        email: String(profile.email ?? `${id.slice(0, 8)}…`),
        fullName: typeof profile.full_name === "string" ? profile.full_name : null,
        totalThb: round2(cost.totalThb),
        events: cost.events,
      };
    })
    .filter((row): row is TopCostUser => Boolean(row))
    .sort((a, b) => b.totalThb - a.totalThb)
    .slice(0, 5);

  const conversionsByMonth = buildMonthlyConversionSeries(profiles);

  return {
    snapshot: {
      totalUsers,
      freeUsers,
      activePaid,
      paidConversionPct,
      mrrSatang: mrrThis,
      arrSatang,
      mrrDeltaSatang,
      mrrDeltaPct,
      churnThisMonth,
      churnRatePct,
      aiCostThb30d: round2(aiCostThb30d),
      aiCostPerActiveLearnerThb,
      aiCostPerPaidUserThb,
      activeLearners30d,
      completedAttempts30d,
      estimatedNetThb30d,
      arpuSatang: Number(revenue.arpuSatang ?? 0),
      newSubscribersThisMonth: Number(revenue.newSubscribersThisMonth ?? 0),
    },
    tierCounts,
    charts: {
      monthlyRevenue: revenue.monthlyBars ?? [],
      subscriberGrowth: revenue.subscriberGrowth ?? [],
      churnVsNew: revenue.churnVsNew ?? [],
      conversionsByMonth,
    },
    topCostUsers,
  };
}

function normalizeTier(value: unknown): TierKey {
  if (value === "basic" || value === "premium" || value === "vip") return value;
  return "free";
}

function isPaidActive(row: Record<string, unknown>): boolean {
  const tier = normalizeTier(row.tier);
  if (tier === "free") return false;
  if (tier === "vip" && row.vip_granted_by_course === true && !row.tier_expires_at) {
    return true;
  }
  if (!row.tier_expires_at || typeof row.tier_expires_at !== "string") {
    return false;
  }
  return new Date(row.tier_expires_at) > new Date();
}

function buildMonthlyConversionSeries(
  profiles: Record<string, unknown>[],
): ConversionPoint[] {
  const buckets = new Map<string, { total: number; paid: number; free: number }>();

  for (const row of profiles) {
    const createdAt =
      typeof row.created_at === "string" && row.created_at ? new Date(row.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key) ?? { total: 0, paid: 0, free: 0 };
    bucket.total += 1;
    if (normalizeTier(row.tier) === "free") bucket.free += 1;
    else bucket.paid += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, bucket]) => ({
      month,
      total: bucket.total,
      paid: bucket.paid,
      free: bucket.free,
      conversionPct: bucket.total > 0 ? round1((bucket.paid / bucket.total) * 100) : 0,
    }));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
