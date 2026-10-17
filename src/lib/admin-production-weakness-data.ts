import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { PRODUCTION_WEAKNESS_CLEAN_STREAK_LIMIT } from "@/lib/production-weakness";

const LIMIT = 2000;

export type AdminWeaknessTopic = {
  topicKey: string;
  topicEn: string;
  topicTh: string;
  scope: "all" | "writing";
  occurrenceCount: number;
  cleanStreak: number;
  /** True once the learner has gone enough clean attempts that we stopped warning them. */
  retired: boolean;
  lastSurface: string | null;
  lastSeenAt: string | null;
};

export type AdminWeaknessLearner = {
  userId: string;
  email: string;
  fullName: string | null;
  topics: AdminWeaknessTopic[];
};

/** How common each grammar habit is across the whole learner base. */
export type AdminWeaknessTally = {
  topicEn: string;
  topicTh: string;
  learners: number;
  occurrences: number;
};

export type AdminWeaknessReport = {
  learners: AdminWeaknessLearner[];
  tally: AdminWeaknessTally[];
};

/**
 * Every learner's repeated grammar habits, newest activity first, plus a
 * whole-cohort tally — which is the part that tells you what to teach next.
 */
export async function fetchAdminProductionWeakness(): Promise<AdminWeaknessReport> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("production_weakness_history")
    .select(
      "user_id, topic_key, topic_en, topic_th, scope, occurrence_count, clean_streak, last_surface, last_seen_at",
    )
    .order("occurrence_count", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("[admin-production-weakness]", error.message);
    return { learners: [], tally: [] };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const userIds = [...new Set(rows.map((r) => String(r.user_id ?? "")).filter(Boolean))];
  const profileById = new Map<string, { email: string; full_name: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    if (profErr) {
      console.error("[admin-production-weakness] profiles", profErr.message);
    } else {
      for (const p of profiles ?? []) {
        profileById.set(String(p.id), {
          email: String(p.email ?? ""),
          full_name: (p.full_name as string | null) ?? null,
        });
      }
    }
  }

  const byUser = new Map<string, AdminWeaknessLearner>();
  const tallyByTopic = new Map<string, AdminWeaknessTally>();

  for (const row of rows) {
    const userId = String(row.user_id ?? "");
    if (!userId) continue;
    const profile = profileById.get(userId);
    const topic: AdminWeaknessTopic = {
      topicKey: String(row.topic_key ?? ""),
      topicEn: String(row.topic_en ?? ""),
      topicTh: String(row.topic_th ?? ""),
      scope: (row.scope as "all" | "writing") ?? "all",
      occurrenceCount: Number(row.occurrence_count ?? 0),
      cleanStreak: Number(row.clean_streak ?? 0),
      retired: Number(row.clean_streak ?? 0) >= PRODUCTION_WEAKNESS_CLEAN_STREAK_LIMIT,
      lastSurface: (row.last_surface as string | null) ?? null,
      lastSeenAt: (row.last_seen_at as string | null) ?? null,
    };

    const existing = byUser.get(userId);
    if (existing) {
      existing.topics.push(topic);
    } else {
      byUser.set(userId, {
        userId,
        email: profile?.email ?? "",
        fullName: profile?.full_name ?? null,
        topics: [topic],
      });
    }

    // The cohort view counts a habit once per learner, so one very active
    // learner can't make a rare mistake look like a class-wide problem.
    const key = topic.topicEn || topic.topicTh;
    const tally = tallyByTopic.get(key);
    if (tally) {
      tally.learners += 1;
      tally.occurrences += topic.occurrenceCount;
    } else {
      tallyByTopic.set(key, {
        topicEn: topic.topicEn,
        topicTh: topic.topicTh,
        learners: 1,
        occurrences: topic.occurrenceCount,
      });
    }
  }

  const learners = [...byUser.values()].sort(
    (a, b) => topOccurrence(b) - topOccurrence(a),
  );
  const tally = [...tallyByTopic.values()].sort((a, b) => b.learners - a.learners);
  return { learners, tally };
}

function topOccurrence(learner: AdminWeaknessLearner): number {
  return learner.topics.reduce((max, t) => Math.max(max, t.occurrenceCount), 0);
}
