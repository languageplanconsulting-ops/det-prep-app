/**
 * Per-user unit-completion scores for the บทเรียน guided course.
 *
 * Web equivalent of det-mobile/src/lib/lessons-progress.ts — reads/writes the
 * SAME shared `lesson_unit_progress` table with the SAME unit_key format
 * (`${topic}:${tier}:${unit}`) and the SAME best-score-wins merge rule, so a
 * unit finished on mobile shows as done on web and vice versa. Local-first
 * via localStorage (mirrors mobile's AsyncStorage cache) so the path UI
 * advances instantly even before the network write lands.
 */
import { getBrowserSupabase } from "@/lib/supabase-browser";

const STORAGE_KEY = "ep-lessons-progress-v1";

export type UnitScores = Record<string, number>;

let cache: UnitScores | null = null;

export function unitKey(topic: string, tier: string, unit: number): string {
  return `${topic}:${tier}:${unit}`;
}

function readLocal(): UnitScores {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UnitScores) : {};
  } catch {
    return {};
  }
}

function writeLocal(scores: UnitScores): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    /* storage unavailable — in-memory cache still covers this session */
  }
}

async function fetchRemoteScores(userId: string | null | undefined): Promise<UnitScores> {
  if (!userId) return {};
  try {
    const supabase = getBrowserSupabase();
    if (!supabase) return {};
    const { data } = await supabase
      .from("lesson_unit_progress")
      .select("unit_key, pct")
      .eq("user_id", userId)
      .limit(10000);
    const remote: UnitScores = {};
    for (const row of (data ?? []) as { unit_key: string; pct: number }[]) {
      remote[row.unit_key] = row.pct;
    }
    return remote;
  } catch {
    return {};
  }
}

/**
 * Reads local storage and, when a userId is given, merges in the remote
 * best-effort — best score per unit wins either way (same rule as mobile).
 */
export async function loadLessonProgress(userId?: string | null): Promise<UnitScores> {
  const stored = readLocal();
  if (cache) {
    for (const [k, v] of Object.entries(cache)) {
      if ((stored[k] ?? -1) < v) stored[k] = v;
    }
  }
  const remote = await fetchRemoteScores(userId);
  let changed = false;
  for (const [k, v] of Object.entries(remote)) {
    if ((stored[k] ?? -1) < v) { stored[k] = v; changed = true; }
  }
  cache = stored;
  if (changed) writeLocal(stored);
  return cache;
}

export function getLessonProgress(): UnitScores {
  return cache ?? {};
}

/** Record a completed unit's best score (keeps the highest), local + remote. */
export async function saveUnitScore(
  userId: string | null | undefined,
  topic: string,
  tier: string,
  unit: number,
  pct: number,
): Promise<void> {
  const all = await loadLessonProgress(userId);
  const key = unitKey(topic, tier, unit);
  const next = Math.max(0, Math.min(100, Math.round(pct)));
  if ((all[key] ?? -1) >= next) return;
  all[key] = next;
  cache = all;
  writeLocal(all);
  if (!userId) return;
  try {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase
      .from("lesson_unit_progress")
      .upsert({ user_id: userId, unit_key: key, pct: next }, { onConflict: "user_id,unit_key" });
  } catch {
    // best-effort — local mirror already recorded it
  }
}

export type UnitState = "locked" | "open" | "done";

export function unitState(scores: UnitScores, topic: string, tier: string, unit: number): UnitState {
  const key = unitKey(topic, tier, unit);
  if (key in scores) return "done";
  if (unit === 0) return "open";
  return unitKey(topic, tier, unit - 1) in scores ? "open" : "locked";
}

export type UnitSeenState = "locked" | "open" | "partial" | "done";

export function unitSeenState(
  scores: UnitScores,
  topic: string,
  tier: string,
  unit: number,
  seenCountInUnit: number,
): UnitSeenState {
  const base = unitState(scores, topic, tier, unit);
  if (base === "locked" || base === "done") return base;
  return seenCountInUnit > 0 ? "partial" : "open";
}

/** 0–3 stars from a percentage. */
export function stars(pct: number): number {
  if (pct >= 100) return 3;
  if (pct >= 80) return 2;
  if (pct >= 60) return 1;
  return 0;
}

// ── Mid-unit resume ────────────────────────────────────────────────────────
const RESUME_KEY = "ep-lessons-resume-v1";

export type UnitResume = { index: number; a: number };

function readAllResume(): Record<string, UnitResume> {
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as Record<string, UnitResume>) : {};
  } catch {
    return {};
  }
}

function writeAllResume(all: Record<string, UnitResume>): void {
  try {
    window.localStorage.setItem(RESUME_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

export function saveUnitResume(topic: string, tier: string, unit: number, r: UnitResume): void {
  const all = readAllResume();
  all[unitKey(topic, tier, unit)] = r;
  writeAllResume(all);
}

export function loadUnitResume(topic: string, tier: string, unit: number): UnitResume | null {
  return readAllResume()[unitKey(topic, tier, unit)] ?? null;
}

export function clearUnitResume(topic: string, tier: string, unit: number): void {
  const all = readAllResume();
  delete all[unitKey(topic, tier, unit)];
  writeAllResume(all);
}
