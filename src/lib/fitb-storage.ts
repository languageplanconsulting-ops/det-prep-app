import { normalizeFitbSetsForBank, parseFitbBankJson } from "@/lib/fitb-admin";
import { FITB_DIFFICULTIES, FITB_ROUND_NUMBERS, FITB_SET_COUNT, fitbMaxScore } from "@/lib/fitb-constants";
import { calculateFitbDetScore, gradesToExactLocks } from "@/lib/fitb-scoring";
import { buildDefaultFitbBank } from "@/lib/fitb-default-data";
import type {
  FitbBlankGrade,
  FitbDifficulty,
  FitbFullBank,
  FitbProgressRecord,
  FitbRoundNum,
  FitbSet,
} from "@/types/fitb";

const FITB_BANK_KEY = "ep-fitb-bank-v1";
const FITB_BANK_EMPTY_KEY = "ep-fitb-bank-empty-v1";
const FITB_PROGRESS_KEY = "ep-fitb-progress-v2";
const FITB_PROGRESS_LEGACY_KEY = "ep-fitb-progress-v1";
export const FITB_ADMIN_OCCUPANCY_KEY = "ep-fitb-admin-uploaded-v2";

export type FitbAdminOccupancy = Record<FitbRoundNum, Record<FitbDifficulty, number[]>>;

function emitFitbUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-fitb-storage"));
}

export function emptyFitbFullBank(): FitbFullBank {
  const base = {} as FitbFullBank;
  for (const n of FITB_ROUND_NUMBERS) {
    base[n] = { easy: [], medium: [], hard: [] };
  }
  return base;
}

function cloneFitbSet(s: FitbSet): FitbSet {
  return {
    ...s,
    missingWords: s.missingWords.map((m) => ({ ...m, synonyms: [...m.synonyms] })),
  };
}

function isRound(n: number): n is FitbRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

function emptyOccupancy(): FitbAdminOccupancy {
  const occ = {} as FitbAdminOccupancy;
  for (const r of FITB_ROUND_NUMBERS) {
    occ[r] = { easy: [], medium: [], hard: [] };
  }
  return occ;
}

/** Legacy flat occupancy → nested (assume round 1). */
function migrateOccupancy(raw: unknown): FitbAdminOccupancy {
  const occ = emptyOccupancy();
  for (const r of FITB_ROUND_NUMBERS) {
    for (const d of FITB_DIFFICULTIES) {
      occ[r][d] = [];
    }
  }
  if (!raw || typeof raw !== "object") return occ;
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.easy) && o["1"] === undefined) {
    occ[1].easy = (o.easy as number[]).filter((n) => Number.isInteger(n));
    occ[1].medium = Array.isArray(o.medium)
      ? (o.medium as number[]).filter((n) => Number.isInteger(n))
      : [];
    occ[1].hard = Array.isArray(o.hard) ? (o.hard as number[]).filter((n) => Number.isInteger(n)) : [];
    return occ;
  }
  for (const r of FITB_ROUND_NUMBERS) {
    const block = o[String(r)];
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    for (const d of FITB_DIFFICULTIES) {
      const arr = b[d];
      occ[r][d] = Array.isArray(arr) ? (arr as number[]).filter((n) => Number.isInteger(n)) : [];
    }
  }
  return occ;
}

export function loadFitbAdminOccupancy(): FitbAdminOccupancy {
  if (typeof window === "undefined") {
    return migrateOccupancy(null);
  }
  try {
    const raw = localStorage.getItem(FITB_ADMIN_OCCUPANCY_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("ep-fitb-admin-uploaded-v1");
      if (legacy) return migrateOccupancy(JSON.parse(legacy));
      return migrateOccupancy(null);
    }
    return migrateOccupancy(JSON.parse(raw));
  } catch {
    return migrateOccupancy(null);
  }
}

export function saveFitbAdminOccupancy(next: FitbAdminOccupancy): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FITB_ADMIN_OCCUPANCY_KEY, JSON.stringify(next));
}

export function registerFitbAdminSlots(
  round: FitbRoundNum,
  difficulty: FitbDifficulty,
  setNumbers: number[],
): void {
  const occ = loadFitbAdminOccupancy();
  occ[round][difficulty] = [...new Set([...occ[round][difficulty], ...setNumbers])].sort((a, b) => a - b);
  saveFitbAdminOccupancy(occ);
}

export function revertFitbAdminSlotsToDefaults(
  round: FitbRoundNum,
  difficulty: FitbDifficulty,
  setNumbers: number[],
): void {
  if (setNumbers.length === 0 || typeof window === "undefined") return;
  localStorage.removeItem(FITB_BANK_EMPTY_KEY);
  const defaults = buildDefaultFitbBank();
  const bank = loadFitbBank();
  const defByNum = new Map(defaults[round][difficulty].map((s) => [s.setNumber, s]));
  const byNum = new Map(bank[round][difficulty].map((s) => [s.setNumber, s]));
  for (const n of setNumbers) {
    const def = defByNum.get(n);
    if (def) byNum.set(n, cloneFitbSet(def));
    else byNum.delete(n);
  }
  bank[round][difficulty] = [...byNum.values()].sort((a, b) => a.setNumber - b.setNumber);
  persistFitbBank(bank);
  const occ = loadFitbAdminOccupancy();
  const remove = new Set(setNumbers);
  occ[round][difficulty] = occ[round][difficulty].filter((n) => !remove.has(n));
  saveFitbAdminOccupancy(occ);
}

function progressKey(round: FitbRoundNum, difficulty: FitbDifficulty, setNumber: number): string {
  return `${round}:${difficulty}:${setNumber}`;
}

type ProgressMap = Record<string, FitbProgressRecord>;

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

function readFitbProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  let v2 = safeParseProgress(localStorage.getItem(FITB_PROGRESS_KEY));
  if (Object.keys(v2).length > 0) return v2;
  const v1 = safeParseProgress(localStorage.getItem(FITB_PROGRESS_LEGACY_KEY));
  if (Object.keys(v1).length === 0) return {};
  v2 = migrateLegacyProgress(v1);
  try {
    localStorage.setItem(FITB_PROGRESS_KEY, JSON.stringify(v2));
  } catch {
    /* ignore */
  }
  return v2;
}

function isV1BankShape(o: unknown): o is Record<FitbDifficulty, FitbSet[]> {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const x = o as Record<string, unknown>;
  return "easy" in x && "medium" in x && "hard" in x && !("1" in x);
}

function migrateV1BankToFull(v1: Record<FitbDifficulty, FitbSet[]>): FitbFullBank {
  const bank = emptyFitbFullBank();
  const round = 1 as FitbRoundNum;
  for (const d of FITB_DIFFICULTIES) {
    const arr = v1[d];
    if (!Array.isArray(arr)) continue;
    bank[round][d] = arr.map((s) => {
      const row = { ...s } as FitbSet;
      if (!row.round) row.round = round;
      return row;
    });
  }
  return bank;
}

function parseStoredBank(raw: string | null): FitbFullBank {
  if (typeof window !== "undefined" && localStorage.getItem(FITB_BANK_EMPTY_KEY) === "1") {
    return emptyFitbFullBank();
  }
  const base = buildDefaultFitbBank();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isV1BankShape(parsed)) {
      return migrateV1BankToFull(parsed);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    const o = parsed as Record<string, unknown>;
    for (const r of FITB_ROUND_NUMBERS) {
      const block = o[String(r)];
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      for (const level of FITB_DIFFICULTIES) {
        const arr = b[level];
        if (!Array.isArray(arr)) continue;
        const byNum = new Map<number, FitbSet>();
        for (const row of base[r][level]) byNum.set(row.setNumber, row);
        for (const item of arr) {
          if (!item || typeof item !== "object") continue;
          const it = item as Partial<FitbSet>;
          if (
            typeof it.setNumber === "number" &&
            it.setNumber >= 1 &&
            it.setNumber <= FITB_SET_COUNT &&
            Array.isArray(it.missingWords) &&
            typeof it.passage === "string" &&
            typeof it.setId === "string" &&
            typeof it.difficulty === "string"
          ) {
            const roundNum = typeof it.round === "number" && isRound(it.round) ? it.round : r;
            byNum.set(it.setNumber, {
              setNumber: it.setNumber,
              setId: it.setId,
              round: roundNum,
              difficulty: it.difficulty as FitbDifficulty,
              cefrLevel: typeof it.cefrLevel === "string" ? it.cefrLevel : "—",
              passage: it.passage,
              missingWords: it.missingWords as FitbSet["missingWords"],
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

export function loadFitbBank(): FitbFullBank {
  if (typeof window === "undefined") return buildDefaultFitbBank();
  return parseStoredBank(localStorage.getItem(FITB_BANK_KEY));
}

export function persistFitbBank(bank: FitbFullBank): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FITB_BANK_EMPTY_KEY);
  localStorage.setItem(FITB_BANK_KEY, JSON.stringify(bank));
  emitFitbUpdate();
}

export function clearFitbBankFromAdmin(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FITB_BANK_EMPTY_KEY, "1");
  localStorage.setItem(FITB_BANK_KEY, JSON.stringify(emptyFitbFullBank()));
  saveFitbAdminOccupancy(emptyOccupancy());
  emitFitbUpdate();
}

export function getFitbSet(
  round: FitbRoundNum,
  difficulty: FitbDifficulty,
  setNumber: number,
): FitbSet | null {
  const bank = loadFitbBank();
  return bank[round][difficulty].find((s) => s.setNumber === setNumber) ?? null;
}

export function loadFitbProgressMap(): ProgressMap {
  return readFitbProgressMap();
}

export function getFitbProgress(
  round: FitbRoundNum,
  difficulty: FitbDifficulty,
  setNumber: number,
): FitbProgressRecord | null {
  return readFitbProgressMap()[progressKey(round, difficulty, setNumber)] ?? null;
}

export function saveFitbProgress(args: {
  round: FitbRoundNum;
  difficulty: FitbDifficulty;
  setNumber: number;
  grades: FitbBlankGrade[];
  userAnswers: string[];
  clueUsed: boolean[];
}): FitbProgressRecord {
  const { round, difficulty, setNumber, grades, userAnswers, clueUsed } = args;
  const maxScore = fitbMaxScore(difficulty);
  const score = calculateFitbDetScore({ grades, clueUsed, difficulty });
  const blankOk = gradesToExactLocks(grades);
  const m = readFitbProgressMap();
  const k = progressKey(round, difficulty, setNumber);
  const prev = m[k];
  const bestScore = prev ? Math.max(prev.bestScore, score) : score;
  const next: FitbProgressRecord = {
    bestScore,
    maxScore,
    lastBlankOk: [...blankOk],
    lastGrades: [...grades],
    lastUserAnswers: [...userAnswers],
    lastClueUsed: [...clueUsed],
    updatedAt: new Date().toISOString(),
  };
  m[k] = next;
  localStorage.setItem(FITB_PROGRESS_KEY, JSON.stringify(m));
  emitFitbUpdate();
  return next;
}

export function mergeFitbBankFromAdmin(
  text: string,
  round: FitbRoundNum,
): { bank: FitbFullBank; count: number } {
  const parsed = parseFitbBankJson(text.trim());
  const normalized = normalizeFitbSetsForBank(parsed);
  const bank = loadFitbBank();
  for (const d of FITB_DIFFICULTIES) {
    const map = new Map<number, FitbSet>();
    for (const s of bank[round][d]) map.set(s.setNumber, s);
    for (const s of normalized[d]) {
      map.set(s.setNumber, { ...s, round });
    }
    bank[round][d] = [...map.values()].sort((a, b) => a.setNumber - b.setNumber);
  }
  persistFitbBank(bank);
  return { bank, count: parsed.length };
}

/** Learner-facing bank: only admin-uploaded slots are visible (no fallback/default sets). */
export function loadFitbVisibleBank(): FitbFullBank {
  const bank = loadFitbBank();
  const occ = loadFitbAdminOccupancy();
  const out = emptyFitbFullBank();
  for (const r of FITB_ROUND_NUMBERS) {
    for (const d of FITB_DIFFICULTIES) {
      const allowed = new Set(occ[r][d]);
      out[r][d] = bank[r][d]
        .filter((s) => allowed.has(s.setNumber))
        .sort((a, b) => a.setNumber - b.setNumber);
    }
  }
  return out;
}

export function getFitbVisibleSet(
  round: FitbRoundNum,
  difficulty: FitbDifficulty,
  setNumber: number,
): FitbSet | null {
  return loadFitbVisibleBank()[round][difficulty].find((s) => s.setNumber === setNumber) ?? null;
}

export function countFitbSetsInBank(): number {
  const b = loadFitbBank();
  let n = 0;
  for (const r of FITB_ROUND_NUMBERS) {
    for (const d of FITB_DIFFICULTIES) n += b[r][d].length;
  }
  return n;
}

export function getFitbRoundStats(round: FitbRoundNum): {
  avgPercent: number | null;
  latestAttemptDate: string | null;
} {
  const bank = loadFitbVisibleBank();
  const progMap = readFitbProgressMap();
  const percents: number[] = [];
  let latest: string | null = null;
  for (const d of FITB_DIFFICULTIES) {
    for (const set of bank[round][d]) {
      const k = progressKey(round, d, set.setNumber);
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
