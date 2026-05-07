import "server-only";

import type { BusinessEventRow } from "@/lib/business-events";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  tier: string | null;
  tier_expires_at: string | null;
  vip_granted_by_course: boolean | null;
  created_at: string | null;
};

type PaymentRow = {
  id: string;
  user_id: string | null;
  amount: number | null;
  status: string | null;
  tier: string | null;
  payment_method: string | null;
  description: string | null;
  created_at: string | null;
};

type DashboardSnapshot = {
  totalAccounts: number;
  newAccounts7d: number;
  newAccounts30d: number;
  activePaidUsers: number;
  overallConversionPct: number;
  paidCustomers30d: number;
  signupToPaid30dPct: number;
  revenue30dThb: number;
  planPurchases30d: number;
  addonPurchases30d: number;
  freeMiniDiagnosis30d: number;
  mockStarts30d: number;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86400 * 1000);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isPaidProfile(profile: ProfileRow, now: Date): boolean {
  if (profile.tier === "vip" && profile.vip_granted_by_course && !profile.tier_expires_at) {
    return true;
  }
  if (!profile.tier || profile.tier === "free") return false;
  if (!profile.tier_expires_at) return false;
  return new Date(profile.tier_expires_at) > now;
}

function createZeroSeries(days: number, end: Date) {
  const rows: Array<{
    date: string;
    signups: number;
    paidCustomers: number;
    revenueThb: number;
    freeMiniDiagnosis: number;
    mockStarts: number;
  }> = [];
  const start = startOfDay(addDays(end, -(days - 1)));
  for (let i = 0; i < days; i += 1) {
    const day = addDays(start, i);
    rows.push({
      date: day.toISOString().slice(5, 10),
      signups: 0,
      paidCustomers: 0,
      revenueThb: 0,
      freeMiniDiagnosis: 0,
      mockStarts: 0,
    });
  }
  return rows;
}

export async function fetchBusinessDashboardData() {
  const supabase = createServiceRoleSupabase();
  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * 86400 * 1000);
  const last30 = new Date(now.getTime() - 30 * 86400 * 1000);
  const last60 = new Date(now.getTime() - 60 * 86400 * 1000);

  const [profilesRes, paymentsRes, eventsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,full_name,tier,tier_expires_at,vip_granted_by_course,created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_history")
      .select("id,user_id,amount,status,tier,payment_method,description,created_at")
      .eq("status", "succeeded")
      .gte("created_at", last60.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("business_events")
      .select("*")
      .gte("created_at", last60.toISOString())
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (eventsRes.error) throw new Error(eventsRes.error.message);

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const events = (eventsRes.data ?? []) as BusinessEventRow[];

  const totalAccounts = profiles.length;
  const activePaidUsers = profiles.filter((profile) => isPaidProfile(profile, now)).length;
  const overallConversionPct =
    totalAccounts > 0 ? round1((activePaidUsers / totalAccounts) * 100) : 0;

  const newAccounts7d = profiles.filter((profile) => {
    if (!profile.created_at) return false;
    return new Date(profile.created_at) >= last7;
  }).length;
  const newAccounts30d = profiles.filter((profile) => {
    if (!profile.created_at) return false;
    return new Date(profile.created_at) >= last30;
  }).length;

  const paidCustomerIds30d = new Set(
    payments
      .filter((payment) => payment.created_at && new Date(payment.created_at) >= last30)
      .map((payment) => payment.user_id)
      .filter((value): value is string => Boolean(value)),
  );
  const paidCustomers30d = paidCustomerIds30d.size;
  const signupToPaid30dPct =
    newAccounts30d > 0 ? round1((paidCustomers30d / newAccounts30d) * 100) : 0;
  const revenue30dThb = round1(
    payments
      .filter((payment) => payment.created_at && new Date(payment.created_at) >= last30)
      .reduce((sum, payment) => sum + (payment.amount ?? 0), 0) / 100,
  );

  const events30d = events.filter((event) => new Date(event.created_at) >= last30);
  const planPurchases30d = events30d.filter((event) => event.event_type === "plan_purchased").length;
  const addonPurchases30d = events30d.filter((event) => event.event_type === "addon_purchased").length;
  const freeMiniDiagnosis30d = events30d.filter(
    (event) =>
      event.event_type === "mini_diagnosis_started" &&
      event.metadata?.isFreeUser === true,
  ).length;
  const mockStarts30d = events30d.filter((event) => event.event_type === "mock_test_started").length;

  const snapshot: DashboardSnapshot = {
    totalAccounts,
    newAccounts7d,
    newAccounts30d,
    activePaidUsers,
    overallConversionPct,
    paidCustomers30d,
    signupToPaid30dPct,
    revenue30dThb,
    planPurchases30d,
    addonPurchases30d,
    freeMiniDiagnosis30d,
    mockStarts30d,
  };

  const activitySeries = createZeroSeries(30, now);
  const activityMap = new Map(activitySeries.map((row) => [row.date, row]));

  for (const profile of profiles) {
    if (!profile.created_at) continue;
    const created = new Date(profile.created_at);
    if (created < last30) continue;
    const key = created.toISOString().slice(5, 10);
    activityMap.get(key)!.signups += 1;
  }

  for (const payment of payments) {
    if (!payment.created_at) continue;
    const created = new Date(payment.created_at);
    if (created < last30) continue;
    const key = created.toISOString().slice(5, 10);
    const row = activityMap.get(key);
    if (!row) continue;
    row.paidCustomers += 1;
    row.revenueThb += (payment.amount ?? 0) / 100;
  }

  for (const event of events) {
    const created = new Date(event.created_at);
    if (created < last30) continue;
    const key = created.toISOString().slice(5, 10);
    const row = activityMap.get(key);
    if (!row) continue;
    if (event.event_type === "mini_diagnosis_started" && event.metadata?.isFreeUser === true) {
      row.freeMiniDiagnosis += 1;
    }
    if (event.event_type === "mock_test_started") {
      row.mockStarts += 1;
    }
  }

  const planMixMap = new Map<string, number>();
  for (const event of events30d) {
    if (event.event_type !== "plan_purchased") continue;
    const label = event.event_label ?? "unknown";
    planMixMap.set(label, (planMixMap.get(label) ?? 0) + 1);
  }
  const planMix = [...planMixMap.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  const funnel = [
    {
      label: "Accounts",
      value: totalAccounts,
      note: "ผู้ใช้ทั้งหมด",
    },
    {
      label: "Free diagnosis users",
      value: new Set(
        events
          .filter((event) => event.event_type === "mini_diagnosis_started")
          .map((event) => event.user_id)
          .filter((value): value is string => Boolean(value)),
      ).size,
      note: "เริ่มประเมินระดับฟรี",
    },
    {
      label: "Paying customers (30d)",
      value: paidCustomers30d,
      note: "มีการจ่ายเงินใน 30 วันล่าสุด",
    },
    {
      label: "Active paid",
      value: activePaidUsers,
      note: "มีแพ็กเกจใช้งานอยู่ตอนนี้",
    },
  ];

  const recentEvents = events.slice(0, 25).map((event) => ({
    id: event.id,
    type: event.event_type,
    label: event.event_label ?? "—",
    email: event.email ?? "—",
    createdAt: event.created_at,
    value: event.event_value ?? null,
    currency: event.event_currency ?? "thb",
    source: event.event_source ?? "—",
    emailNotifiedAt: event.email_notified_at,
    emailNotificationError: event.email_notification_error,
  }));

  return {
    snapshot,
    charts: {
      activity30d: activitySeries,
      planMix,
    },
    funnel,
    recentEvents,
    emailConfig: {
      resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
      businessNotifyConfigured: Boolean(
        process.env.BUSINESS_NOTIFY_EMAIL?.trim() || process.env.FAST_TRACK_NOTIFY_EMAIL?.trim(),
      ),
    },
  };
}
