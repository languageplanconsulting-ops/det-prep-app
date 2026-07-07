/**
 * Global per-user "seen" tracker for บทเรียน (lesson) content items.
 *
 * Web equivalent of det-mobile/src/lib/lesson-seen.ts — reads/writes the SAME
 * shared `lesson_item_seen` Supabase table with the SAME item_key format
 * (`${skill}:${id}`), so an item marked seen on mobile never resurfaces on
 * web and vice versa. Local-first via localStorage (mirrors mobile's
 * AsyncStorage cache) so exclusion works immediately even if the network
 * write hasn't landed yet.
 */
import { getBrowserSupabase } from "@/lib/supabase-browser";

const LOCAL_KEY = "ep-lesson-seen-v1";

export type LessonSkillTag =
  | "dictation"
  | "photowrite"
  | "readspeak"
  | "speakphoto"
  | "realword_lesson"
  | "campusvocab"
  | "missingparagraph"
  | "findinfo"
  | "mainidea"
  | "readwrite"
  | "besttitle"
  | "vocabcomprehension";

export type LessonSeenSource = "daily_lesson" | "manual_browse";

function getLocalSeenKeys(): Set<string> {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markLocalSeen(key: string): void {
  try {
    const keys = getLocalSeenKeys();
    keys.add(key);
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify([...keys]));
  } catch {
    /* storage unavailable — in-memory only for this session */
  }
}

/** Stable global key for one item: "<bankTag>:<item.id>". */
export function itemKey(bankTag: LessonSkillTag, id: string): string {
  return `${bankTag}:${id}`;
}

/** Everything this user has ever seen, across every lesson skill (mobile + web). */
export async function fetchSeenKeys(userId: string | null | undefined): Promise<Set<string>> {
  const keys = getLocalSeenKeys();
  if (!userId) return keys;
  try {
    const supabase = getBrowserSupabase();
    if (!supabase) return keys;
    const { data } = await supabase
      .from("lesson_item_seen")
      .select("item_key")
      .eq("user_id", userId)
      .limit(10000);
    for (const row of (data ?? []) as { item_key: string }[]) {
      keys.add(row.item_key);
    }
  } catch {
    // table unreachable / offline — local set still enforces the rule
  }
  return keys;
}

/** Mark one item seen. Idempotent — safe to call from both mobile and web. */
export async function markItemSeen(
  userId: string | null | undefined,
  key: string,
  skill: LessonSkillTag,
  source: LessonSeenSource,
): Promise<void> {
  if (!key) return;
  markLocalSeen(key);
  if (!userId) return;
  try {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase
      .from("lesson_item_seen")
      .upsert({ user_id: userId, item_key: key, skill, source }, { onConflict: "user_id,item_key", ignoreDuplicates: true });
  } catch {
    // best-effort — local mirror already recorded it
  }
}

/** Filter items down to ones not yet seen, keyed via keyFn. */
export function filterUnseen<T>(items: T[], keyFn: (item: T) => string, seenKeys: Set<string>): T[] {
  return items.filter((item) => !seenKeys.has(keyFn(item)));
}
