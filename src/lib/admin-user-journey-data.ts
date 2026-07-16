import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * "User journey" admin data: for each learner, how much TIME they spent on each
 * type of exam, broken down by day. The primary source is `study_sessions`
 * (one row per exercise attempt, with `exercise_type`, `duration_seconds`,
 * `started_at`). Freeform timed-practice minutes (`study_plan_practice_minutes`)
 * are merged into the daily detail so a day's total reflects off-plan practice too.
 *
 * Two entry points:
 *   - fetchUserJourneySummaries()      → one aggregate row per user (list view)
 *   - fetchUserJourneyDetail(userId)   → day-by-day, session-by-session timeline
 */

const SUMMARY_WINDOW_DAYS = 365;
const MAX_SESSION_ROWS = 50000;
const DETAIL_MAX_ROWS = 5000;

/** YYYY-MM-DD for a timestamp, in the school's timezone (Asia/Bangkok). */
const BKK_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function bangkokDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return BKK_DATE.format(d);
}

type SessionRow = {
  user_id: string | null;
  skill: string | null;
  exercise_type: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  completed: boolean | null;
  score: number | null;
  difficulty: string | null;
  set_id: string | null;
};

function secondsOf(row: { duration_seconds: number | null }): number {
  const n = Number(row.duration_seconds);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// ---------------------------------------------------------------------------
// Summaries (list view)
// ---------------------------------------------------------------------------

export type UserJourneySummary = {
  userId: string;
  email: string;
  fullName: string | null;
  totalSeconds: number;
  sessionCount: number;
  completedCount: number;
  daysActive: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  /** Seconds per exercise_type, e.g. { dictation: 1200, reading: 640 }. */
  secondsByExercise: Record<string, number>;
  /** exercise_type with the most seconds (or null when no timed sessions). */
  topExercise: string | null;
};

export async function fetchUserJourneySummaries(): Promise<UserJourneySummary[]> {
  const supabase = createServiceRoleSupabase();
  const since = new Date(
    Date.now() - SUMMARY_WINDOW_DAYS * 86400 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("study_sessions")
    .select(
      "user_id, skill, exercise_type, duration_seconds, started_at, ended_at, completed",
    )
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(MAX_SESSION_ROWS);

  if (error) {
    console.error("[admin-user-journey] summaries", error.message);
    return [];
  }

  const rows = (data ?? []) as SessionRow[];

  type Agg = {
    totalSeconds: number;
    sessionCount: number;
    completedCount: number;
    days: Set<string>;
    first: string | null;
    last: string | null;
    byExercise: Map<string, number>;
  };
  const byUser = new Map<string, Agg>();

  for (const row of rows) {
    const userId = String(row.user_id ?? "");
    if (!userId) continue;
    let agg = byUser.get(userId);
    if (!agg) {
      agg = {
        totalSeconds: 0,
        sessionCount: 0,
        completedCount: 0,
        days: new Set(),
        first: null,
        last: null,
        byExercise: new Map(),
      };
      byUser.set(userId, agg);
    }
    const started = row.started_at ?? null;
    agg.sessionCount += 1;
    if (row.completed === true) agg.completedCount += 1;

    const sec = secondsOf(row);
    if (sec > 0) {
      agg.totalSeconds += sec;
      const ex = (row.exercise_type ?? "unknown").trim() || "unknown";
      agg.byExercise.set(ex, (agg.byExercise.get(ex) ?? 0) + sec);
    }

    if (started) {
      agg.days.add(bangkokDateKey(started));
      if (!agg.last || started > agg.last) agg.last = started;
      if (!agg.first || started < agg.first) agg.first = started;
    }
  }

  const userIds = [...byUser.keys()];
  const profileById = await loadProfiles(supabase, userIds);

  const out: UserJourneySummary[] = userIds.map((userId) => {
    const agg = byUser.get(userId)!;
    const profile = profileById.get(userId);
    const secondsByExercise: Record<string, number> = {};
    let topExercise: string | null = null;
    let topSeconds = -1;
    for (const [ex, sec] of agg.byExercise) {
      secondsByExercise[ex] = sec;
      if (sec > topSeconds) {
        topSeconds = sec;
        topExercise = ex;
      }
    }
    return {
      userId,
      email: profile?.email ?? `${userId.slice(0, 8)}…`,
      fullName: profile?.full_name ?? null,
      totalSeconds: agg.totalSeconds,
      sessionCount: agg.sessionCount,
      completedCount: agg.completedCount,
      daysActive: agg.days.size,
      firstActivityAt: agg.first,
      lastActivityAt: agg.last,
      secondsByExercise,
      topExercise,
    };
  });

  out.sort((a, b) => b.totalSeconds - a.totalSeconds);
  return out;
}

// ---------------------------------------------------------------------------
// Detail (single-user timeline)
// ---------------------------------------------------------------------------

export type JourneySession = {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  exerciseType: string;
  skill: string | null;
  seconds: number;
  completed: boolean;
  score: number | null;
  difficulty: string | null;
  setId: string | null;
};

export type ExerciseSlice = {
  exerciseType: string;
  seconds: number;
  sessions: number;
};

export type JourneyDay = {
  date: string; // YYYY-MM-DD (Asia/Bangkok)
  totalSeconds: number;
  sessionCount: number;
  completedCount: number;
  /** Time per exam type that day, biggest first (drives the stacked bar). */
  byExercise: ExerciseSlice[];
  /** Every session that day, latest first. */
  sessions: JourneySession[];
  /** Off-plan timed-practice minutes logged that day, per skill. */
  practiceMinutes: { skill: string; minutes: number; setsDone: number }[];
};

export type UserJourneyDetail = {
  userId: string;
  email: string;
  fullName: string | null;
  totalSeconds: number;
  sessionCount: number;
  completedCount: number;
  daysActive: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  secondsByExercise: ExerciseSlice[];
  days: JourneyDay[];
};

export async function fetchUserJourneyDetail(
  userId: string,
): Promise<UserJourneyDetail | null> {
  const supabase = createServiceRoleSupabase();

  const { data, error } = await supabase
    .from("study_sessions")
    .select(
      "id, user_id, skill, exercise_type, duration_seconds, started_at, ended_at, completed, score, difficulty, set_id",
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(DETAIL_MAX_ROWS);

  if (error) {
    console.error("[admin-user-journey] detail", error.message);
    return null;
  }

  const profile = (await loadProfiles(supabase, [userId])).get(userId);
  const rows = (data ?? []) as (SessionRow & { id: string; score: number | null })[];

  // Freeform timed-practice minutes (may be an undeployed table — treat as empty).
  const practiceByDate = await loadPracticeMinutes(supabase, userId);

  const dayMap = new Map<string, JourneyDay>();
  const overallByExercise = new Map<string, { seconds: number; sessions: number }>();
  let totalSeconds = 0;
  let sessionCount = 0;
  let completedCount = 0;
  let first: string | null = null;
  let last: string | null = null;

  for (const row of rows) {
    const started = row.started_at ?? null;
    const dateKey = started ? bangkokDateKey(started) : "unknown";
    const ex = (row.exercise_type ?? "unknown").trim() || "unknown";
    const sec = secondsOf(row);
    const completed = row.completed === true;

    sessionCount += 1;
    if (completed) completedCount += 1;
    totalSeconds += sec;
    if (started) {
      if (!last || started > last) last = started;
      if (!first || started < first) first = started;
    }

    const oa = overallByExercise.get(ex) ?? { seconds: 0, sessions: 0 };
    oa.seconds += sec;
    oa.sessions += 1;
    overallByExercise.set(ex, oa);

    let day = dayMap.get(dateKey);
    if (!day) {
      day = {
        date: dateKey,
        totalSeconds: 0,
        sessionCount: 0,
        completedCount: 0,
        byExercise: [],
        sessions: [],
        practiceMinutes: [],
      };
      dayMap.set(dateKey, day);
    }
    day.totalSeconds += sec;
    day.sessionCount += 1;
    if (completed) day.completedCount += 1;
    day.sessions.push({
      id: String(row.id ?? ""),
      startedAt: started,
      endedAt: row.ended_at ?? null,
      exerciseType: ex,
      skill: row.skill ?? null,
      seconds: sec,
      completed,
      score: typeof row.score === "number" ? row.score : null,
      difficulty: row.difficulty ?? null,
      setId: row.set_id ?? null,
    });
  }

  // Fold per-exercise seconds into each day.
  for (const day of dayMap.values()) {
    const per = new Map<string, { seconds: number; sessions: number }>();
    for (const s of day.sessions) {
      const cur = per.get(s.exerciseType) ?? { seconds: 0, sessions: 0 };
      cur.seconds += s.seconds;
      cur.sessions += 1;
      per.set(s.exerciseType, cur);
    }
    day.byExercise = [...per.entries()]
      .map(([exerciseType, v]) => ({ exerciseType, ...v }))
      .sort((a, b) => b.seconds - a.seconds);
    // Sessions latest-first (they arrived desc, but be explicit).
    day.sessions.sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
    const pm = practiceByDate.get(day.date);
    if (pm) day.practiceMinutes = pm;
  }

  // Any practice-minute days with no study_sessions still deserve a card.
  for (const [date, pm] of practiceByDate) {
    if (dayMap.has(date)) continue;
    dayMap.set(date, {
      date,
      totalSeconds: 0,
      sessionCount: 0,
      completedCount: 0,
      byExercise: [],
      sessions: [],
      practiceMinutes: pm,
    });
  }

  const days = [...dayMap.values()].sort((a, b) => b.date.localeCompare(a.date));

  const secondsByExercise: ExerciseSlice[] = [...overallByExercise.entries()]
    .map(([exerciseType, v]) => ({ exerciseType, seconds: v.seconds, sessions: v.sessions }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    userId,
    email: profile?.email ?? `${userId.slice(0, 8)}…`,
    fullName: profile?.full_name ?? null,
    totalSeconds,
    sessionCount,
    completedCount,
    daysActive: days.length,
    firstActivityAt: first,
    lastActivityAt: last,
    secondsByExercise,
    days,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ServiceClient = ReturnType<typeof createServiceRoleSupabase>;

async function loadProfiles(
  supabase: ServiceClient,
  userIds: string[],
): Promise<Map<string, { email: string; full_name: string | null }>> {
  const map = new Map<string, { email: string; full_name: string | null }>();
  if (userIds.length === 0) return map;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);
  if (error) {
    console.error("[admin-user-journey] profiles", error.message);
    return map;
  }
  for (const p of data ?? []) {
    map.set(String(p.id), {
      email: String(p.email ?? ""),
      full_name: (p.full_name as string | null) ?? null,
    });
  }
  return map;
}

async function loadPracticeMinutes(
  supabase: ServiceClient,
  userId: string,
): Promise<Map<string, { skill: string; minutes: number; setsDone: number }[]>> {
  const map = new Map<string, { skill: string; minutes: number; setsDone: number }[]>();
  const { data, error } = await supabase
    .from("study_plan_practice_minutes")
    .select("practice_date, skill, minutes, sets_done")
    .eq("user_id", userId);
  if (error) {
    // Table may not be deployed in every environment — that's fine, skip it.
    return map;
  }
  for (const r of data ?? []) {
    const date = String(r.practice_date ?? "");
    if (!date) continue;
    const list = map.get(date) ?? [];
    list.push({
      skill: String(r.skill ?? "unknown"),
      minutes: Number(r.minutes) || 0,
      setsDone: Number(r.sets_done) || 0,
    });
    map.set(date, list);
  }
  return map;
}
