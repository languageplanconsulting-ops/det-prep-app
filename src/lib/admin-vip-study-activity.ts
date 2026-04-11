import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

const SKILL_ORDER = [
  "literacy",
  "comprehension",
  "conversation",
  "production",
  "mock_test",
] as const;

const CHUNK = 120;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export type VIPStudyActivityRow = {
  userId: string;
  email: string;
  fullName: string | null;
  vipGrantedByCourse: boolean;
  hasStripeSubscription: boolean;
  totalSeconds: number;
  totalMinutes: number;
  /** Seconds per skill (DET skill areas). */
  secondsBySkill: Record<string, number>;
  /** Seconds and session counts per exercise_type (e.g. fitb, speaking). */
  byExerciseType: { type: string; seconds: number; sessions: number }[];
  /** Sessions with ended_at and duration &gt; 0 (same basis as learner time-by-skill). */
  timedSessionCount: number;
  /** All sessions that have ended_at set. */
  endedSessionCount: number;
  lastActivityAt: string | null;
  mockTestCount: number;
};

function emptyRow(
  p: Record<string, unknown>,
): Omit<VIPStudyActivityRow, "totalMinutes" | "byExerciseType"> & {
  exerciseAgg: Map<string, { seconds: number; sessions: number }>;
} {
  return {
    userId: p.id as string,
    email: p.email as string,
    fullName: (p.full_name as string | null) ?? null,
    vipGrantedByCourse: p.vip_granted_by_course === true,
    hasStripeSubscription: Boolean(p.stripe_subscription_id),
    totalSeconds: 0,
    secondsBySkill: {},
    exerciseAgg: new Map(),
    timedSessionCount: 0,
    endedSessionCount: 0,
    lastActivityAt: null,
    mockTestCount: 0,
  };
}

/**
 * Per-VIP study metrics from `study_sessions` + mock test counts.
 * VIP = profiles with `tier = 'vip'` (course-granted, Stripe, or both).
 */
export async function getVIPStudyActivitySummaries(): Promise<VIPStudyActivityRow[]> {
  const supabase = createServiceRoleSupabase();
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, tier, vip_granted_by_course, stripe_subscription_id",
    )
    .eq("tier", "vip");

  if (profErr) {
    console.error("[admin-vip-study-activity] profiles", profErr.message);
    return [];
  }

  const rows = (profiles ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const byUser = new Map<string, ReturnType<typeof emptyRow>>();
  for (const p of rows) {
    byUser.set(p.id as string, emptyRow(p));
  }

  const ids = [...byUser.keys()];

  for (const batch of chunk(ids, CHUNK)) {
    const { data: sessions, error: sErr } = await supabase
      .from("study_sessions")
      .select(
        "user_id, skill, exercise_type, duration_seconds, started_at, ended_at",
      )
      .in("user_id", batch);

    if (sErr) {
      console.error("[admin-vip-study-activity] study_sessions", sErr.message);
      continue;
    }

    for (const s of sessions ?? []) {
      const uid = s.user_id as string;
      const row = byUser.get(uid);
      if (!row) continue;

      const endedAt = s.ended_at as string | null;
      const startedAt = s.started_at as string;
      const dur = Math.max(0, Math.floor(Number(s.duration_seconds) || 0));
      const sk = typeof s.skill === "string" ? s.skill : "";
      const ex =
        typeof s.exercise_type === "string" ? s.exercise_type : "unknown";

      if (endedAt) {
        row.endedSessionCount += 1;
        const t = new Date(endedAt).getTime();
        const prev = row.lastActivityAt
          ? new Date(row.lastActivityAt).getTime()
          : 0;
        if (!row.lastActivityAt || t > prev) {
          row.lastActivityAt = endedAt;
        }
      } else {
        const st = new Date(startedAt).getTime();
        const prev = row.lastActivityAt
          ? new Date(row.lastActivityAt).getTime()
          : 0;
        if (!row.lastActivityAt || st > prev) {
          row.lastActivityAt = startedAt;
        }
      }

      if (endedAt && dur > 0) {
        row.timedSessionCount += 1;
        row.totalSeconds += dur;
        row.secondsBySkill[sk] = (row.secondsBySkill[sk] ?? 0) + dur;
        const cur = row.exerciseAgg.get(ex) ?? { seconds: 0, sessions: 0 };
        cur.seconds += dur;
        cur.sessions += 1;
        row.exerciseAgg.set(ex, cur);
      }
    }
  }

  for (const batch of chunk(ids, CHUNK)) {
    const { data: mocks, error: mErr } = await supabase
      .from("mock_test_results")
      .select("user_id")
      .in("user_id", batch);

    if (mErr) {
      console.error("[admin-vip-study-activity] mock_test_results", mErr.message);
      continue;
    }

    for (const r of mocks ?? []) {
      const uid = r.user_id as string;
      const row = byUser.get(uid);
      if (!row) continue;
      row.mockTestCount += 1;
    }
  }

  const result: VIPStudyActivityRow[] = [];

  for (const row of byUser.values()) {
    const byExerciseType = [...row.exerciseAgg.entries()]
      .map(([type, v]) => ({
        type,
        seconds: v.seconds,
        sessions: v.sessions,
      }))
      .sort((a, b) => b.seconds - a.seconds);

    const orderedSkill: Record<string, number> = {};
    for (const sk of SKILL_ORDER) {
      const sec = row.secondsBySkill[sk];
      if (sec && sec > 0) orderedSkill[sk] = sec;
    }
    for (const [sk, sec] of Object.entries(row.secondsBySkill)) {
      if (!orderedSkill[sk] && sec > 0) orderedSkill[sk] = sec;
    }

    const { exerciseAgg: _, ...rest } = row;
    result.push({
      ...rest,
      secondsBySkill: orderedSkill,
      byExerciseType,
      totalMinutes: Math.round((rest.totalSeconds / 60) * 10) / 10,
    });
  }

  result.sort(
    (a, b) =>
      b.totalSeconds - a.totalSeconds ||
      a.email.localeCompare(b.email, undefined, { sensitivity: "base" }),
  );

  return result;
}
