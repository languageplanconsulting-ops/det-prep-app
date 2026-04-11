import "server-only";

import { formatBahtFromSatang as formatSatang } from "@/lib/money-format";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export const TIER_MONTHLY_THB: Record<string, number> = {
  free: 0,
  basic: 299,
  premium: 699,
  vip: 999,
};

export type DerivedStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "trial"
  | "free_trial";

export function deriveSubscriptionStatus(p: {
  tier: string | null;
  tier_expires_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  vip_granted_by_course: boolean | null;
}): DerivedStatus {
  const tier = p.tier ?? "free";
  const exp = p.tier_expires_at ? new Date(p.tier_expires_at) : null;
  const now = new Date();

  if (tier === "vip" && p.vip_granted_by_course && !p.tier_expires_at) {
    return "active";
  }

  if (tier !== "free" && exp) {
    if (exp > now) return "active";
    return "expired";
  }

  if (tier === "free" && p.stripe_customer_id && !p.stripe_subscription_id) {
    return "cancelled";
  }

  if (tier === "free" && !p.stripe_customer_id) {
    return "free_trial";
  }

  if (tier !== "free" && !exp) {
    return p.stripe_subscription_id ? "active" : "active";
  }

  return "trial";
}

export type PaymentKind = "stripe" | "course_grant" | "manual" | "none";

export function derivePaymentKind(p: {
  tier: string | null;
  stripe_subscription_id: string | null;
  vip_granted_by_course: boolean | null;
}): PaymentKind {
  if (p.stripe_subscription_id) return "stripe";
  if (p.vip_granted_by_course) return "course_grant";
  const t = p.tier ?? "free";
  if (t !== "free") return "manual";
  return "none";
}

export const formatBahtFromSatang = formatSatang;

export type SubscriptionListItem = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tier: string;
  tier_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  vip_granted_by_course: boolean;
  created_at: string | null;
  derivedStatus: DerivedStatus;
  paymentKind: PaymentKind;
  totalPaidSatang: number;
  monthlyLabel: string;
  subscriptionStart: string | null;
  sessionCount: number;
  lastActiveAt: string | null;
  mockTestCount: number;
};

export function daysAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (86400 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function sortProfileRows(
  rows: Record<string, unknown>[],
  sort: string,
): void {
  const cmp = (a: Record<string, unknown>, b: Record<string, unknown>) => {
    if (sort === "newest") {
      return (
        new Date((b.created_at as string) ?? 0).getTime() -
        new Date((a.created_at as string) ?? 0).getTime()
      );
    }
    if (sort === "oldest") {
      return (
        new Date((a.created_at as string) ?? 0).getTime() -
        new Date((b.created_at as string) ?? 0).getTime()
      );
    }
    if (sort === "name") {
      const na = ((a.full_name as string) ?? a.email ?? "").toString();
      const nb = ((b.full_name as string) ?? b.email ?? "").toString();
      return na.localeCompare(nb);
    }
    if (sort === "tier") {
      return ((a.tier as string) ?? "").localeCompare((b.tier as string) ?? "");
    }
    if (sort === "expiry") {
      const ea = a.tier_expires_at
        ? new Date(a.tier_expires_at as string).getTime()
        : Number.MAX_SAFE_INTEGER;
      const eb = b.tier_expires_at
        ? new Date(b.tier_expires_at as string).getTime()
        : Number.MAX_SAFE_INTEGER;
      return ea - eb;
    }
    return 0;
  };
  rows.sort(cmp);
}

export async function fetchSubscriptionList(params: {
  page: number;
  limit: number;
  search?: string;
  tier?: string;
  status?: string;
  payment?: string;
  sort?: string;
}): Promise<{
  rows: SubscriptionListItem[];
  total: number;
  stats: {
    totalUsers: number;
    activePaid: number;
    tierBreakdown: { basic: number; premium: number; vip: number };
    mrrSatang: number;
    churnedThisMonth: number;
  };
}> {
  const supabase = createServiceRoleSupabase();
  const pageSize = Math.min(Math.max(params.limit, 1), 100);
  const page = Math.max(params.page, 1);

  let q = supabase.from("profiles").select("*");

  const search = params.search?.trim();
  if (search) {
    if (/^[0-9a-f-]{36}$/i.test(search)) {
      q = q.eq("id", search);
    } else {
      q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
  }

  if (params.tier && params.tier !== "all") {
    q = q.eq("tier", params.tier);
  }

  const { data: rawRows, error } = await q;
  if (error) {
    console.error("[admin-subscription-data] list", error.message);
    return {
      rows: [],
      total: 0,
      stats: {
        totalUsers: 0,
        activePaid: 0,
        tierBreakdown: { basic: 0, premium: 0, vip: 0 },
        mrrSatang: 0,
        churnedThisMonth: 0,
      },
    };
  }

  let rows = (rawRows ?? []) as Record<string, unknown>[];

  rows = rows.filter((r) => {
    const p = rowToProfile(r);
    const st = deriveSubscriptionStatus(p);
    const pk = derivePaymentKind(p);

    if (params.status && params.status !== "all") {
      if (params.status === "active" && st !== "active") return false;
      if (params.status === "expired" && st !== "expired") return false;
      if (params.status === "cancelled" && st !== "cancelled") return false;
      if (params.status === "vip_course" && !p.vip_granted_by_course)
        return false;
      if (
        params.status === "trial" &&
        st !== "free_trial" &&
        st !== "trial"
      ) {
        return false;
      }
    }

    if (params.payment && params.payment !== "all") {
      if (params.payment === "stripe" && pk !== "stripe") return false;
      if (params.payment === "manual" && pk !== "manual") return false;
      if (params.payment === "course_grant" && pk !== "course_grant")
        return false;
    }

    return true;
  });

  const sort = params.sort ?? "newest";
  sortProfileRows(rows, sort);

  const total = rows.length;
  const from = (page - 1) * pageSize;
  const pageRows = rows.slice(from, from + pageSize);

  const ids = pageRows.map((r) => r.id as string);

  const sessionAgg = await aggregateSessionsForUsers(ids);
  const paymentAgg = await aggregatePaymentsForUsers(ids);
  const mockAgg = await aggregateMockTestsForUsers(ids);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: allForStats } = await supabase.from("profiles").select("*");
  const profilesAll = (allForStats ?? []) as Record<string, unknown>[];

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  let activePaid = 0;
  const tierBreakdown = { basic: 0, premium: 0, vip: 0 };
  let mrrSatang = 0;

  for (const r of profilesAll) {
    const p = rowToProfile(r);
    const st = deriveSubscriptionStatus(p);
    const t = p.tier ?? "free";
    if (st === "active" && t !== "free") {
      activePaid += 1;
      if (t === "basic") tierBreakdown.basic += 1;
      if (t === "premium") tierBreakdown.premium += 1;
      if (t === "vip") tierBreakdown.vip += 1;
      mrrSatang += (TIER_MONTHLY_THB[t] ?? 0) * 100;
    }
  }

  const { data: churnActions } = await supabase
    .from("admin_actions")
    .select("id")
    .gte("created_at", monthStart.toISOString())
    .or("action.eq.revoke_access,action.eq.stripe_subscription_deleted");

  const churnedThisMonth = (churnActions ?? []).length;

  const listItems: SubscriptionListItem[] = pageRows.map((r) => {
    const id = r.id as string;
    const p = rowToProfile(r);
    const st = deriveSubscriptionStatus(p);
    const pk = derivePaymentKind(p);
    const totalSat = paymentAgg.totalPaid.get(id) ?? 0;
    const tier = (r.tier as string) ?? "free";
    const monthlyThb = TIER_MONTHLY_THB[tier] ?? 0;
    const monthlyLabel =
      tier === "free"
        ? "—"
        : `฿${monthlyThb.toLocaleString("en-TH")}/mo`;

    return {
      id,
      email: (r.email as string) ?? "",
      full_name: (r.full_name as string | null) ?? null,
      avatar_url: (r.avatar_url as string | null) ?? null,
      tier,
      tier_expires_at: (r.tier_expires_at as string | null) ?? null,
      stripe_customer_id: (r.stripe_customer_id as string | null) ?? null,
      stripe_subscription_id:
        (r.stripe_subscription_id as string | null) ?? null,
      vip_granted_by_course: r.vip_granted_by_course === true,
      created_at: (r.created_at as string | null) ?? null,
      derivedStatus: st,
      paymentKind: pk,
      totalPaidSatang: totalSat,
      monthlyLabel,
      subscriptionStart: (r.created_at as string | null) ?? null,
      sessionCount: sessionAgg.counts.get(id) ?? 0,
      lastActiveAt: sessionAgg.lastActive.get(id) ?? null,
      mockTestCount: mockAgg.get(id) ?? 0,
    };
  });

  return {
    rows: listItems,
    total,
    stats: {
      totalUsers: totalUsers ?? 0,
      activePaid,
      tierBreakdown,
      mrrSatang,
      churnedThisMonth,
    },
  };
}

function rowToProfile(r: Record<string, unknown>) {
  return {
    tier: (r.tier as string | null) ?? "free",
    tier_expires_at: (r.tier_expires_at as string | null) ?? null,
    stripe_subscription_id: (r.stripe_subscription_id as string | null) ?? null,
    stripe_customer_id: (r.stripe_customer_id as string | null) ?? null,
    vip_granted_by_course: r.vip_granted_by_course === true,
    created_at: (r.created_at as string | null) ?? null,
  };
}

async function aggregateSessionsForUsers(ids: string[]) {
  const counts = new Map<string, number>();
  const lastActive = new Map<string, string>();
  if (ids.length === 0) return { counts, lastActive };

  const supabase = createServiceRoleSupabase();
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("user_id, started_at, completed")
    .in("user_id", ids);

  for (const s of sessions ?? []) {
    const uid = s.user_id as string;
    if (s.completed) {
      counts.set(uid, (counts.get(uid) ?? 0) + 1);
    }
    const st = s.started_at as string;
    const prev = lastActive.get(uid);
    if (!prev || new Date(st) > new Date(prev)) {
      lastActive.set(uid, st);
    }
  }

  return { counts, lastActive };
}

async function aggregatePaymentsForUsers(ids: string[]) {
  const totalPaid = new Map<string, number>();
  if (ids.length === 0) return { totalPaid };

  const supabase = createServiceRoleSupabase();
  const { data: pays } = await supabase
    .from("payment_history")
    .select("user_id, amount, status")
    .in("user_id", ids);

  for (const p of pays ?? []) {
    if (p.status !== "succeeded" && p.status !== "refunded") continue;
    const uid = p.user_id as string;
    const amt = (p.amount as number) ?? 0;
    if (p.status === "refunded") {
      totalPaid.set(uid, (totalPaid.get(uid) ?? 0) - Math.abs(amt));
    } else {
      totalPaid.set(uid, (totalPaid.get(uid) ?? 0) + amt);
    }
  }

  return { totalPaid };
}

async function aggregateMockTestsForUsers(ids: string[]) {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;

  const supabase = createServiceRoleSupabase();
  const { data: rows } = await supabase
    .from("mock_test_results")
    .select("user_id")
    .in("user_id", ids);

  for (const r of rows ?? []) {
    const uid = r.user_id as string;
    map.set(uid, (map.get(uid) ?? 0) + 1);
  }
  return map;
}

export async function fetchUserSubscriptionDetail(userId: string) {
  const supabase = createServiceRoleSupabase();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return null;

  const [
    { data: payments },
    { data: notes },
    { data: actions },
    { data: sessions },
    { data: mockResults },
    { data: notebookEntries },
    { data: notebookSync },
  ] = await Promise.all([
    supabase
      .from("payment_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("subscription_notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_actions")
      .select("*")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("study_sessions")
      .select(
        "id, skill, exercise_type, difficulty, score, duration_seconds, started_at, ended_at, completed",
      )
      .eq("user_id", userId),
    supabase
      .from("mock_test_results")
      .select(
        "id, session_id, overall_score, literacy_score, comprehension_score, conversation_score, production_score, duration_seconds, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("notebook_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("notebook_sync")
      .select("id, client_entry_id, payload, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(400),
  ]);

  const adminIds = [
    ...new Set(
      [
        ...(notes ?? []).map((n) => n.admin_id as string | null),
        ...(actions ?? []).map((a) => a.admin_id as string | null),
      ].filter(Boolean),
    ),
  ] as string[];

  const adminNames = new Map<string, string>();
  if (adminIds.length) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", adminIds);
    for (const a of admins ?? []) {
      adminNames.set(
        a.id as string,
        ((a.full_name as string)?.trim() || (a.email as string)) ?? "",
      );
    }
  }

  const skillSec: Record<string, number> = {};
  let totalSec = 0;
  for (const s of sessions ?? []) {
    const sec = (s.duration_seconds as number) ?? 0;
    totalSec += sec;
    const sk = (s.skill as string) ?? "other";
    skillSec[sk] = (skillSec[sk] ?? 0) + sec;
  }
  let favoriteSkill = "—";
  let favPct = 0;
  for (const [sk, sec] of Object.entries(skillSec)) {
    const pct = totalSec > 0 ? Math.round((sec / totalSec) * 100) : 0;
    if (pct >= favPct) {
      favPct = pct;
      favoriteSkill = sk;
    }
  }

  const weekBuckets = [0, 0, 0, 0];
  const nowMs = Date.now();
  for (const s of sessions ?? []) {
    const t = new Date(s.started_at as string).getTime();
    const ageMs = nowMs - t;
    if (ageMs < 0) continue;
    const weekIdx = Math.floor(ageMs / (7 * 86400 * 1000));
    if (weekIdx >= 0 && weekIdx < 4) {
      const sec = (s.duration_seconds as number) ?? 0;
      weekBuckets[3 - weekIdx] += Math.round(sec / 60);
    }
  }

  const p = profile as Record<string, unknown>;
  const totalPaidSatang = await sumPaymentsForUser(userId);

  return {
    profile: p,
    payments: payments ?? [],
    notes: (notes ?? []).map((n) => ({
      ...n,
      adminName: n.admin_id
        ? adminNames.get(n.admin_id as string) ?? null
        : null,
    })),
    adminActions: (actions ?? []).map((a) => ({
      ...a,
      adminName: a.admin_id
        ? adminNames.get(a.admin_id as string) ?? "System"
        : "System",
    })),
    study: {
      totalMinutes: Math.round(totalSec / 60),
      sessionsCompleted: (sessions ?? []).filter((s) => s.completed).length,
      favoriteSkill,
      favoritePct: favPct,
      weeklyMinutes: [...weekBuckets],
      mockTestsTotal: (mockResults ?? []).length,
    },
    totalPaidSatang,
    notebookEntries: notebookEntries ?? [],
    notebookSync: notebookSync ?? [],
    mockTestScores: mockResults ?? [],
    studySessionScores: [...(sessions ?? [])].sort(
      (a, b) =>
        new Date((b.started_at as string) ?? 0).getTime() -
        new Date((a.started_at as string) ?? 0).getTime(),
    ),
  };
}

async function sumPaymentsForUser(userId: string): Promise<number> {
  const supabase = createServiceRoleSupabase();
  const { data: pays } = await supabase
    .from("payment_history")
    .select("amount, status")
    .eq("user_id", userId);
  let sum = 0;
  for (const p of pays ?? []) {
    const amt = (p.amount as number) ?? 0;
    if (p.status === "succeeded") sum += amt;
    if (p.status === "refunded") sum -= Math.abs(amt);
  }
  return sum;
}

export async function fetchRevenueAnalytics() {
  const supabase = createServiceRoleSupabase();
  const { data: payments } = await supabase
    .from("payment_history")
    .select("amount, status, tier, created_at")
    .order("created_at", { ascending: true });

  const { data: profiles } = await supabase.from("profiles").select("*");

  const monthlyByTier: Record<
    string,
    { basic: number; premium: number; vip: number }
  > = {};

  for (const p of payments ?? []) {
    if (p.status !== "succeeded") continue;
    const d = new Date(p.created_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyByTier[key]) {
      monthlyByTier[key] = { basic: 0, premium: 0, vip: 0 };
    }
    const t = (p.tier as string) ?? "premium";
    const amt = (p.amount as number) ?? 0;
    if (t === "basic") monthlyByTier[key].basic += amt;
    else if (t === "vip") monthlyByTier[key].vip += amt;
    else monthlyByTier[key].premium += amt;
  }

  const last12 = Object.keys(monthlyByTier)
    .sort()
    .slice(-12)
    .map((k) => {
      const m = monthlyByTier[k] ?? { basic: 0, premium: 0, vip: 0 };
      return {
        month: k,
        ...m,
        total: m.basic + m.premium + m.vip,
      };
    });

  const signupsByMonth: Record<
    string,
    { basic: number; premium: number; vip: number; free: number }
  > = {};
  for (const r of profiles ?? []) {
    const d = new Date((r.created_at as string) ?? 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!signupsByMonth[key]) {
      signupsByMonth[key] = { basic: 0, premium: 0, vip: 0, free: 0 };
    }
    const t = (r.tier as string) ?? "free";
    if (t === "basic") signupsByMonth[key].basic += 1;
    else if (t === "premium") signupsByMonth[key].premium += 1;
    else if (t === "vip") signupsByMonth[key].vip += 1;
    else signupsByMonth[key].free += 1;
  }

  const growthLast6 = Object.keys(signupsByMonth)
    .sort()
    .slice(-6)
    .map((k) => ({
      month: k,
      ...signupsByMonth[k],
    }));

  const { data: churnRows } = await supabase
    .from("admin_actions")
    .select("created_at")
    .or("action.eq.revoke_access,action.eq.stripe_subscription_cancelled");

  const churnByMonth: Record<string, number> = {};
  for (const c of churnRows ?? []) {
    const d = new Date(c.created_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    churnByMonth[key] = (churnByMonth[key] ?? 0) + 1;
  }

  const churnVsNew = [
    ...new Set([
      ...Object.keys(signupsByMonth),
      ...Object.keys(churnByMonth),
    ]),
  ]
    .sort()
    .slice(-6)
    .map((k) => ({
      month: k,
      newAccounts:
        (signupsByMonth[k]?.basic ?? 0) +
        (signupsByMonth[k]?.premium ?? 0) +
        (signupsByMonth[k]?.vip ?? 0) +
        (signupsByMonth[k]?.free ?? 0),
      churned: churnByMonth[k] ?? 0,
    }));

  const tierCounts = { basic: 0, premium: 0, vip: 0, free: 0 };
  for (const r of profiles ?? []) {
    const t = (r.tier as string) ?? "free";
    if (t === "basic") tierCounts.basic += 1;
    else if (t === "premium") tierCounts.premium += 1;
    else if (t === "vip") tierCounts.vip += 1;
    else tierCounts.free += 1;
  }

  let totalRevenueSatang = 0;
  for (const p of payments ?? []) {
    if (p.status === "succeeded") totalRevenueSatang += (p.amount as number) ?? 0;
    if (p.status === "refunded")
      totalRevenueSatang -= Math.abs((p.amount as number) ?? 0);
  }

  const paidUsers = tierCounts.basic + tierCounts.premium + tierCounts.vip;
  const arpu =
    paidUsers > 0 ? Math.round(totalRevenueSatang / paidUsers) : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = (profiles ?? []).filter(
    (r) =>
      new Date((r.created_at as string) ?? 0) >= monthStart &&
      (r.tier as string) !== "free",
  ).length;

  return {
    monthlyBars: last12,
    subscriberGrowth: growthLast6,
    churnVsNew,
    tierCounts,
    totalRevenueSatang,
    arpuSatang: arpu,
    newSubscribersThisMonth: newThisMonth,
  };
}

export async function fetchExpiringUsers(
  bucket: "7" | "14" | "expired",
): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleSupabase();
  const { data: profiles } = await supabase.from("profiles").select("*");
  const now = new Date();
  const out: Record<string, unknown>[] = [];

  for (const r of profiles ?? []) {
    const exp = r.tier_expires_at
      ? new Date(r.tier_expires_at as string)
      : null;
    if (!exp) continue;
    const days = (exp.getTime() - now.getTime()) / (86400 * 1000);

    if (bucket === "expired" && days < 0) {
      out.push(r as Record<string, unknown>);
    } else if (bucket === "7" && days >= 0 && days <= 7) {
      out.push(r as Record<string, unknown>);
    } else if (bucket === "14" && days > 7 && days <= 14) {
      out.push(r as Record<string, unknown>);
    }
  }

  return out;
}

export async function buildExportRows(
  type:
    | "all"
    | "paid"
    | "expiring7"
    | "expiring30"
    | "inactive"
    | "vip_course",
) {
  const supabase = createServiceRoleSupabase();
  const { data: profiles } = await supabase.from("profiles").select("*");
  const now = new Date();
  const rows = (profiles ?? []) as Record<string, unknown>[];
  const ids = rows.map((r) => r.id as string);
  const sessionAgg = await aggregateSessionsForUsers(ids);
  const paymentAgg = await aggregatePaymentsForUsers(ids);
  const mockAgg = await aggregateMockTestsForUsers(ids);

  const filtered = rows.filter((r) => {
    const exp = r.tier_expires_at
      ? new Date(r.tier_expires_at as string)
      : null;
    const daysToExp = exp
      ? (exp.getTime() - now.getTime()) / (86400 * 1000)
      : null;
    const last = sessionAgg.lastActive.get(r.id as string);
    const inactiveDays = last
      ? (now.getTime() - new Date(last).getTime()) / (86400 * 1000)
      : 9999;

    if (type === "paid") return (r.tier as string) !== "free";
    if (type === "vip_course") return r.vip_granted_by_course === true;
    if (type === "expiring7")
      return daysToExp !== null && daysToExp >= 0 && daysToExp <= 7;
    if (type === "expiring30")
      return daysToExp !== null && daysToExp >= 0 && daysToExp <= 30;
    if (type === "inactive") return inactiveDays >= 14;
    return true;
  });

  return filtered.map((r) => {
    const id = r.id as string;
    return {
      name: (r.full_name as string) ?? "",
      email: (r.email as string) ?? "",
      tier: (r.tier as string) ?? "",
      status: deriveSubscriptionStatus(rowToProfile(r)),
      start_date: (r.created_at as string) ?? "",
      expiry_date: (r.tier_expires_at as string) ?? "",
      total_paid_satang: paymentAgg.totalPaid.get(id) ?? 0,
      last_active: sessionAgg.lastActive.get(id) ?? "",
      sessions_completed: sessionAgg.counts.get(id) ?? 0,
      mock_tests_taken: mockAgg.get(id) ?? 0,
    };
  });
}

export function rowsToCsv(
  rows: Record<string, string | number>[],
): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => esc(row[h])).join(",")),
  ];
  return lines.join("\n");
}
