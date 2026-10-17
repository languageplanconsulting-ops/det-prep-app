import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { canonicalizeGrammarTopicEn } from "@/lib/grammar-topics";
import type { CriterionBreakdownPoint } from "@/types/writing";

/**
 * Persistent grammar weaknesses across every production exercise.
 *
 * Generalizes what speaking-partner-weakness.ts already does for My Speaking
 * Partner: record the grammar TOPIC of each mistake, count it once per attempt,
 * and surface the repeat offenders before the learner starts the next one.
 *
 * Vocabulary is deliberately not tracked (same call as Speaking Partner): a
 * weak word choice is attempt-specific, a grammar rule is a habit.
 */

/** Which exam a topic can be shown before. */
export type ProductionSkill = "writing" | "speaking";

/** Only show a topic once it has come back in a SECOND attempt — one mistake is not a habit. */
export const PRODUCTION_WEAKNESS_MIN_OCCURRENCES = 2;
/** Two warnings is a reminder; five is a wall of text nobody reads. */
export const PRODUCTION_WEAKNESS_MAX_SHOWN = 2;
/** Clean this many in-scope attempts in a row and the topic stops being shown. */
export const PRODUCTION_WEAKNESS_CLEAN_STREAK_LIMIT = 3;

const SURFACE_SKILL: Record<string, ProductionSkill> = {
  read_then_write: "writing",
  write_about_photo: "writing",
  read_then_speak: "speaking",
  speak_about_photo: "speaking",
  interactive_speaking: "speaking",
};

/** null for anything that isn't a production exercise (reading, listening, …). */
export function productionSkillForSurface(surface: string | null | undefined): ProductionSkill | null {
  if (!surface) return null;
  return SURFACE_SKILL[surface] ?? null;
}

/**
 * Punctuation, capitalization and spelling only exist on the page. Warning a
 * learner about commas right before they speak is noise, so these topics are
 * stored scoped to writing and filtered out of speaking warnings.
 */
const WRITING_ONLY_PATTERNS = [
  /punctuat/i,
  /capitali[sz]/i,
  /\bspelling\b/i,
  /\bcomma\b/i,
  /full stop/i,
  /apostrophe/i,
  /จุดวรรคตอน/,
  /เครื่องหมายวรรคตอน/,
  /ตัวพิมพ์ใหญ่/,
  /การสะกด/,
  /สะกดคำ/,
  /ลูกน้ำ/,
];

export function isWritingOnlyTopic(topicEn: string, topicTh: string): boolean {
  const haystack = `${topicEn} ${topicTh}`;
  return WRITING_ONLY_PATTERNS.some((re) => re.test(haystack));
}

/**
 * Collapses a topic label into a stable key. Unlike the Speaking Partner
 * version this keeps non-Latin characters, because the graders reliably return
 * a Thai topic name and only sometimes an English one — stripping Thai would
 * key every Thai-only topic to the empty string and merge them all into one row.
 */
export function normalizeProductionTopicKey(topicEn: string, topicTh: string): string {
  const source = topicEn.trim() || topicTh.trim();
  return source
    .toLowerCase()
    .replace(/^การใช้\s*/, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

/** One concrete instance of a mistake, kept so a later report can quote it back. */
export type WeaknessExample = {
  wrong: string;
  better: string;
  at: string;
};

/** The row key a report item's topic maps to — same canonicalisation the recorder uses. */
export function topicKeyFor(topicEn: string, topicTh: string): string {
  const en = canonicalizeGrammarTopicEn(topicEn) || canonicalizeGrammarTopicEn(topicTh) || topicEn;
  return normalizeProductionTopicKey(en, topicTh);
}

export type ProductionTopic = {
  topicKey: string;
  topicEn: string;
  topicTh: string;
  scope: "all" | "writing";
  example?: WeaknessExample;
};

const EXAMPLE_MAX_CHARS = 160;

/**
 * The grammar topics in one graded report, deduped. A learner who drops five
 * articles in one essay has ONE article problem, not five.
 */
export function extractAttemptTopics(grammarBreakdown: CriterionBreakdownPoint[]): ProductionTopic[] {
  const seen = new Set<string>();
  const topics: ProductionTopic[] = [];
  for (const item of grammarBreakdown ?? []) {
    const rawEn = (item.topicEn ?? "").trim();
    const topicTh = (item.topicTh ?? "").trim();
    // Items with no topic label (e.g. the injected punctuation-penalty rows)
    // can't be aggregated into a habit, so they're skipped rather than guessed at.
    if (!rawEn && !topicTh) continue;
    // The Thai label is tried too: graders often write the rule name in English
    // inside it ("การใช้ a/an/the"), which is exactly what the canon needs.
    const topicEn = canonicalizeGrammarTopicEn(rawEn) || canonicalizeGrammarTopicEn(topicTh) || rawEn;
    const topicKey = normalizeProductionTopicKey(topicEn, topicTh);
    if (!topicKey || seen.has(topicKey)) continue;
    seen.add(topicKey);
    const wrong = (item.excerpt ?? "").trim().slice(0, EXAMPLE_MAX_CHARS);
    const better = (item.suggestionEn ?? "").trim().slice(0, EXAMPLE_MAX_CHARS);
    topics.push({
      topicKey,
      topicEn,
      topicTh,
      scope: isWritingOnlyTopic(topicEn, topicTh) ? "writing" : "all",
      // First instance per topic is enough: the history keeps the last few attempts.
      ...(wrong ? { example: { wrong, better, at: new Date().toISOString() } } : {}),
    });
  }
  return topics;
}

export type PersistentTopic = {
  topicEn: string;
  topicTh: string;
  occurrenceCount: number;
};

type Row = {
  id: string;
  topic_key: string;
  topic_en: string;
  topic_th: string;
  scope: "all" | "writing";
  occurrence_count: number;
  clean_streak: number;
};

function scopeFilterFor(skill: ProductionSkill): "all" | null {
  // A speaking exercise only ever sees cross-skill topics; a writing exercise sees both.
  return skill === "speaking" ? "all" : null;
}

/**
 * The repeat offenders to warn about before an exercise of this skill.
 * Returns [] for signed-out learners, an undeployed table, or anyone without a
 * confirmed pattern — the caller renders nothing in all three cases.
 */
export async function fetchPersistentTopics(args: {
  userId: string;
  skill: ProductionSkill;
}): Promise<PersistentTopic[]> {
  try {
    const supabase = createServiceRoleSupabase();
    let query = supabase
      .from("production_weakness_history")
      .select("topic_en, topic_th, occurrence_count")
      .eq("user_id", args.userId)
      .gte("occurrence_count", PRODUCTION_WEAKNESS_MIN_OCCURRENCES)
      .lt("clean_streak", PRODUCTION_WEAKNESS_CLEAN_STREAK_LIMIT)
      .order("occurrence_count", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .limit(PRODUCTION_WEAKNESS_MAX_SHOWN);
    const scope = scopeFilterFor(args.skill);
    if (scope) query = query.eq("scope", scope);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      topicEn: String(r.topic_en ?? ""),
      topicTh: String(r.topic_th ?? ""),
      occurrenceCount: Number(r.occurrence_count ?? 0),
    }));
  } catch (e) {
    console.error("[production-weakness] read skipped:", e);
    return [];
  }
}

/**
 * Folds one graded attempt into the learner's history: topics seen this time
 * get their count bumped, in-scope topics that did NOT come back get their
 * clean streak extended toward being dropped.
 *
 * Never throws. This runs after a real report already exists — a bookkeeping
 * failure must never cost a learner their score or their credit.
 */
export async function recordAttemptWeakness(args: {
  userId: string | null | undefined;
  surface: string | null | undefined;
  attemptId: string;
  grammarBreakdown: CriterionBreakdownPoint[];
}): Promise<void> {
  const skill = productionSkillForSurface(args.surface);
  if (!args.userId || !skill) return;

  try {
    const topics = extractAttemptTopics(args.grammarBreakdown);
    const supabase = createServiceRoleSupabase();
    // One atomic call: counts increment, and everything this attempt could have
    // caught but didn't ages one step closer to being forgotten. A clean attempt
    // (no topics at all) still runs — that IS the improvement signal.
    const { error } = await supabase.rpc("record_production_weakness", {
      p_user_id: args.userId,
      p_topics: topics,
      p_scope_filter: scopeFilterFor(skill),
      p_surface: args.surface,
      p_attempt_id: args.attemptId,
      p_clean_streak_limit: PRODUCTION_WEAKNESS_CLEAN_STREAK_LIMIT,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error("[production-weakness] record skipped:", e);
  }
}

export type TopicHistory = {
  /** Index into the `items` the caller passed, so it can match results back. */
  index: number;
  /** Attempts in which this mistake appeared, INCLUDING the one being viewed. */
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  /** A different, earlier instance of the same mistake, if one was stored. */
  previousExample: WeaknessExample | null;
};

/**
 * "You've made this mistake N times" for the topics in one report.
 * Only topics that have recurred (count >= 2) are returned — a first-time
 * mistake is not a pattern. Returns [] on any failure; the report renders as before.
 */
export async function fetchTopicHistory(args: {
  userId: string;
  items: { topicEn: string; topicTh: string; wrong: string }[];
}): Promise<TopicHistory[]> {
  try {
    const keyed = args.items.map((it, index) => {
      const topicEn =
        canonicalizeGrammarTopicEn(it.topicEn) || canonicalizeGrammarTopicEn(it.topicTh) || it.topicEn;
      return { index, wrong: it.wrong, key: normalizeProductionTopicKey(topicEn, it.topicTh) };
    });
    const keys = [...new Set(keyed.map((k) => k.key).filter(Boolean))];
    if (keys.length === 0) return [];

    const supabase = createServiceRoleSupabase();
    const base = () =>
      supabase.from("production_weakness_history");
    let res = await base()
      .select("topic_key, occurrence_count, first_seen_at, last_seen_at, examples")
      .eq("user_id", args.userId)
      .in("topic_key", keys)
      .gte("occurrence_count", PRODUCTION_WEAKNESS_MIN_OCCURRENCES);
    if (res.error) {
      // Migration 051 (the `examples` column) may not be deployed yet — the
      // counts are still worth showing without the "last time you wrote" quote.
      res = (await base()
        .select("topic_key, occurrence_count, first_seen_at, last_seen_at")
        .eq("user_id", args.userId)
        .in("topic_key", keys)
        .gte("occurrence_count", PRODUCTION_WEAKNESS_MIN_OCCURRENCES)) as typeof res;
    }
    if (res.error) throw new Error(res.error.message);
    const data = res.data as Record<string, unknown>[] | null;

    const byKey = new Map((data ?? []).map((r) => [String(r.topic_key), r]));
    const out: TopicHistory[] = [];
    for (const k of keyed) {
      const row = byKey.get(k.key);
      if (!row) continue;
      const examples = Array.isArray(row.examples) ? (row.examples as WeaknessExample[]) : [];
      out.push({
        index: k.index,
        occurrenceCount: Number(row.occurrence_count ?? 0),
        firstSeenAt: String(row.first_seen_at),
        lastSeenAt: String(row.last_seen_at),
        previousExample: examples.find((e) => e?.wrong && e.wrong !== k.wrong) ?? null,
      });
    }
    return out;
  } catch (e) {
    console.error("[production-weakness] history skipped:", e);
    return [];
  }
}
