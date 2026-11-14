import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { fetchPracticeAttempts, fetchPracticeSetList, fetchPracticeSetMeta } from "./api";
import { PRACTICE_ROUNDS } from "./fitb-constants";
import { buildContentKey, packSubIndexed } from "./practice-progress";
import { READING_ROUNDS } from "./reading-constants";
import type { ReadingSet, VocabSet } from "./types";

/**
 * Daily practice: the learner says how many minutes they have, we build a random mix of the
 * five auto-graded skills from content they have NEVER finished (on web or app — both write
 * practice_attempts with the same contentKey), save it as today's plan, and tick items off as
 * matching attempts appear. Only when a skill's pool is exhausted do we reuse the item done
 * longest ago.
 */
export type DailyMinutes = 10 | 15 | 30 | 45 | 60;
export const DAILY_MINUTES: DailyMinutes[] = [10, 15, 30, 45, 60];

export type DailySkill = "dictation" | "fitb" | "vocab" | "reading" | "realword";
type Difficulty = "easy" | "medium" | "hard";

export const DAILY_SKILL_META: Record<
  DailySkill,
  { emoji: string; th: string; en: string; taskType: string; rounds: readonly number[] }
> = {
  dictation: { emoji: "🎧", th: "ตามคำบอก", en: "Dictation", taskType: "dictation", rounds: PRACTICE_ROUNDS },
  fitb: { emoji: "✏️", th: "เติมคำในช่องว่าง", en: "Fill in the blank", taskType: "fill_in_blanks", rounds: PRACTICE_ROUNDS },
  vocab: { emoji: "📚", th: "คำศัพท์", en: "Vocabulary", taskType: "vocabulary_reading", rounds: PRACTICE_ROUNDS },
  reading: { emoji: "📖", th: "การอ่าน", en: "Reading", taskType: "reading_comprehension", rounds: READING_ROUNDS },
  realword: { emoji: "🔤", th: "คำจริง / คำลวง", en: "Real word", taskType: "real_english_word", rounds: PRACTICE_ROUNDS },
};

/**
 * How many of each skill fit a time budget. Rough minutes per item: real word 1, dictation 1.5,
 * fill in the blank 2, vocabulary 3, reading 5 — the website's 10/30 recipes, extended.
 */
const RECIPES: Record<DailyMinutes, Partial<Record<DailySkill, number>>> = {
  10: { dictation: 2, fitb: 1, vocab: 1, realword: 2 },
  15: { dictation: 2, fitb: 2, vocab: 1, reading: 1, realword: 1 },
  30: { dictation: 3, fitb: 3, vocab: 2, reading: 2, realword: 3 },
  45: { dictation: 5, fitb: 4, vocab: 3, reading: 3, realword: 5 },
  60: { dictation: 6, fitb: 6, vocab: 4, reading: 4, realword: 6 },
};

export function recipeCount(minutes: DailyMinutes): number {
  return Object.values(RECIPES[minutes]).reduce((a, n) => a + (n ?? 0), 0);
}

export type DailyItem = {
  skill: DailySkill;
  round: number;
  difficulty: Difficulty;
  setNumber: number;
  /** Exam (reading) or passage (vocab) number inside the set. */
  sub?: number;
  contentKey: string;
  /** True when every unseen item was used up and this one is a repeat (oldest first). */
  repeat?: boolean;
};

export type DailyPlan = {
  dateIso: string;
  minutes: DailyMinutes;
  startedAt: string;
  items: DailyItem[];
};

export function dailyItemHref(it: DailyItem): string {
  const base = `/${it.skill}/${it.round}/${it.difficulty}/${it.setNumber}`;
  return it.skill === "reading" || it.skill === "vocab" ? `${base}/${it.sub ?? 1}` : base;
}

// ---------------------------------------------------------------- storage

const PLAN_KEY = "ep-daily-plan-v1";
const HISTORY_KEY = "ep-daily-history-v1";

async function readKey(key: string): Promise<string | null> {
  try {
    return Platform.OS === "web" ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeKey(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } else if (value == null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    /* ignore */
  }
}

/** Device-local calendar day, "YYYY-MM-DD". */
export function todayIso(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Items are stored compactly ("skill|diff|round|set|sub|r") to stay well under SecureStore's limits.
function packItem(it: DailyItem): string {
  return [it.skill, it.difficulty, it.round, it.setNumber, it.sub ?? "", it.repeat ? 1 : ""].join("|");
}

function unpackItem(s: string): DailyItem | null {
  const [skill, difficulty, round, set, sub, repeat] = s.split("|");
  if (!skill || !(skill in DAILY_SKILL_META) || !difficulty) return null;
  const item: DailyItem = {
    skill: skill as DailySkill,
    difficulty: difficulty as Difficulty,
    round: Number(round),
    setNumber: Number(set),
    sub: sub ? Number(sub) : undefined,
    contentKey: "",
    repeat: repeat === "1",
  };
  item.contentKey = contentKeyFor(item);
  return item;
}

function contentKeyFor(it: Omit<DailyItem, "contentKey">): string {
  const setNum = it.sub != null ? packSubIndexed(it.setNumber, it.sub) : it.setNumber;
  return buildContentKey(it.skill, it.difficulty, it.round, setNum);
}

/** Today's plan, or null when none was made today (yesterday's plan is ignored). */
export async function loadTodayPlan(): Promise<DailyPlan | null> {
  const raw = await readKey(PLAN_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { d: string; m: DailyMinutes; s: string; i: string[] };
    if (o.d !== todayIso()) return null;
    const items = (o.i ?? []).map(unpackItem).filter((x): x is DailyItem => x != null);
    return { dateIso: o.d, minutes: o.m, startedAt: o.s, items };
  } catch {
    return null;
  }
}

export async function saveTodayPlan(plan: DailyPlan): Promise<void> {
  await writeKey(PLAN_KEY, JSON.stringify({ d: plan.dateIso, m: plan.minutes, s: plan.startedAt, i: plan.items.map(packItem) }));
}

export async function clearTodayPlan(): Promise<void> {
  await writeKey(PLAN_KEY, null);
}

/** Per-skill result for one day: how many items were scored and their average %. */
export type SkillSummary = { count: number; avgPct: number };

export type DailyHistoryDay = {
  dateIso: string;
  minutes: DailyMinutes;
  done: number;
  total: number;
  /** Average score % over the finished items (null until one is finished). */
  avgPct?: number | null;
  /** Minutes from starting the plan to the last finished item. */
  spentMin?: number | null;
  skills?: Partial<Record<DailySkill, SkillSummary>>;
};

type StoredDay = [string, DailyMinutes, number, number, (number | null)?, (number | null)?, string?];

function packSkills(skills: DailyHistoryDay["skills"]): string {
  return Object.entries(skills ?? {})
    .map(([k, v]) => `${k}:${v!.count}:${Math.round(v!.avgPct)}`)
    .join(",");
}

function unpackSkills(s: string | undefined): DailyHistoryDay["skills"] {
  const out: DailyHistoryDay["skills"] = {};
  for (const part of (s ?? "").split(",").filter(Boolean)) {
    const [k, c, a] = part.split(":");
    if (k && k in DAILY_SKILL_META) out[k as DailySkill] = { count: Number(c), avgPct: Number(a) };
  }
  return out;
}

/** Last 60 days the learner made a plan, newest first. */
export async function loadHistory(): Promise<DailyHistoryDay[]> {
  const raw = await readKey(HISTORY_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as StoredDay[]).map(([dateIso, minutes, done, total, avgPct, spentMin, skills]) => ({
      dateIso,
      minutes,
      done,
      total,
      avgPct: avgPct ?? null,
      spentMin: spentMin ?? null,
      skills: unpackSkills(skills),
    }));
  } catch {
    return [];
  }
}

/** Upserts one day's summary into the saved history (kept compact for SecureStore). */
export async function recordHistory(day: DailyHistoryDay): Promise<DailyHistoryDay[]> {
  const rest = (await loadHistory()).filter((h) => h.dateIso !== day.dateIso);
  const next = [day, ...rest].sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1)).slice(0, 60);
  const stored: StoredDay[] = next.map((h) => [
    h.dateIso,
    h.minutes,
    h.done,
    h.total,
    h.avgPct == null ? null : Math.round(h.avgPct),
    h.spentMin == null ? null : Math.round(h.spentMin),
    packSkills(h.skills),
  ]);
  await writeKey(HISTORY_KEY, JSON.stringify(stored));
  return next;
}

/** Consecutive days (ending today or yesterday) where the whole plan was finished. */
export function streakDays(history: DailyHistoryDay[]): number {
  const full = new Set(history.filter((h) => h.total > 0 && h.done >= h.total).map((h) => h.dateIso));
  const day = new Date();
  if (!full.has(todayIso(day))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (full.has(todayIso(day))) {
    n += 1;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

// ---------------------------------------------------------------- attempts

/** contentKey → latest time it was finished, across web and app, for the daily skills. */
async function fetchDoneMap(skills: DailySkill[]): Promise<Map<string, number>> {
  const lists = await Promise.all(skills.map((s) => fetchPracticeAttempts(DAILY_SKILL_META[s].taskType)));
  const done = new Map<string, number>();
  for (const a of lists.flat()) {
    const ck = a.detail?.contentKey;
    if (typeof ck !== "string") continue;
    const t = Date.parse(a.created_at);
    if (!done.has(ck) || t > done.get(ck)!) done.set(ck, t);
  }
  return done;
}

export type ItemResult = { pct: number; at: number };

/**
 * Results for today's plan: each plan item finished since the plan started → its score % (the
 * latest attempt) and when. Ticks items off and feeds the report.
 */
export async function fetchPlanResults(plan: DailyPlan): Promise<Map<string, ItemResult>> {
  const skills = [...new Set(plan.items.map((i) => i.skill))];
  const since = Date.parse(plan.startedAt);
  const wanted = new Set(plan.items.map((i) => i.contentKey));
  const lists = await Promise.all(skills.map((s) => fetchPracticeAttempts(DAILY_SKILL_META[s].taskType)));
  const out = new Map<string, ItemResult>();
  for (const a of lists.flat()) {
    const ck = a.detail?.contentKey;
    if (typeof ck !== "string" || !wanted.has(ck)) continue;
    const at = Date.parse(a.created_at);
    if (!(at >= since)) continue;
    const prev = out.get(ck);
    if (!prev || at > prev.at) out.set(ck, { pct: Math.max(0, Math.min(100, a.score_pct ?? 0)), at });
  }
  return out;
}

/** Day summary (what the history and the report's trend use) from today's plan + results. */
export function summarizeDay(plan: DailyPlan, results: Map<string, ItemResult>): DailyHistoryDay {
  const skills: Partial<Record<DailySkill, SkillSummary>> = {};
  let sum = 0;
  let n = 0;
  let last = 0;
  for (const it of plan.items) {
    const r = results.get(it.contentKey);
    if (!r) continue;
    sum += r.pct;
    n += 1;
    last = Math.max(last, r.at);
    const cur = skills[it.skill] ?? { count: 0, avgPct: 0 };
    skills[it.skill] = { count: cur.count + 1, avgPct: (cur.avgPct * cur.count + r.pct) / (cur.count + 1) };
  }
  return {
    dateIso: plan.dateIso,
    minutes: plan.minutes,
    done: n,
    total: plan.items.length,
    avgPct: n ? sum / n : null,
    spentMin: n ? Math.max(1, (last - Date.parse(plan.startedAt)) / 60000) : null,
    skills,
  };
}

/** Average of the per-day averages over the `days` days before `dateIso` (null if none). */
export function previousAverage(history: DailyHistoryDay[], dateIso: string, days = 7): number | null {
  const prior = history.filter((h) => h.dateIso < dateIso && h.avgPct != null).slice(0, days);
  if (!prior.length) return null;
  return prior.reduce((a, h) => a + (h.avgPct ?? 0), 0) / prior.length;
}

/** Each skill's average over saved history (for "weakest skill overall"). */
export function skillAverages(history: DailyHistoryDay[]): Partial<Record<DailySkill, SkillSummary>> {
  const acc: Partial<Record<DailySkill, SkillSummary>> = {};
  for (const h of history) {
    for (const [k, v] of Object.entries(h.skills ?? {}) as [DailySkill, SkillSummary][]) {
      const cur = acc[k] ?? { count: 0, avgPct: 0 };
      acc[k] = { count: cur.count + v.count, avgPct: (cur.avgPct * cur.count + v.avgPct * v.count) / (cur.count + v.count) };
    }
  }
  return acc;
}

// ---------------------------------------------------------------- building

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Shuffle, then nudge so the same skill rarely appears twice in a row. */
function interleave(items: DailyItem[]): DailyItem[] {
  const out = shuffle(items);
  for (let i = 1; i < out.length; i++) {
    if (out[i]!.skill !== out[i - 1]!.skill) continue;
    const j = out.findIndex((x, k) => k > i && x.skill !== out[i - 1]!.skill);
    if (j > i) [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

type Lane = { skill: DailySkill; round: number; difficulty: Difficulty };

/** All playable items in one lane (skill × round × level); cached per build. */
async function laneItems(lane: Lane, cache: Map<string, Omit<DailyItem, "contentKey">[]>): Promise<Omit<DailyItem, "contentKey">[]> {
  const key = `${lane.skill}|${lane.round}|${lane.difficulty}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let items: Omit<DailyItem, "contentKey">[] = [];
  try {
    const sets = await fetchPracticeSetList({ skill: lane.skill, round: lane.round, difficulty: lane.difficulty });
    if (lane.skill === "reading" || lane.skill === "vocab") {
      // expand each set into its exams / passages (meta calls only for these two skills)
      const metas = await Promise.all(
        sets.map(async (setNumber) => {
          try {
            if (lane.skill === "reading") {
              const s = await fetchPracticeSetMeta<ReadingSet>({ skill: "reading", round: lane.round, difficulty: lane.difficulty, set: setNumber });
              return (s.exams ?? []).map((_, i) => ({ ...lane, setNumber, sub: i + 1 }));
            }
            const s = await fetchPracticeSetMeta<VocabSet>({ skill: "vocab", round: lane.round, set: setNumber });
            return (s.passages ?? [])
              .filter((p) => p.contentLevel === lane.difficulty)
              .map((p) => ({ ...lane, setNumber, sub: p.passageNumber }));
          } catch {
            return [];
          }
        }),
      );
      items = metas.flat();
    } else {
      items = sets.map((setNumber) => ({ ...lane, setNumber }));
    }
  } catch {
    // 403 (level above the learner's plan) or a network hiccup: treat the lane as empty
    items = [];
  }
  cache.set(key, items);
  return items;
}

/**
 * Builds a random plan for `minutes`, never repeating anything already finished (on web or app)
 * or already in this plan. Throws when no content at all could be reached.
 */
export async function buildDailyPlan(minutes: DailyMinutes): Promise<DailyPlan> {
  const recipe = RECIPES[minutes];
  const skills = Object.keys(recipe) as DailySkill[];
  const done = await fetchDoneMap(skills);
  const cache = new Map<string, Omit<DailyItem, "contentKey">[]>();
  const taken = new Set<string>();
  const items: DailyItem[] = [];

  for (const skill of skills) {
    const lanes = shuffle(
      DAILY_SKILL_META[skill].rounds.flatMap((round) => DIFFICULTIES.map((difficulty) => ({ skill, round, difficulty }))),
    );
    let need = recipe[skill] ?? 0;
    // Walk lanes in random order (three at a time) and stop once there are plenty of unseen
    // candidates — reading/vocab cost a call per set, so loading every lane would be slow.
    const all: DailyItem[] = [];
    let unseenCount = 0;
    for (let i = 0; i < lanes.length && unseenCount < need * 3; i += 3) {
      const batch = await Promise.all(lanes.slice(i, i + 3).map((l) => laneItems(l, cache)));
      for (const it of batch.flat()) {
        const full = { ...it, contentKey: contentKeyFor(it) };
        all.push(full);
        if (!done.has(full.contentKey) && !taken.has(full.contentKey)) unseenCount += 1;
      }
    }
    const unseen = shuffle(all.filter((it) => !done.has(it.contentKey)));
    const seenOldestFirst = all
      .filter((it) => done.has(it.contentKey))
      .sort((a, b) => done.get(a.contentKey)! - done.get(b.contentKey)!);

    for (const it of unseen) {
      if (need <= 0) break;
      if (taken.has(it.contentKey)) continue;
      taken.add(it.contentKey);
      items.push(it);
      need -= 1;
    }
    for (const it of seenOldestFirst) {
      if (need <= 0) break;
      if (taken.has(it.contentKey)) continue;
      taken.add(it.contentKey);
      items.push({ ...it, repeat: true });
      need -= 1;
    }
  }

  if (items.length === 0) throw new Error("no-content");
  return { dateIso: todayIso(), minutes, startedAt: new Date().toISOString(), items: interleave(items) };
}
