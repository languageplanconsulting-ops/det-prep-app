import { parseDialogueSummaryBankJson } from "@/lib/dialogue-summary-admin";
import {
  DIALOGUE_SUMMARY_DIFFICULTIES,
  DIALOGUE_SUMMARY_ROUND_NUMBERS,
  DIALOGUE_SUMMARY_SET_COUNT,
} from "@/lib/dialogue-summary-constants";
import { emptyDialogueSummaryFullBank } from "@/lib/dialogue-summary-default-data";
import type {
  DialogueSummaryDifficulty,
  DialogueSummaryExam,
  DialogueSummaryFullBank,
  DialogueSummaryProgressRecord,
  DialogueSummaryRoundNum,
} from "@/types/dialogue-summary";

const BANK_KEY = "ep-dialogue-summary-bank-v1";
const PROGRESS_KEY = "ep-dialogue-summary-progress-v1";
export const DIALOGUE_SUMMARY_ADMIN_OCCUPANCY_KEY = "ep-dialogue-summary-admin-uploaded-v1";

function emitDialogueSummaryUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-dialogue-summary-storage"));
}

function progressKey(round: DialogueSummaryRoundNum, difficulty: DialogueSummaryDifficulty, setNumber: number): string {
  return `${round}:${difficulty}:${setNumber}`;
}

type ProgressMap = Record<string, DialogueSummaryProgressRecord>;

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

function isRound(n: number): n is DialogueSummaryRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export type DialogueSummaryAdminOccupancy = Record<
  DialogueSummaryRoundNum,
  Record<DialogueSummaryDifficulty, number[]>
>;

function emptyDialogueSummaryOccupancy(): DialogueSummaryAdminOccupancy {
  const out = {} as DialogueSummaryAdminOccupancy;
  for (const r of DIALOGUE_SUMMARY_ROUND_NUMBERS) {
    out[r] = { easy: [], medium: [], hard: [] };
  }
  return out;
}

function migrateDialogueSummaryOccupancy(raw: unknown): DialogueSummaryAdminOccupancy {
  const occ = emptyDialogueSummaryOccupancy();
  if (!raw || typeof raw !== "object") return occ;
  const o = raw as Record<string, unknown>;
  for (const r of DIALOGUE_SUMMARY_ROUND_NUMBERS) {
    const block = o[String(r)];
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    for (const d of DIALOGUE_SUMMARY_DIFFICULTIES) {
      const arr = b[d];
      occ[r][d] = Array.isArray(arr) ? (arr as number[]).filter((n) => Number.isInteger(n)) : [];
    }
  }
  return occ;
}

export function loadDialogueSummaryAdminOccupancy(): DialogueSummaryAdminOccupancy {
  if (typeof window === "undefined") return emptyDialogueSummaryOccupancy();
  try {
    const raw = localStorage.getItem(DIALOGUE_SUMMARY_ADMIN_OCCUPANCY_KEY);
    if (!raw) return emptyDialogueSummaryOccupancy();
    return migrateDialogueSummaryOccupancy(JSON.parse(raw));
  } catch {
    return emptyDialogueSummaryOccupancy();
  }
}

function saveDialogueSummaryAdminOccupancy(next: DialogueSummaryAdminOccupancy): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DIALOGUE_SUMMARY_ADMIN_OCCUPANCY_KEY, JSON.stringify(next));
}

function registerDialogueSummaryAdminSlots(
  round: DialogueSummaryRoundNum,
  difficulty: DialogueSummaryDifficulty,
  setNumbers: number[],
): void {
  const occ = loadDialogueSummaryAdminOccupancy();
  occ[round][difficulty] = [...new Set([...occ[round][difficulty], ...setNumbers])].sort((a, b) => a - b);
  saveDialogueSummaryAdminOccupancy(occ);
}

function isV1FlatBank(o: unknown): o is Record<DialogueSummaryDifficulty, DialogueSummaryExam[]> {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const x = o as Record<string, unknown>;
  return "easy" in x && "medium" in x && "hard" in x && !("1" in x);
}

function migrateFlatToFull(
  flat: Record<DialogueSummaryDifficulty, DialogueSummaryExam[]>,
): DialogueSummaryFullBank {
  const bank = emptyDialogueSummaryFullBank();
  const round = 1 as DialogueSummaryRoundNum;
  for (const d of DIALOGUE_SUMMARY_DIFFICULTIES) {
    const arr = flat[d];
    if (!Array.isArray(arr)) continue;
    bank[round][d] = arr
      .filter((e) => e && typeof e === "object")
      .map((e) => ({ ...(e as DialogueSummaryExam), round }));
  }
  return bank;
}

function parseStoredBank(raw: string | null): DialogueSummaryFullBank {
  const base = emptyDialogueSummaryFullBank();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isV1FlatBank(parsed)) {
      return migrateFlatToFull(parsed);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    const o = parsed as Record<string, unknown>;
    for (const r of DIALOGUE_SUMMARY_ROUND_NUMBERS) {
      const block = o[String(r)];
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      for (const level of DIALOGUE_SUMMARY_DIFFICULTIES) {
        const arr = b[level];
        if (!Array.isArray(arr)) continue;
        const bySet = new Map<number, DialogueSummaryExam>();
        for (const row of base[r][level]) bySet.set(row.setNumber, row);
        for (const item of arr) {
          if (!item || typeof item !== "object") continue;
          const it = item as Partial<DialogueSummaryExam>;
          if (
            typeof it.setNumber === "number" &&
            it.setNumber >= 1 &&
            it.setNumber <= DIALOGUE_SUMMARY_SET_COUNT &&
            typeof it.id === "string" &&
            typeof it.titleEn === "string" &&
            typeof it.titleTh === "string" &&
            Array.isArray(it.scenarioSentences) &&
            it.scenarioSentences.length === 5 &&
            Array.isArray(it.dialogue) &&
            it.dialogue.length > 0
          ) {
            const roundNum = typeof it.round === "number" && isRound(it.round) ? it.round : r;
            bySet.set(it.setNumber, {
              id: it.id,
              round: roundNum,
              difficulty: level,
              setNumber: it.setNumber,
              titleEn: it.titleEn,
              titleTh: it.titleTh,
              scenarioSentences: it.scenarioSentences as string[],
              dialogue: it.dialogue as DialogueSummaryExam["dialogue"],
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

export function loadDialogueSummaryBank(): DialogueSummaryFullBank {
  if (typeof window === "undefined") return emptyDialogueSummaryFullBank();
  return parseStoredBank(localStorage.getItem(BANK_KEY));
}

export function persistDialogueSummaryBank(bank: DialogueSummaryFullBank): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BANK_KEY, JSON.stringify(bank));
  emitDialogueSummaryUpdate();
}

export function getDialogueSummaryExam(
  round: DialogueSummaryRoundNum,
  difficulty: DialogueSummaryDifficulty,
  setNumber: number,
): DialogueSummaryExam | null {
  const bank = loadDialogueSummaryBank();
  return bank[round][difficulty].find((e) => e.setNumber === setNumber) ?? null;
}

/** Learner-facing bank: only admin-uploaded slots are visible (no default/premade sets). */
export function loadDialogueSummaryVisibleBank(): DialogueSummaryFullBank {
  const bank = loadDialogueSummaryBank();
  const occ = loadDialogueSummaryAdminOccupancy();
  const out = emptyDialogueSummaryFullBank();
  for (const r of DIALOGUE_SUMMARY_ROUND_NUMBERS) {
    for (const d of DIALOGUE_SUMMARY_DIFFICULTIES) {
      const allowed = new Set(occ[r][d]);
      out[r][d] = bank[r][d]
        .filter((e) => allowed.has(e.setNumber))
        .sort((a, b) => a.setNumber - b.setNumber);
    }
  }
  return out;
}

export function getDialogueSummaryVisibleExam(
  round: DialogueSummaryRoundNum,
  difficulty: DialogueSummaryDifficulty,
  setNumber: number,
): DialogueSummaryExam | null {
  return loadDialogueSummaryVisibleBank()[round][difficulty].find((e) => e.setNumber === setNumber) ?? null;
}

export function loadDialogueSummaryProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  return safeParseProgress(localStorage.getItem(PROGRESS_KEY));
}

export function getDialogueSummaryProgress(
  round: DialogueSummaryRoundNum,
  difficulty: DialogueSummaryDifficulty,
  setNumber: number,
): DialogueSummaryProgressRecord | null {
  return loadDialogueSummaryProgressMap()[progressKey(round, difficulty, setNumber)] ?? null;
}

export function saveDialogueSummaryBestScore(args: {
  round: DialogueSummaryRoundNum;
  difficulty: DialogueSummaryDifficulty;
  setNumber: number;
  score160: number;
}): DialogueSummaryProgressRecord {
  const { round, difficulty, setNumber, score160 } = args;
  const m = loadDialogueSummaryProgressMap();
  const k = progressKey(round, difficulty, setNumber);
  const prev = m[k];
  const bestScore160 = prev ? Math.max(prev.bestScore160, score160) : score160;
  const next: DialogueSummaryProgressRecord = {
    bestScore160,
    updatedAt: new Date().toISOString(),
  };
  m[k] = next;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(m));
  emitDialogueSummaryUpdate();
  return next;
}

export function mergeDialogueSummaryBankFromAdmin(text: string): { count: number } {
  const exams = parseDialogueSummaryBankJson(text.trim());
  const bank = loadDialogueSummaryBank();
  for (const ex of exams) {
    const r = ex.round;
    const d = ex.difficulty;
    const map = new Map<number, DialogueSummaryExam>();
    for (const row of bank[r][d]) map.set(row.setNumber, row);
    map.set(ex.setNumber, ex);
    bank[r][d] = [...map.values()].sort((a, b) => a.setNumber - b.setNumber);
  }
  persistDialogueSummaryBank(bank);
  for (const ex of exams) {
    registerDialogueSummaryAdminSlots(ex.round, ex.difficulty, [ex.setNumber]);
  }
  return { count: exams.length };
}

export function revertDialogueSummarySetsToDefaults(
  round: DialogueSummaryRoundNum,
  difficulty: DialogueSummaryDifficulty,
  setNumbers: number[],
): void {
  if (setNumbers.length === 0) return;
  const bank = loadDialogueSummaryBank();
  const byNum = new Map(bank[round][difficulty].map((x) => [x.setNumber, x]));
  for (const n of setNumbers) {
    byNum.delete(n);
  }
  bank[round][difficulty] = [...byNum.values()].sort((a, b) => a.setNumber - b.setNumber);
  persistDialogueSummaryBank(bank);
}

/** Group by round+difficulty for admin upload revert. */
export function revertDialogueSummarySlots(
  slots: { round: DialogueSummaryRoundNum; difficulty: DialogueSummaryDifficulty; setNumber: number }[],
): void {
  if (slots.length === 0) return;
  const map = new Map<string, { round: DialogueSummaryRoundNum; difficulty: DialogueSummaryDifficulty; nums: Set<number> }>();
  for (const s of slots) {
    const k = `${s.round}:${s.difficulty}`;
    let g = map.get(k);
    if (!g) {
      g = { round: s.round, difficulty: s.difficulty, nums: new Set<number>() };
      map.set(k, g);
    }
    g.nums.add(s.setNumber);
  }
  for (const g of map.values()) {
    revertDialogueSummarySetsToDefaults(g.round, g.difficulty, [...g.nums]);
  }
}

export function countDialogueSummarySetsInBank(): number {
  const b = loadDialogueSummaryVisibleBank();
  let n = 0;
  for (const r of DIALOGUE_SUMMARY_ROUND_NUMBERS) {
    for (const d of DIALOGUE_SUMMARY_DIFFICULTIES) n += b[r][d].length;
  }
  return n;
}

export function getDialogueSummaryRoundStats(round: DialogueSummaryRoundNum): {
  avgPercent: number | null;
  latestAttemptDate: string | null;
} {
  const bank = loadDialogueSummaryVisibleBank();
  const progMap = loadDialogueSummaryProgressMap();
  const percents: number[] = [];
  let latest: string | null = null;
  for (const d of DIALOGUE_SUMMARY_DIFFICULTIES) {
    for (const item of bank[round][d]) {
      const k = progressKey(round, d, item.setNumber);
      const p = progMap[k];
      if (p) {
        percents.push((p.bestScore160 / 160) * 100);
        if (!latest || p.updatedAt > latest) latest = p.updatedAt;
      }
    }
  }
  if (percents.length === 0) return { avgPercent: null, latestAttemptDate: null };
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  return { avgPercent: Math.round(avg * 10) / 10, latestAttemptDate: latest };
}
