/**
 * Helpers for the "big randomize button" timed-random practice session
 * (src/components/practice/TimedRandomSession.tsx).
 *
 * The learner taps ONE big button on a rounds page, tells us how many minutes
 * they have, and we play random sets ACROSS LEVELS (every round, every allowed
 * difficulty) until the countdown runs out — then log the minutes to their
 * calendar (037_practice_minutes.sql) whether or not it matched the proposed plan.
 */
import type { RandomDifficulty } from "@/lib/practice-random";
import type { DailyPlanSkill } from "@/lib/study-plan/daily-plan";

export type TimedDifficulty = RandomDifficulty | "any";

export const TIMED_DIFFICULTIES: { id: TimedDifficulty; th: string }[] = [
  { id: "any", th: "ทุกระดับ" },
  { id: "easy", th: "ง่าย" },
  { id: "medium", th: "ปานกลาง" },
  { id: "hard", th: "ยาก" },
];

export const TIMED_DURATIONS: { minutes: number; th: string; emoji: string }[] = [
  { minutes: 5, th: "5 นาที", emoji: "⚡" },
  { minutes: 10, th: "10 นาที", emoji: "☕" },
  { minutes: 15, th: "15 นาที", emoji: "🔥" },
  { minutes: 20, th: "20 นาที", emoji: "💪" },
  { minutes: 30, th: "30 นาที", emoji: "🚀" },
];

export const TIMED_SKILL_META: Record<
  DailyPlanSkill,
  { emoji: string; th: string; en: string; accent: string; hubHref: string }
> = {
  realword: { emoji: "🔤", th: "คำจริง", en: "Real Word", accent: "#B45309", hubHref: "/practice/literacy/real-word" },
  dictation: { emoji: "🎧", th: "ตามคำบอก", en: "Dictation", accent: "#4F46E5", hubHref: "/practice/literacy/dictation" },
  fitb: { emoji: "✏️", th: "เติมคำในช่องว่าง", en: "Fill in the Blank", accent: "#0F766E", hubHref: "/practice/literacy/fill-in-blank" },
  reading: { emoji: "📖", th: "การอ่าน", en: "Reading", accent: "#B91C1C", hubHref: "/practice/comprehension/reading" },
  vocab: { emoji: "📚", th: "ศัพท์", en: "Vocabulary", accent: "#7C3AED", hubHref: "/practice/comprehension/vocabulary" },
};

const VALID_SKILLS: DailyPlanSkill[] = ["realword", "dictation", "fitb", "reading", "vocab"];

export function isTimedSkill(s: string): s is DailyPlanSkill {
  return (VALID_SKILLS as string[]).includes(s);
}

/** Local calendar date (YYYY-MM-DD) in the browser's own timezone, not UTC. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Window event addNotebookEntry dispatches after a successful save, so a running
 * timed session can count "new words learned today" without prop-drilling. */
export const NOTEBOOK_ADDED_EVENT = "ep-notebook-added";

export type PracticeMinutesLog = {
  practiceDate: string;
  skill: DailyPlanSkill;
  minutes: number;
  setsDone: number;
  wordsLearned: number;
  source?: string;
};

/** Best-effort record of a finished timed session. Never throws — the finish
 * screen must render even if the table isn't migrated or the network is down. */
export async function logPracticeMinutes(log: PracticeMinutesLog): Promise<void> {
  try {
    await fetch("/api/study-plan/practice-minutes", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...log, source: log.source ?? "randomized-timed" }),
    });
  } catch {
    /* best-effort — ignore */
  }
}

export type PracticeMinutesRow = {
  practice_date: string;
  skill: string;
  minutes: number;
  sets_done: number;
  words_learned: number;
};

/** Fetch the caller's freeform practice rows since a date (for the calendar). */
export async function fetchPracticeMinutes(since: string): Promise<PracticeMinutesRow[]> {
  try {
    const res = await fetch(`/api/study-plan/practice-minutes?since=${since}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { rows?: PracticeMinutesRow[] };
    return json.rows ?? [];
  } catch {
    return [];
  }
}
