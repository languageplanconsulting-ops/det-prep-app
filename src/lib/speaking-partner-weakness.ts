import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { SPEAKING_PARTNER_WEAKNESS_TOP_N } from "@/lib/speaking-partner-constants";
import type {
  SpeakingPartnerGrammarFinding,
  SpeakingPartnerTransitionFinding,
  SpeakingPartnerWeaknessDelta,
  SpeakingPartnerWeaknessTopic,
} from "@/types/speaking-partner";

export type WeaknessTopicKind = "grammar" | "transition";

export type WeaknessHistoryRow = {
  topic_kind: WeaknessTopicKind;
  topic_key: string;
  topic_en: string;
  topic_th: string;
  occurrence_count: number;
};

/** Normalizes a topic label into a stable key so near-duplicate wordings collapse into one row. */
export function normalizeTopicKey(topicEn: string): string {
  return topicEn
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");
}

export type SessionTopic = {
  kind: WeaknessTopicKind;
  topicEn: string;
  topicTh: string;
};

/**
 * Collapses this session's grammar + transition findings into distinct topics
 * (vocabulary is intentionally excluded from weakness tracking). A mistake
 * repeated several times within one session only counts once toward history,
 * so one chatty session can't dominate the running top-5.
 */
export function computeSessionTopics(args: {
  grammarFindings: SpeakingPartnerGrammarFinding[];
  transitionFindings: SpeakingPartnerTransitionFinding[];
}): SessionTopic[] {
  const seen = new Set<string>();
  const topics: SessionTopic[] = [];
  for (const f of args.grammarFindings) {
    const key = `grammar:${normalizeTopicKey(f.topicEn)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push({ kind: "grammar", topicEn: f.topicEn, topicTh: f.topicTh });
  }
  for (const f of args.transitionFindings) {
    const key = `transition:${normalizeTopicKey(f.topicEn)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push({ kind: "transition", topicEn: f.topicEn, topicTh: f.topicTh });
  }
  return topics;
}

async function getTopFive(userId: string): Promise<WeaknessHistoryRow[]> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("speaking_partner_weakness_history")
    .select("topic_kind, topic_key, topic_en, topic_th, occurrence_count")
    .eq("user_id", userId)
    .order("occurrence_count", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(SPEAKING_PARTNER_WEAKNESS_TOP_N);
  if (error) throw new Error(error.message);
  return (data ?? []) as WeaknessHistoryRow[];
}

/** Public read used by the pre-session intro screen. */
export async function fetchWeaknessTopFive(userId: string): Promise<SpeakingPartnerWeaknessTopic[]> {
  const rows = await getTopFive(userId);
  return rows.map((r) => ({ topicKind: r.topic_kind, topicEn: r.topic_en, topicTh: r.topic_th }));
}

/**
 * Reads the top-5 BEFORE this session's topics are applied (the "previously
 * flagged" baseline), upserts occurrence counts for this session's topics,
 * and returns the improved/persisting diff against that baseline.
 */
export async function upsertWeaknessHistory(args: {
  userId: string;
  attemptId: string;
  sessionTopics: SessionTopic[];
}): Promise<SpeakingPartnerWeaknessDelta> {
  const { userId, attemptId, sessionTopics } = args;
  const before = await getTopFive(userId);
  const beforeByKey = new Map(before.map((r) => [`${r.topic_kind}:${r.topic_key}`, r]));

  const supabase = createServiceRoleSupabase();
  const nowIso = new Date().toISOString();

  for (const topic of sessionTopics) {
    const topicKey = normalizeTopicKey(topic.topicEn);
    const { data: existing, error: readError } = await supabase
      .from("speaking_partner_weakness_history")
      .select("id, occurrence_count")
      .eq("user_id", userId)
      .eq("topic_kind", topic.kind)
      .eq("topic_key", topicKey)
      .maybeSingle<{ id: string; occurrence_count: number }>();
    if (readError) throw new Error(readError.message);

    if (existing) {
      const { error: updateError } = await supabase
        .from("speaking_partner_weakness_history")
        .update({
          occurrence_count: existing.occurrence_count + 1,
          topic_en: topic.topicEn,
          topic_th: topic.topicTh,
          last_seen_at: nowIso,
          last_session_attempt_id: attemptId,
          updated_at: nowIso,
        })
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase.from("speaking_partner_weakness_history").insert({
        user_id: userId,
        topic_kind: topic.kind,
        topic_key: topicKey,
        topic_en: topic.topicEn,
        topic_th: topic.topicTh,
        occurrence_count: 1,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        last_session_attempt_id: attemptId,
        updated_at: nowIso,
      });
      if (insertError) throw new Error(insertError.message);
    }
  }

  const sessionKeys = new Set(sessionTopics.map((t) => `${t.kind}:${normalizeTopicKey(t.topicEn)}`));
  const improvedTopics: SpeakingPartnerWeaknessTopic[] = [];
  const persistingTopics: SpeakingPartnerWeaknessTopic[] = [];
  for (const [key, row] of beforeByKey) {
    const topic: SpeakingPartnerWeaknessTopic = {
      topicKind: row.topic_kind,
      topicEn: row.topic_en,
      topicTh: row.topic_th,
    };
    if (sessionKeys.has(key)) {
      persistingTopics.push(topic);
    } else {
      improvedTopics.push(topic);
    }
  }

  return { improvedTopics, persistingTopics };
}
