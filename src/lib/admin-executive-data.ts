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

type CohortRetentionPoint = {
  cohort: string;
  signups: number;
  retained7d: number;
  retained7dPct: number;
  retained30d: number;
  retained30dPct: number;
};

type FunnelStep = {
  label: string;
  value: number;
  note: string;
};

type RiskUser = {
  userId: string;
  email: string;
  fullName: string | null;
  tier: string;
  expiryAt: string | null;
  lastActiveAt: string | null;
  studySessions30d: number;
  aiCostThb30d: number;
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
        .select("user_id, started_at, completed"),
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

  const studyByUser = new Map<
    string,
    { sessions30d: number; lastActiveAt: string | null; dates: Date[] }
  >();
  for (const row of studyRows) {
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    const startedAt = typeof row.started_at === "string" ? row.started_at : null;
    if (!userId || !startedAt) continue;
    const startedDate = new Date(startedAt);
    if (Number.isNaN(startedDate.getTime())) continue;
    const current = studyByUser.get(userId) ?? {
      sessions30d: 0,
      lastActiveAt: null,
      dates: [],
    };
    if (startedDate >= last30) {
      current.sessions30d += 1;
    }
    if (!current.lastActiveAt || startedDate > new Date(current.lastActiveAt)) {
      current.lastActiveAt = startedAt;
    }
    current.dates.push(startedDate);
    studyByUser.set(userId, current);
  }

  const activeLearners30d = new Set(
    [...studyByUser.entries()]
      .filter(([, value]) => value.sessions30d > 0)
      .map(([userId]) => userId),
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
  const cohortRetention = buildCohortRetentionSeries(profiles, studyByUser, now);
  const funnel = buildUpgradeFunnel(profiles, payments, studyByUser);
  const atRisk = buildAtRiskGroups(profiles, studyByUser, apiByUser, now);

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
      cohortRetention,
    },
    funnel,
    atRisk,
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

function buildCohortRetentionSeries(
  profiles: Record<string, unknown>[],
  studyByUser: Map<string, { sessions30d: number; lastActiveAt: string | null; dates: Date[] }>,
  now: Date,
): CohortRetentionPoint[] {
  const cohorts = new Map<string, { signups: number; retained7d: number; retained30d: number }>();

  for (const row of profiles) {
    const id = typeof row.id === "string" ? row.id : "";
    const createdAt =
      typeof row.created_at === "string" && row.created_at ? new Date(row.created_at) : null;
    if (!id || !createdAt || Number.isNaN(createdAt.getTime())) continue;
    const cohort = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = cohorts.get(cohort) ?? { signups: 0, retained7d: 0, retained30d: 0 };
    bucket.signups += 1;

    const study = studyByUser.get(id);
    if (study) {
      const sevenDayCutoff = new Date(createdAt.getTime() + 7 * 86400 * 1000);
      const thirtyDayCutoff = new Date(createdAt.getTime() + 30 * 86400 * 1000);
      if (
        sevenDayCutoff <= now &&
        study.dates.some((date) => date >= createdAt && date <= sevenDayCutoff)
      ) {
        bucket.retained7d += 1;
      }
      if (
        thirtyDayCutoff <= now &&
        study.dates.some((date) => date >= createdAt && date <= thirtyDayCutoff)
      ) {
        bucket.retained30d += 1;
      }
    }

    cohorts.set(cohort, bucket);
  }

  return [...cohorts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([cohort, bucket]) => ({
      cohort,
      signups: bucket.signups,
      retained7d: bucket.retained7d,
      retained7dPct: bucket.signups > 0 ? round1((bucket.retained7d / bucket.signups) * 100) : 0,
      retained30d: bucket.retained30d,
      retained30dPct:
        bucket.signups > 0 ? round1((bucket.retained30d / bucket.signups) * 100) : 0,
    }));
}

function buildUpgradeFunnel(
  profiles: Record<string, unknown>[],
  payments: Record<string, unknown>[],
  studyByUser: Map<string, { sessions30d: number; lastActiveAt: string | null; dates: Date[] }>,
): FunnelStep[] {
  const totalSignups = profiles.length;
  const everPaidUsers = new Set(
    payments
      .filter((payment) => payment.status === "succeeded" && typeof payment.user_id === "string")
      .map((payment) => String(payment.user_id)),
  );
  const freeUsers = profiles.filter((row) => normalizeTier(row.tier) === "free");
  const activeFreeUsers30d = freeUsers.filter((row) => {
    const id = typeof row.id === "string" ? row.id : "";
    return id ? (studyByUser.get(id)?.sessions30d ?? 0) > 0 : false;
  });
  const seriousFreeUsers30d = freeUsers.filter((row) => {
    const id = typeof row.id === "string" ? row.id : "";
    return id ? (studyByUser.get(id)?.sessions30d ?? 0) >= 5 : false;
  });
  const currentPaid = profiles.filter((row) => isPaidActive(row)).length;

  return [
    { label: "Total signups", value: totalSignups, note: "All registered accounts" },
    {
      label: "Current free users",
      value: freeUsers.length,
      note: "Not on an active paid plan",
    },
    {
      label: "Active free users (30d)",
      value: activeFreeUsers30d.length,
      note: "Free users still studying this month",
    },
    {
      label: "Heavy free users (30d)",
      value: seriousFreeUsers30d.length,
      note: "Free users with 5+ sessions in 30 days",
    },
    {
      label: "Ever paid users",
      value: everPaidUsers.size,
      note: "At least one succeeded payment",
    },
    {
      label: "Current active paid",
      value: currentPaid,
      note: "Active basic / premium / vip users",
    },
  ];
}

function buildAtRiskGroups(
  profiles: Record<string, unknown>[],
  studyByUser: Map<string, { sessions30d: number; lastActiveAt: string | null; dates: Date[] }>,
  apiByUser: Map<string, { totalThb: number; events: number }>,
  now: Date,
) {
  const nearExpiry: RiskUser[] = [];
  const heavyFree: RiskUser[] = [];
  const inactivePaid: RiskUser[] = [];

  for (const row of profiles) {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) continue;
    const tier = normalizeTier(row.tier);
    const study = studyByUser.get(id);
    const api = apiByUser.get(id);
    const riskUser: RiskUser = {
      userId: id,
      email: String(row.email ?? `${id.slice(0, 8)}…`),
      fullName: typeof row.full_name === "string" ? row.full_name : null,
      tier,
      expiryAt: typeof row.tier_expires_at === "string" ? row.tier_expires_at : null,
      lastActiveAt: study?.lastActiveAt ?? null,
      studySessions30d: study?.sessions30d ?? 0,
      aiCostThb30d: round2(api?.totalThb ?? 0),
    };

    if (isPaidActive(row) && riskUser.expiryAt) {
      const expiry = new Date(riskUser.expiryAt);
      const days = (expiry.getTime() - now.getTime()) / (86400 * 1000);
      if (days >= 0 && days <= 7) {
        nearExpiry.push(riskUser);
      }
    }

    if (
      tier === "free" &&
      (riskUser.studySessions30d >= 5 || riskUser.aiCostThb30d >= 15)
    ) {
      heavyFree.push(riskUser);
    }

    if (isPaidActive(row)) {
      const lastActive = riskUser.lastActiveAt ? new Date(riskUser.lastActiveAt) : null;
      const inactiveDays = lastActive
        ? (now.getTime() - lastActive.getTime()) / (86400 * 1000)
        : Infinity;
      if (inactiveDays > 7) {
        inactivePaid.push(riskUser);
      }
    }
  }

  nearExpiry.sort((a, b) => (a.expiryAt ?? "").localeCompare(b.expiryAt ?? ""));
  heavyFree.sort((a, b) => {
    if (b.studySessions30d !== a.studySessions30d) {
      return b.studySessions30d - a.studySessions30d;
    }
    return b.aiCostThb30d - a.aiCostThb30d;
  });
  inactivePaid.sort((a, b) => (a.lastActiveAt ?? "").localeCompare(b.lastActiveAt ?? ""));

  return {
    nearExpiry: nearExpiry.slice(0, 8),
    heavyFree: heavyFree.slice(0, 8),
    inactivePaid: inactivePaid.slice(0, 8),
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
