/**
 * บทเรียน · ตามคำบอก (Dictation lesson) — shared types + helpers.
 * Ported from det-mobile/src/lib/lessons.ts to keep the mechanic identical:
 * same tokens/distractors shape, same checkDictation exact-match rule, same
 * DICTATION_UNIT_SIZE (10) so tier/unit numbering lines up with mobile.
 */
import { DICTATION_LESSONS } from "./dictation-lessons-data";

export type DictationTier = "easy" | "medium" | "advanced";

export type GrammarPoint = {
  labelEn: string;
  labelTh: string;
  en: string;
  th: string;
};

export type DictationLesson = {
  id: string;
  tier: DictationTier;
  level: "A2" | "B1" | "B2" | "C1";
  answer: string;
  tokens: string[];
  distractors: string[];
  hintEn: string;
  hintTh: string;
  points: GrammarPoint[];
};

export { DICTATION_LESSONS };

export const DICTATION_UNIT_SIZE = 10;

export const DICTATION_TIERS: {
  key: DictationTier;
  th: string;
  en: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  {
    key: "easy",
    th: "ระดับต้น",
    en: "Easy",
    cefr: "A2–B1",
    color: "#1B9E54",
    soft: "#DCF5E6",
    ink: "#1B7A4B",
    icon: "🌱",
    blurbTh: "พื้นฐานสำคัญ — ผันกริยา อดีต/ปัจจุบัน และคอมมาเบื้องต้น",
  },
  {
    key: "medium",
    th: "ระดับกลาง",
    en: "Medium",
    cefr: "B2",
    color: "#004AAD",
    soft: "#E7EFFF",
    ink: "#004AAD",
    icon: "⚡",
    blurbTh: "Perfect tense, Passive, เงื่อนไข และ relative clause",
  },
  {
    key: "advanced",
    th: "ระดับสูง",
    en: "Advanced",
    cefr: "C1",
    color: "#6B45C7",
    soft: "#E7E0FA",
    ink: "#6B45C7",
    icon: "👑",
    blurbTh: "Inversion, participle clause, cleft และเครื่องหมายวรรคตอนขั้นสูง",
  },
];

export function dictationByTier(tier: DictationTier): DictationLesson[] {
  return DICTATION_LESSONS.filter((l) => l.tier === tier);
}

export function dictationUnits(tier: DictationTier): DictationLesson[][] {
  const items = dictationByTier(tier);
  const units: DictationLesson[][] = [];
  for (let i = 0; i < items.length; i += DICTATION_UNIT_SIZE) {
    units.push(items.slice(i, i + DICTATION_UNIT_SIZE));
  }
  return units;
}

export function dictationUnit(tier: DictationTier, unit: number): DictationLesson[] {
  return dictationUnits(tier)[unit] ?? [];
}

/** A tile is punctuation (comma / period / etc.) rather than a word. */
export function isPunctuation(token: string): boolean {
  return /^[.,;:!?]$/.test(token);
}

/** True only when the learner's ordered tiles match the answer exactly. */
export function checkDictation(order: string[], tokens: string[]): boolean {
  if (order.length !== tokens.length) return false;
  return order.every((t, i) => t === tokens[i]);
}

/** Fisher–Yates shuffle (new array). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
