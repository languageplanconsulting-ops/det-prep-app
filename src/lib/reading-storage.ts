import {
  normalizeReadingSetsIncoming,
  parseReadingSetsJson,
} from "@/lib/reading-admin";
import {
  READING_DIFFICULTIES,
  READING_ROUND_NUMBERS,
} from "@/lib/reading-constants";
import { getCurrentBrowserUserId } from "@/lib/browser-user-scope";
import { defaultReadingFullBank, emptyReadingFullBank } from "@/lib/reading-default-data";
import type {
  ReadingDifficulty,
  ReadingExamUnit,
  ReadingFullBank,
  ReadingProgressRecord,
  ReadingRoundNum,
  ReadingSet,
} from "@/types/reading";

const READING_BANK_KEY = "ep-reading-sets";
const READING_PROGRESS_KEY = "ep-reading-progress-v3";
const READING_PROGRESS_LEGACY_KEY = "ep-reading-progress-v2";
const VOCAB_SAVED_KEY = "ep-reading-vocab-saved-v2";
const VOCAB_KNOWN_KEY = "ep-reading-vocab-known-v1";
export const READING_ADMIN_OCCUPANCY_KEY = "ep-reading-admin-uploaded-v1";

type ProgressMap = Record<string, ReadingProgressRecord>;

function emitReadingUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-reading-storage"));
}

function isRound(n: number): n is ReadingRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export type ReadingAdminOccupancy = Record<ReadingRoundNum, Record<ReadingDifficulty, number[]>>;

function emptyReadingOccupancy(): ReadingAdminOccupancy {
  const out = {} as ReadingAdminOccupancy;
  for (const r of READING_ROUND_NUMBERS) {
    out[r] = { easy: [], medium: [], hard: [] };
  }
  return out;
}

function migrateReadingOccupancy(raw: unknown): ReadingAdminOccupancy {
  const occ = emptyReadingOccupancy();
  if (!raw || typeof raw !== "object") return occ;
  const o = raw as Record<string, unknown>;
  for (const r of READING_ROUND_NUMBERS) {
    const block = o[String(r)];
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    for (const d of READING_DIFFICULTIES) {
      const arr = b[d];
      occ[r][d] = Array.isArray(arr) ? (arr as number[]).filter((n) => Number.isInteger(n)) : [];
    }
  }
  return occ;
}

export function loadReadingAdminOccupancy(): ReadingAdminOccupancy {
  if (typeof window === "undefined") return emptyReadingOccupancy();
  try {
    const raw = localStorage.getItem(READING_ADMIN_OCCUPANCY_KEY);
    if (!raw) return emptyReadingOccupancy();
    return migrateReadingOccupancy(JSON.parse(raw));
  } catch {
    return emptyReadingOccupancy();
  }
}

function saveReadingAdminOccupancy(next: ReadingAdminOccupancy): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(READING_ADMIN_OCCUPANCY_KEY, JSON.stringify(next));
}

function registerReadingAdminSlots(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumbers: number[],
): void {
  const occ = loadReadingAdminOccupancy();
  occ[round][difficulty] = [...new Set([...occ[round][difficulty], ...setNumbers])].sort((a, b) => a - b);
  saveReadingAdminOccupancy(occ);
}

function unregisterReadingAdminSlots(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumbers: number[],
): void {
  if (setNumbers.length === 0) return;
  const remove = new Set(setNumbers);
  const occ = loadReadingAdminOccupancy();
  occ[round][difficulty] = occ[round][difficulty].filter((n) => !remove.has(n));
  saveReadingAdminOccupancy(occ);
}

function progressExamKey(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examNumber: number,
): string {
  return `${round}:${difficulty}:${setNumber}:${examNumber}`;
}

function safeParseProgress(raw: string | null): ProgressMap {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    return o as ProgressMap;
  } catch {
    return {};
  }
}

function migrateLegacyProgress(legacy: ProgressMap): ProgressMap {
  const out: ProgressMap = {};
  for (const [k, v] of Object.entries(legacy)) {
    const parts = k.split(":");
    if (parts.length === 3) {
      out[`1:${parts[0]}:${parts[1]}:${parts[2]}`] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function readReadingProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  let v3 = safeParseProgress(localStorage.getItem(READING_PROGRESS_KEY));
  if (Object.keys(v3).length > 0) return v3;
  const v2 = safeParseProgress(localStorage.getItem(READING_PROGRESS_LEGACY_KEY));
  if (Object.keys(v2).length === 0) return {};
  v3 = migrateLegacyProgress(v2);
  try {
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(v3));
  } catch {
    /* ignore */
  }
  return v3;
}

export function loadReadingProgressMap(): ProgressMap {
  return readReadingProgressMap();
}

function legacyVocabKey(setNumber: number, examNumber: number, word: string): string {
  return `${setNumber}::${examNumber}::${word.trim().toLowerCase()}`;
}

function vocabStorageKey(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examNumber: number,
  word: string,
): string {
  return `${round}:${difficulty}:${setNumber}::${examNumber}::${word.trim().toLowerCase()}`;
}

function migrateLegacyArrayToBank(arr: ReadingSet[]): ReadingFullBank {
  const bank = emptyReadingFullBank();
  const r = 1 as ReadingRoundNum;
  for (const s of arr) {
    if (s.difficulty) {
      const d = s.difficulty;
      bank[r][d].push({ ...s, round: r, difficulty: d });
    } else {
      for (const d of READING_DIFFICULTIES) {
        bank[r][d].push({ ...structuredClone(s), round: r, difficulty: d });
      }
    }
  }
  for (const d of READING_DIFFICULTIES) {
    bank[r][d].sort((a, b) => a.setNumber - b.setNumber);
  }
  return bank;
}

function parseStoredBank(raw: string | null): ReadingFullBank {
  const base = defaultReadingFullBank();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return emptyReadingFullBank();
      }
      return migrateLegacyArrayToBank(parsed as ReadingSet[]);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    const o = parsed as Record<string, unknown>;
    for (const r of READING_ROUND_NUMBERS) {
      const block = o[String(r)];
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      for (const level of READING_DIFFICULTIES) {
        const arr = b[level];
        if (!Array.isArray(arr)) continue;
        const bySet = new Map<number, ReadingSet>();
        for (const row of base[r][level]) bySet.set(row.setNumber, row);
        for (const item of arr) {
          if (!item || typeof item !== "object") continue;
          const s = item as ReadingSet;
          if (typeof s.setNumber === "number" && Array.isArray(s.exams)) {
            const roundNum = typeof s.round === "number" && isRound(s.round) ? s.round : r;
            bySet.set(s.setNumber, {
              ...s,
              round: roundNum,
              difficulty: level,
              exams: s.exams,
            });
          }
        }
        base[r][level] = [...bySet.values()].sort((a, b) => a.setNumber - b.setNumber);
      }
    }
    return base;
  } catch {
    return base;
  }
}

export function loadReadingBank(): ReadingFullBank {
  if (typeof window === "undefined") return defaultReadingFullBank();
  return parseStoredBank(localStorage.getItem(READING_BANK_KEY));
}

/** Learner-facing bank: only admin-uploaded slots are visible (no default/premade sets). */
export function loadReadingVisibleBank(): ReadingFullBank {
  const bank = loadReadingBank();
  const occ = loadReadingAdminOccupancy();
  const out = emptyReadingFullBank();
  for (const r of READING_ROUND_NUMBERS) {
    for (const d of READING_DIFFICULTIES) {
      const allowed = new Set(occ[r][d]);
      out[r][d] = bank[r][d]
        .filter((s) => allowed.has(s.setNumber))
        .sort((a, b) => a.setNumber - b.setNumber);
    }
  }
  return out;
}

export function persistReadingBank(bank: ReadingFullBank): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(READING_BANK_KEY, JSON.stringify(bank));
  emitReadingUpdate();
}

/** Flattened sets (for admin summaries); includes round+difficulty on each row. */
export function loadReadingSets(): ReadingSet[] {
  const b = loadReadingBank();
  const out: ReadingSet[] = [];
  for (const r of READING_ROUND_NUMBERS) {
    for (const d of READING_DIFFICULTIES) {
      out.push(...b[r][d]);
    }
  }
  return out;
}

export function getReadingExamProgress(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examNumber: number,
): ReadingProgressRecord | null {
  const m = readReadingProgressMap();
  return m[progressExamKey(round, difficulty, setNumber, examNumber)] ?? null;
}

export function getReadingSetBestAcrossExams(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examCount: number,
): ReadingProgressRecord | null {
  let best: ReadingProgressRecord | null = null;
  for (let e = 1; e <= examCount; e++) {
    const p = getReadingExamProgress(round, difficulty, setNumber, e);
    if (!p) continue;
    if (!best || p.bestScore > best.bestScore) best = p;
  }
  return best;
}

export function saveReadingAttempt(args: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
  attainedScore: number;
  maxScore: number;
  correctCount: number;
}): ReadingProgressRecord {
  const { round, difficulty, setNumber, examNumber, attainedScore, maxScore, correctCount } = args;
  const m = readReadingProgressMap();
  const k = progressExamKey(round, difficulty, setNumber, examNumber);
  const prev = m[k];
  const bestScore = prev ? Math.max(prev.bestScore, attainedScore) : attainedScore;
  const next: ReadingProgressRecord = {
    bestScore,
    maxScore,
    lastScore: attainedScore,
    lastCorrectCount: correctCount,
    updatedAt: new Date().toISOString(),
    userId: getCurrentBrowserUserId() ?? undefined,
  };
  m[k] = next;
  localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(m));
  emitReadingUpdate();
  return next;
}

export function mergeReadingSetsFromAdmin(
  incoming: ReadingSet[],
  round: ReadingRoundNum,
): ReadingFullBank {
  const normalized = normalizeReadingSetsIncoming(incoming);
  const bank = loadReadingBank();
  for (const s of normalized) {
    const d = s.difficulty ?? "easy";
    if (d !== "easy" && d !== "medium" && d !== "hard") continue;
    const list = bank[round][d];
    const idx = list.findIndex((x) => x.setNumber === s.setNumber);
    const tagged: ReadingSet = { ...s, round, difficulty: d };
    if (idx >= 0) list[idx] = tagged;
    else list.push(tagged);
  }
  for (const d of READING_DIFFICULTIES) {
    bank[round][d].sort((a, b) => a.setNumber - b.setNumber);
  }
  persistReadingBank(bank);
  for (const d of READING_DIFFICULTIES) {
    registerReadingAdminSlots(
      round,
      d,
      normalized
        .filter((s) => (s.difficulty ?? "easy") === d)
        .map((s) => s.setNumber),
    );
  }
  return bank;
}

export function removeReadingSetFromAdmin(
  setNumber: number,
  difficulty: ReadingDifficulty,
  round: ReadingRoundNum,
): ReadingFullBank {
  const bank = loadReadingBank();
  bank[round][difficulty] = bank[round][difficulty].filter((s) => s.setNumber !== setNumber);
  persistReadingBank(bank);
  unregisterReadingAdminSlots(round, difficulty, [setNumber]);
  return bank;
}

export function removeReadingSetsFromAdmin(
  setNumbers: number[],
  difficulty: ReadingDifficulty,
  round: ReadingRoundNum,
): void {
  if (setNumbers.length === 0) return;
  const remove = new Set(setNumbers);
  const bank = loadReadingBank();
  bank[round][difficulty] = bank[round][difficulty].filter((s) => !remove.has(s.setNumber));
  persistReadingBank(bank);
  unregisterReadingAdminSlots(round, difficulty, setNumbers);
}

export function revertReadingSetsToDefaults(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumbers: number[],
): void {
  if (setNumbers.length === 0) return;
  const defaults = defaultReadingFullBank();
  const bank = loadReadingBank();
  const defByNum = new Map(defaults[round][difficulty].map((s) => [s.setNumber, s]));
  const byNum = new Map(bank[round][difficulty].map((s) => [s.setNumber, s]));
  for (const n of setNumbers) {
    const def = defByNum.get(n);
    if (def) byNum.set(n, { ...def });
    else byNum.delete(n);
  }
  bank[round][difficulty] = [...byNum.values()].sort((a, b) => a.setNumber - b.setNumber);
  persistReadingBank(bank);
  unregisterReadingAdminSlots(round, difficulty, setNumbers);
}

export function getReadingSetByNumber(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
): ReadingSet | undefined {
  const sets = loadReadingBank()[round][difficulty];
  return sets.find((s) => s.setNumber === setNumber);
}

export function getReadingVisibleSetByNumber(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
): ReadingSet | undefined {
  const sets = loadReadingVisibleBank()[round][difficulty];
  return sets.find((s) => s.setNumber === setNumber);
}

export function countReadingSetsInBank(): number {
  const b = loadReadingVisibleBank();
  let n = 0;
  for (const r of READING_ROUND_NUMBERS) {
    for (const d of READING_DIFFICULTIES) n += b[r][d].length;
  }
  return n;
}

export function getReadingRoundStats(round: ReadingRoundNum): {
  avgPercent: number | null;
  latestAttemptDate: string | null;
} {
  const bank = loadReadingVisibleBank();
  const progMap = readReadingProgressMap();
  const percents: number[] = [];
  let latest: string | null = null;
  for (const d of READING_DIFFICULTIES) {
    for (const set of bank[round][d]) {
      for (let e = 1; e <= set.exams.length; e++) {
        const k = progressExamKey(round, d, set.setNumber, e);
        const p = progMap[k];
        if (p) {
          percents.push(p.maxScore > 0 ? (p.bestScore / p.maxScore) * 100 : 0);
          if (!latest || p.updatedAt > latest) latest = p.updatedAt;
        }
      }
    }
  }
  if (percents.length === 0) return { avgPercent: null, latestAttemptDate: null };
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  return { avgPercent: Math.round(avg * 10) / 10, latestAttemptDate: latest };
}

export function getReadingExamFromSet(
  set: ReadingSet,
  examNumber: number,
): ReadingExamUnit | undefined {
  return set.exams[examNumber - 1];
}

export function loadReadingVocabSavedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(VOCAB_SAVED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function markReadingVocabSaved(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examNumber: number,
  word: string,
): void {
  if (typeof window === "undefined") return;
  const key = vocabStorageKey(round, difficulty, setNumber, examNumber, word);
  const s = loadReadingVocabSavedKeys();
  s.add(key);
  localStorage.setItem(VOCAB_SAVED_KEY, JSON.stringify([...s]));
}

export function isReadingVocabKeySaved(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examNumber: number,
  word: string,
): boolean {
  const keys = loadReadingVocabSavedKeys();
  if (keys.has(vocabStorageKey(round, difficulty, setNumber, examNumber, word))) return true;
  if (round === 1) {
    return keys.has(legacyVocabKey(setNumber, examNumber, word));
  }
  return false;
}

export function loadReadingVocabKnownKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(VOCAB_KNOWN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function markReadingVocabKnown(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examNumber: number,
  word: string,
): void {
  if (typeof window === "undefined") return;
  const key = vocabStorageKey(round, difficulty, setNumber, examNumber, word);
  const s = loadReadingVocabKnownKeys();
  s.add(key);
  localStorage.setItem(VOCAB_KNOWN_KEY, JSON.stringify([...s]));
}

export function isReadingVocabKnown(
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examNumber: number,
  word: string,
): boolean {
  const keys = loadReadingVocabKnownKeys();
  if (keys.has(vocabStorageKey(round, difficulty, setNumber, examNumber, word))) return true;
  if (round === 1) {
    return keys.has(legacyVocabKey(setNumber, examNumber, word));
  }
  return false;
}
