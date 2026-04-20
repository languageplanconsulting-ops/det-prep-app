import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

const LIMIT = 400;

export type AdminStudyActivityItem = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  completed: boolean | null;
  skill: string | null;
  exercise_type: string | null;
  difficulty: string | null;
  set_id: string | null;
  score: number | null;
  submission_payload: Record<string, unknown> | null;
  report_payload: Record<string, unknown> | null;
};

export async function fetchAdminStudyActivity(): Promise<AdminStudyActivityItem[]> {
  const supabase = createServiceRoleSupabase();
  const { data: sessions, error } = await supabase
    .from("study_sessions")
    .select(
      "id, user_id, started_at, ended_at, duration_seconds, completed, skill, exercise_type, difficulty, set_id, score, submission_payload, report_payload",
    )
    .order("started_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("[admin-study-activity] sessions", error.message);
    return [];
  }

  const rows = (sessions ?? []) as Record<string, unknown>[];
  const userIds = [...new Set(rows.map((row) => String(row.user_id ?? "")).filter(Boolean))];
  const profileById = new Map<string, { email: string; full_name: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    if (profErr) {
      console.error("[admin-study-activity] profiles", profErr.message);
    } else {
      for (const profile of profiles ?? []) {
        profileById.set(String(profile.id), {
          email: String(profile.email ?? ""),
          full_name: (profile.full_name as string | null) ?? null,
        });
      }
    }
  }

  return rows.map((row) => {
    const userId = String(row.user_id ?? "");
    const profile = profileById.get(userId);
    return {
      id: String(row.id ?? ""),
      user_id: userId,
      email: profile?.email ?? `${userId.slice(0, 8)}…`,
      full_name: profile?.full_name ?? null,
      started_at: (row.started_at as string | null) ?? null,
      ended_at: (row.ended_at as string | null) ?? null,
      duration_seconds:
        typeof row.duration_seconds === "number" ? row.duration_seconds : null,
      completed: typeof row.completed === "boolean" ? row.completed : null,
      skill: (row.skill as string | null) ?? null,
      exercise_type: (row.exercise_type as string | null) ?? null,
      difficulty: (row.difficulty as string | null) ?? null,
      set_id: (row.set_id as string | null) ?? null,
      score: typeof row.score === "number" ? row.score : null,
      submission_payload:
        row.submission_payload && typeof row.submission_payload === "object"
          ? (row.submission_payload as Record<string, unknown>)
          : null,
      report_payload:
        row.report_payload && typeof row.report_payload === "object"
          ? (row.report_payload as Record<string, unknown>)
          : null,
    };
  });
}
