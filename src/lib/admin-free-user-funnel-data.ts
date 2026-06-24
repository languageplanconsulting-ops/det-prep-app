import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Per-user free→paid funnel for the admin "Free users" dashboard.
 *
 * Answers the founder's question: "why so many free registrations but no conversion?"
 * Joins, per registered (non-admin) account:
 *   profiles (who + when)  ·  mini_diagnosis_results (did they take the free test + score)
 *   payment_history (did they convert)  ·  user_activity_events (behavior, if deployed)
 *
 * Read-only. Sized for the current scale (tens–hundreds of users); push to SQL if it grows.
 */

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  tier: string | null;
  tier_expires_at: string | null;
  vip_granted_by_course: boolean | null;
  role: string | null;
  created_at: string | null;
};

type ResultRow = {
  user_id: string;
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  level_label: string | null;
  created_at: string;
};

type PaymentRow = { user_id: string | null; created_at: string | null };

type ActivityRow = { user_id: string | null; created_at: string; event_name: string };

export type FreeUserRow = {
  userId: string;
  email: string;
  name: string | null;
  tier: string;
  signedUpAt: string | null;
  tookTest: boolean;
  testCount: number;
  bestTotal: number | null;
  lastTestAt: string | null;
  weakestSkill: string | null; // Thai label of the lowest sub-score on the latest test
  levelLabel: string | null;
  converted: boolean;
  activityEvents: number; // 0 if behavior table not deployed
  lastActiveAt: string | null;
  /** funnel bucket for quick filtering in the UI */
  bucket: "converted" | "test_no_convert" | "registered_no_test";
};

export type FreeUserFunnelSnapshot = {
  behaviorDeployed: boolean;
  generatedAt: string;
  summary: {
    totalRegistered: number;
    tookTest: number;
    tookTestPct: number;
    converted: number;
    convertedPct: number;
    registeredNoTest: number;
    testNoConvert: number;
    avgTestTotal: number | null;
  };
  funnel: Array<{ stage: string; value: number }>;
  users: FreeUserRow[];
};

const SKILL_LABELS_TH: Record<string, string> = {
  listening: "ฟัง",
  speaking: "พูด",
  reading: "อ่าน",
  writing: "เขียน",
};

function weakestSkillTh(r: ResultRow): string {
  const pairs: Array<[string, number]> = [
    ["listening", r.actual_listening],
    ["speaking", r.actual_speaking],
    ["reading", r.actual_reading],
    ["writing", r.actual_writing],
  ];
  pairs.sort((a, b) => a[1] - b[1]);
  return SKILL_LABELS_TH[pairs[0][0]] ?? pairs[0][0];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function fetchFreeUserFunnelData(): Promise<FreeUserFunnelSnapshot> {
  const supabase = createServiceRoleSupabase();

  const [profilesRes, resultsRes, paymentsRes, activityRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,full_name,tier,tier_expires_at,vip_granted_by_course,role,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("mini_diagnosis_results")
      .select(
        "user_id,actual_total,actual_listening,actual_speaking,actual_reading,actual_writing,level_label,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("payment_history").select("user_id,created_at").eq("status", "succeeded"),
    supabase
      .from("user_activity_events")
      .select("user_id,created_at,event_name")
      .not("user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20000),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (resultsRes.error) throw new Error(resultsRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  // Behavior table is optional — degrade gracefully if the migration isn't deployed live.
  let behaviorDeployed = true;
  let activity: ActivityRow[] = [];
  if (activityRes.error) {
    const notDeployed = /Could not find the table|does not exist|relation .* does not exist/i.test(
      activityRes.error.message,
    );
    if (!notDeployed) throw new Error(activityRes.error.message);
    behaviorDeployed = false;
  } else {
    activity = (activityRes.data ?? []) as ActivityRow[];
  }

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const results = (resultsRes.data ?? []) as ResultRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];

  const paidIds = new Set(
    payments.map((p) => p.user_id).filter((v): v is string => Boolean(v)),
  );

  // Group results + activity by user.
  const resultsByUser = new Map<string, ResultRow[]>();
  for (const r of results) {
    const arr = resultsByUser.get(r.user_id);
    if (arr) arr.push(r);
    else resultsByUser.set(r.user_id, [r]);
  }
  const activityByUser = new Map<string, { count: number; last: string }>();
  for (const a of activity) {
    if (!a.user_id) continue;
    const cur = activityByUser.get(a.user_id);
    if (cur) cur.count += 1;
    else activityByUser.set(a.user_id, { count: 1, last: a.created_at });
  }

  const users: FreeUserRow[] = [];
  for (const p of profiles) {
    if (p.role === "admin") continue; // exclude staff accounts from the funnel

    const userResults = resultsByUser.get(p.id) ?? [];
    const tookTest = userResults.length > 0;
    const latest = userResults[0]; // results were ordered desc
    const bestTotal = tookTest
      ? Math.max(...userResults.map((r) => Number(r.actual_total)))
      : null;
    const converted = paidIds.has(p.id);
    const act = activityByUser.get(p.id);

    const bucket: FreeUserRow["bucket"] = converted
      ? "converted"
      : tookTest
        ? "test_no_convert"
        : "registered_no_test";

    users.push({
      userId: p.id,
      email: p.email ?? "(no email)",
      name: p.full_name,
      tier: p.tier ?? "free",
      signedUpAt: p.created_at,
      tookTest,
      testCount: userResults.length,
      bestTotal: bestTotal !== null ? round1(bestTotal) : null,
      lastTestAt: latest ? latest.created_at : null,
      weakestSkill: latest ? weakestSkillTh(latest) : null,
      levelLabel: latest ? latest.level_label : null,
      converted,
      activityEvents: act?.count ?? 0,
      lastActiveAt: act?.last ?? null,
      bucket,
    });
  }

  const totalRegistered = users.length;
  const tookTest = users.filter((u) => u.tookTest).length;
  const converted = users.filter((u) => u.converted).length;
  const registeredNoTest = users.filter((u) => u.bucket === "registered_no_test").length;
  const testNoConvert = users.filter((u) => u.bucket === "test_no_convert").length;

  const scored = users.filter((u) => u.bestTotal !== null).map((u) => u.bestTotal as number);
  const avgTestTotal = scored.length
    ? round1(scored.reduce((s, n) => s + n, 0) / scored.length)
    : null;

  return {
    behaviorDeployed,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRegistered,
      tookTest,
      tookTestPct: totalRegistered ? round1((tookTest / totalRegistered) * 100) : 0,
      converted,
      convertedPct: totalRegistered ? round1((converted / totalRegistered) * 100) : 0,
      registeredNoTest,
      testNoConvert,
      avgTestTotal,
    },
    funnel: [
      { stage: "ลงทะเบียน", value: totalRegistered },
      { stage: "ทำ Mini Test", value: tookTest },
      { stage: "จ่ายเงิน", value: converted },
    ],
    users,
  };
}
