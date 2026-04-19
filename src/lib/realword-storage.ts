import { parseRealWordBankJson, realWordSetsToBank } from "@/lib/realword-admin";
import {
  REALWORD_DIFFICULTIES,
  REALWORD_MAX_SCORE,
  REALWORD_ROUND_NUMBERS,
  REALWORD_SET_COUNT,
} from "@/lib/realword-constants";
import { defaultRealWordFullBank } from "@/lib/realword-default-data";
import { realWordCounts, realWordRunScore } from "@/lib/realword-scoring";
import type {
  RealWordDifficulty,
  RealWordFullBank,
  RealWordProgressRecord,
  RealWordRoundNum,
  RealWordSet,
} from "@/types/realword";

const REALWORD_BANK_KEY = "ep-realword-bank-v1";
const REALWORD_PROGRESS_KEY = "ep-realword-progress-v2";
const REALWORD_PROGRESS_LEGACY_KEY = "ep-realword-progress-v1";
export const REALWORD_ADMIN_OCCUPANCY_KEY = "ep-realword-admin-uploaded-v1";

function emitRealWordUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-realword-storage"));
}

function progressKey(round: RealWordRoundNum, difficulty: RealWordDifficulty, setNumber: number): string {
  return `${round}:${difficulty}:${setNumber}`;
}

type ProgressMap = Record<string, RealWordProgressRecord>;

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
    if (parts.length === 2 && (parts[0] === "easy" || parts[0] === "medium" || parts[0] === "hard")) {
      out[`1:${parts[0]}:${parts[1]}`] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function readRealWordProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  let v2 = safeParseProgress(localStorage.getItem(REALWORD_PROGRESS_KEY));
  if (Object.keys(v2).length > 0) return v2;
  const v1 = safeParseProgress(localStorage.getItem(REALWORD_PROGRESS_LEGACY_KEY));
  if (Object.keys(v1).length === 0) return {};
  v2 = migrateLegacyProgress(v1);
  try {
    localStorage.setItem(REALWORD_PROGRESS_KEY, JSON.stringify(v2));
  } catch {
    /* ignore */
  }
  return v2;
}

export function loadRealWordProgressMap(): ProgressMap {
  return readRealWordProgressMap();
}

function isRound(n: number): n is RealWordRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export type RealWordAdminOccupancy = Record<RealWordRoundNum, Record<RealWordDifficulty, number[]>>;

/** Round 1 shipped defaults use ids like `RW_E_01` (not admin uploads like `RW_R1_EASY_S01_TOPIC_…`). */
const REALWORD_BUILTIN_ROUND1_SET_ID = /^RW_[EMH]_\d{2}$/;

/** True for seeded placeholder boards learners should not see until replaced by an admin upload. */
export function isRealWordBuiltInRound1Placeholder(set: RealWordSet): boolean {
  const r = set.round ?? 1;
  if (r !== 1) return false;
  return REALWORD_BUILTIN_ROUND1_SET_ID.test(set.setId.trim());
}

/**
 * Sets shown in the learner hub: real admin content only.
 * Rounds 2–5 default empty — anything in the bank counts. Round 1 hides built-in placeholders.
 */
export function isRealWordLearnerVisibleSet(round: RealWordRoundNum, set: RealWordSet): boolean {
  if (round >= 2) {
    return Array.isArray(set.words) && set.words.length > 0;
  }
  return !isRealWordBuiltInRound1Placeholder(set);
}

function emptyRealWordOccupancy(): RealWordAdminOccupancy {
  const occ = {} as RealWordAdminOccupancy;
  for (const r of REALWORD_ROUND_NUMBERS) {
    occ[r] = { easy: [], medium: [], hard: [] };
  }
  return occ;
}

function migrateRealWordOccupancy(raw: unknown): RealWordAdminOccupancy {
  const occ = emptyRealWordOccupancy();
  if (!raw || typeof raw !== "object") return occ;
  const o = raw as Record<string, unknown>;
  for (const r of REALWORD_ROUND_NUMBERS) {
    const block = o[String(r)];
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    for (const d of REALWORD_DIFFICULTIES) {
      const arr = b[d];
      occ[r][d] = Array.isArray(arr)
        ? (arr as number[]).filter((n) => Number.isInteger(n))
        : [];
    }
  }
  return occ;
}

export function loadRealWordAdminOccupancy(): RealWordAdminOccupancy {
  if (typeof window === "undefined") return emptyRealWordOccupancy();
  try {
    const raw = localStorage.getItem(REALWORD_ADMIN_OCCUPANCY_KEY);
    if (!raw) return emptyRealWordOccupancy();
    return migrateRealWordOccupancy(JSON.parse(raw));
  } catch {
    return emptyRealWordOccupancy();
  }
}

function saveRealWordAdminOccupancy(next: RealWordAdminOccupancy): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REALWORD_ADMIN_OCCUPANCY_KEY, JSON.stringify(next));
}

function isV1BankShape(o: unknown): o is Record<RealWordDifficulty, RealWordSet[]> {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const x = o as Record<string, unknown>;
  return "easy" in x && "medium" in x && "hard" in x && !("1" in x);
}

function migrateV1BankToFull(v1: Record<RealWordDifficulty, RealWordSet[]>): RealWordFullBank {
  const bank = defaultRealWordFullBank();
  const round = 1 as RealWordRoundNum;
  for (const d of REALWORD_DIFFICULTIES) {
    const arr = v1[d];
    if (!Array.isArray(arr)) continue;
    const byNum = new Map<number, RealWordSet>();
    for (const row of bank[round][d]) byNum.set(row.setNumber, row);
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const it = item as Partial<RealWordSet>;
      if (
        typeof it.setNumber === "number" &&
        it.setNumber >= 1 &&
        it.setNumber <= REALWORD_SET_COUNT &&
        typeof it.setId === "string" &&
        Array.isArray(it.words) &&
        it.words.length > 0
      ) {
        byNum.set(it.setNumber, {
          setNumber: it.setNumber,
          setId: it.setId,
          difficulty: d,
          round,
          words: it.words as RealWordSet["words"],
        });
      }
    }
    bank[round][d] = [...byNum.values()].sort((a, b) => a.setNumber - b.setNumber);
  }
  return bank;
}

function parseStoredBank(raw: string | null): RealWordFullBank {
  const base = defaultRealWordFullBank();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isV1BankShape(parsed)) {
      return migrateV1BankToFull(parsed);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    const o = parsed as Record<string, unknown>;
    for (const r of REALWORD_ROUND_NUMBERS) {
      const block = o[String(r)];
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      for (const level of REALWORD_DIFFICULTIES) {
        const arr = b[level];
        if (!Array.isArray(arr)) continue;
        const byNum = new Map<number, RealWordSet>();
        for (const row of base[r][level]) byNum.set(row.setNumber, row);
        for (const item of arr) {
          if (!item || typeof item !== "object") continue;
          const it = item as Partial<RealWordSet>;
          if (
            typeof it.setNumber === "number" &&
            it.setNumber >= 1 &&
            it.setNumber <= REALWORD_SET_COUNT &&
            typeof it.setId === "string" &&
            Array.isArray(it.words) &&
            it.words.length > 0
          ) {
            const roundNum = typeof it.round === "number" && isRound(it.round) ? it.round : r;
            byNum.set(it.setNumber, {
              setNumber: it.setNumber,
              setId: it.setId,
              difficulty: level,
              round: roundNum,
              words: it.words as RealWordSet["words"],
            });
          }
        }
        base[r][level] = [...byNum.values()].sort((a, b) => a.setNumber - b.setNumber);
      }
    }
    return base;
  } catch {
    return base;
  }
}

export function loadRealWordBank(): RealWordFullBank {
  if (typeof window === "undefined") return defaultRealWordFullBank();
  return parseStoredBank(localStorage.getItem(REALWORD_BANK_KEY));
}

/** Recompute `ep-realword-admin-uploaded-v1` from the bank so admin slot pickers match learner visibility. */
export function rebuildRealWordAdminOccupancyFromBank(bank: RealWordFullBank): void {
  const occ = emptyRealWordOccupancy();
  for (const r of REALWORD_ROUND_NUMBERS) {
    for (const d of REALWORD_DIFFICULTIES) {
      const nums: number[] = [];
      for (const s of bank[r][d]) {
        if (isRealWordLearnerVisibleSet(r, s)) nums.push(s.setNumber);
      }
      occ[r][d] = [...new Set(nums)].sort((a, b) => a - b);
    }
  }
  saveRealWordAdminOccupancy(occ);
}

export function persistRealWordBank(bank: RealWordFullBank): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REALWORD_BANK_KEY, JSON.stringify(bank));
  rebuildRealWordAdminOccupancyFromBank(bank);
  emitRealWordUpdate();
}

export function getRealWordSet(
  round: RealWordRoundNum,
  difficulty: RealWordDifficulty,
  setNumber: number,
): RealWordSet | null {
  const bank = loadRealWordBank();
  return bank[round][difficulty].find((s) => s.setNumber === setNumber) ?? null;
}

/** Learner-facing bank: hide Round 1 built-in placeholders; other rounds show any non-empty uploaded set. */
export function loadRealWordVisibleBank(): RealWordFullBank {
  const bank = loadRealWordBank();
  const out = defaultRealWordFullBank();
  for (const r of REALWORD_ROUND_NUMBERS) {
    for (const d of REALWORD_DIFFICULTIES) {
      out[r][d] = bank[r][d]
        .filter((s) => isRealWordLearnerVisibleSet(r, s))
        .sort((a, b) => a.setNumber - b.setNumber);
    }
  }
  return out;
}

export function getRealWordVisibleSet(
  round: RealWordRoundNum,
  difficulty: RealWordDifficulty,
  setNumber: number,
): RealWordSet | null {
  return loadRealWordVisibleBank()[round][difficulty].find((s) => s.setNumber === setNumber) ?? null;
}

export function getRealWordProgress(
  round: RealWordRoundNum,
  difficulty: RealWordDifficulty,
  setNumber: number,
): RealWordProgressRecord | null {
  return readRealWordProgressMap()[progressKey(round, difficulty, setNumber)] ?? null;
}

export function saveRealWordProgress(args: {
  round: RealWordRoundNum;
  difficulty: RealWordDifficulty;
  setNumber: number;
  selectedIndices: Set<number>;
  words: RealWordSet["words"];
}): RealWordProgressRecord {
  const { round, difficulty, setNumber, selectedIndices, words } = args;
  const maxScore = REALWORD_MAX_SCORE[difficulty];
  const { R, UR, M } = realWordCounts({ words, selectedIndices });
  const score = realWordRunScore(UR, M, R, maxScore);
  const m = readRealWordProgressMap();
  const k = progressKey(round, difficulty, setNumber);
  const prev = m[k];
  const bestScore = prev ? Math.max(prev.bestScore, score) : score;
  const next: RealWordProgressRecord = {
    bestScore,
    maxScore,
    updatedAt: new Date().toISOString(),
  };
  m[k] = next;
  localStorage.setItem(REALWORD_PROGRESS_KEY, JSON.stringify(m));
  emitRealWordUpdate();
  return next;
}

export function mergeRealWordBankFromAdmin(
  text: string,
  round: RealWordRoundNum,
  parseOptions?: { defaultDifficulty?: RealWordDifficulty },
): { count: number; sets: RealWordSet[] } {
  const sets = parseRealWordBankJson(text.trim(), parseOptions);
  const normalized = realWordSetsToBank(sets);
  const bank = loadRealWordBank();
  for (const d of REALWORD_DIFFICULTIES) {
    const map = new Map<number, RealWordSet>();
    for (const s of bank[round][d]) map.set(s.setNumber, s);
    for (const s of normalized[d]) {
      map.set(s.setNumber, { ...s, round });
    }
    bank[round][d] = [...map.values()].sort((a, b) => a.setNumber - b.setNumber);
  }
  persistRealWordBank(bank);
  return { count: sets.length, sets };
}

export function revertRealWordSetToDefault(
  round: RealWordRoundNum,
  difficulty: RealWordDifficulty,
  setNumber: number,
): void {
  const defaults = defaultRealWordFullBank();
  const bank = loadRealWordBank();
  const def = defaults[round][difficulty].find((s) => s.setNumber === setNumber);
  const byNum = new Map(bank[round][difficulty].map((s) => [s.setNumber, s]));
  if (def) {
    byNum.set(setNumber, {
      ...def,
      words: def.words.map((w) => ({ ...w })),
    });
  } else {
    byNum.delete(setNumber);
  }
  bank[round][difficulty] = [...byNum.values()].sort((a, b) => a.setNumber - b.setNumber);
  persistRealWordBank(bank);
}

export function realWordMaxForDifficulty(d: RealWordDifficulty): number {
  return REALWORD_MAX_SCORE[d];
}

export function countRealWordSetsInBank(): number {
  const b = loadRealWordVisibleBank();
  let n = 0;
  for (const r of REALWORD_ROUND_NUMBERS) {
    for (const d of REALWORD_DIFFICULTIES) n += b[r][d].length;
  }
  return n;
}

export function getRealWordRoundStats(round: RealWordRoundNum): {
  avgPercent: number | null;
  latestAttemptDate: string | null;
} {
  const bank = loadRealWordVisibleBank();
  const progMap = readRealWordProgressMap();
  const percents: number[] = [];
  let latest: string | null = null;
  for (const d of REALWORD_DIFFICULTIES) {
    for (const item of bank[round][d]) {
      const k = progressKey(round, d, item.setNumber);
      const p = progMap[k];
      if (p) {
        percents.push(p.maxScore > 0 ? (p.bestScore / p.maxScore) * 100 : 0);
        if (!latest || p.updatedAt > latest) latest = p.updatedAt;
      }
    }
  }
  if (percents.length === 0) return { avgPercent: null, latestAttemptDate: null };
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  return { avgPercent: Math.round(avg * 10) / 10, latestAttemptDate: latest };
}
