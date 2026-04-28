import { normalizeVocabSetsIncoming, parseVocabSetsJson } from "@/lib/vocab-admin";
import { getCurrentBrowserUserId } from "@/lib/browser-user-scope";
import { VOCAB_ROUND_NUMBERS } from "@/lib/vocab-constants";
import {
  emptyVocabFullBank,
  isBuiltInPlaceholderVocabSet,
} from "@/lib/vocab-default-data";
import type {
  VocabFullBank,
  VocabPassageUnit,
  VocabProgressRecord,
  VocabRoundNum,
  VocabSessionLevel,
  VocabSet,
} from "@/types/vocab";

const VOCAB_SESSION_LEVELS: VocabSessionLevel[] = ["easy", "medium", "hard"];

const VOCAB_SETS_KEY = "ep-vocab-sets";
const VOCAB_PROGRESS_KEY = "ep-vocab-progress-v2";
const VOCAB_PROGRESS_LEGACY_KEY = "ep-vocab-progress-v1";
const VOCAB_NOTEBOOK_KEY = "ep-vocab-notebook-saved-v1";
export const VOCAB_ADMIN_OCCUPANCY_KEY = "ep-vocab-admin-uploaded-v1";

type ProgressMap = Record<string, VocabProgressRecord>;

function emitVocabUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-vocab-storage"));
}

function isRound(n: number): n is VocabRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export type VocabAdminOccupancy = Record<VocabRoundNum, number[]>;

function emptyVocabOccupancy(): VocabAdminOccupancy {
  const out = {} as VocabAdminOccupancy;
  for (const r of VOCAB_ROUND_NUMBERS) out[r] = [];
  return out;
}

function migrateVocabOccupancy(raw: unknown): VocabAdminOccupancy {
  const occ = emptyVocabOccupancy();
  if (!raw || typeof raw !== "object") return occ;
  const o = raw as Record<string, unknown>;
  for (const r of VOCAB_ROUND_NUMBERS) {
    const arr = o[String(r)];
    occ[r] = Array.isArray(arr) ? (arr as number[]).filter((n) => Number.isInteger(n)) : [];
  }
  return occ;
}

export function loadVocabAdminOccupancy(): VocabAdminOccupancy {
  if (typeof window === "undefined") return emptyVocabOccupancy();
  try {
    const raw = localStorage.getItem(VOCAB_ADMIN_OCCUPANCY_KEY);
    if (!raw) return emptyVocabOccupancy();
    return migrateVocabOccupancy(JSON.parse(raw));
  } catch {
    return emptyVocabOccupancy();
  }
}

function saveVocabAdminOccupancy(next: VocabAdminOccupancy): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOCAB_ADMIN_OCCUPANCY_KEY, JSON.stringify(next));
}

function registerVocabAdminSlots(round: VocabRoundNum, setNumbers: number[]): void {
  const occ = loadVocabAdminOccupancy();
  occ[round] = [...new Set([...occ[round], ...setNumbers])].sort((a, b) => a - b);
  saveVocabAdminOccupancy(occ);
}

function unregisterVocabAdminSlots(round: VocabRoundNum, setNumbers: number[]): void {
  if (setNumbers.length === 0) return;
  const remove = new Set(setNumbers);
  const occ = loadVocabAdminOccupancy();
  occ[round] = occ[round].filter((n) => !remove.has(n));
  saveVocabAdminOccupancy(occ);
}

function progressKey(
  round: VocabRoundNum,
  sessionLevel: VocabSessionLevel,
  setNumber: number,
  passageNumber: number,
): string {
  return `${round}:${sessionLevel}:${setNumber}:${passageNumber}`;
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

function readVocabProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  let v2 = safeParseProgress(localStorage.getItem(VOCAB_PROGRESS_KEY));
  if (Object.keys(v2).length > 0) return v2;
  const v1 = safeParseProgress(localStorage.getItem(VOCAB_PROGRESS_LEGACY_KEY));
  if (Object.keys(v1).length === 0) return {};
  v2 = migrateLegacyProgress(v1);
  try {
    localStorage.setItem(VOCAB_PROGRESS_KEY, JSON.stringify(v2));
  } catch {
    /* ignore */
  }
  return v2;
}

export function loadVocabProgressMap(): ProgressMap {
  return readVocabProgressMap();
}

function legacyNotebookKey(setNumber: number, passageNumber: number, word: string): string {
  return `${setNumber}::${passageNumber}::${word.trim().toLowerCase()}`;
}

function notebookStorageKey(
  round: VocabRoundNum,
  setNumber: number,
  passageNumber: number,
  word: string,
): string {
  return `${round}:${setNumber}:${passageNumber}::${word.trim().toLowerCase()}`;
}

function migrateLegacyArrayToBank(arr: VocabSet[]): VocabFullBank {
  const bank = emptyVocabFullBank();
  const r = 1 as VocabRoundNum;
  for (const s of arr) {
    bank[r].push({ ...s, round: r });
  }
  bank[r].sort((a, b) => a.setNumber - b.setNumber);
  return bank;
}

function parseStoredBank(raw: string | null): VocabFullBank {
  const base = emptyVocabFullBank();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return emptyVocabFullBank();
      }
      return migrateLegacyArrayToBank(parsed as VocabSet[]);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    const o = parsed as Record<string, unknown>;
    for (const r of VOCAB_ROUND_NUMBERS) {
      const block = o[String(r)];
      if (!Array.isArray(block)) continue;
      const byNum = new Map<number, VocabSet>();
      if (block.length > 0) {
        for (const row of base[r]) byNum.set(row.setNumber, row);
        for (const item of block) {
          if (!item || typeof item !== "object") continue;
          const s = item as VocabSet;
          if (typeof s.setNumber === "number" && Array.isArray(s.passages)) {
            const roundNum = typeof s.round === "number" && isRound(s.round) ? s.round : r;
            byNum.set(s.setNumber, { ...s, round: roundNum, passages: s.passages });
          }
        }
      }
      base[r] = [...byNum.values()].sort((a, b) => a.setNumber - b.setNumber);
    }
    return base;
  } catch {
    return base;
  }
}

export function loadVocabBank(): VocabFullBank {
  if (typeof window === "undefined") return emptyVocabFullBank();
  return parseStoredBank(localStorage.getItem(VOCAB_SETS_KEY));
}

/** Learner-facing bank: only admin-uploaded set slots are visible. */
export function loadVocabVisibleBank(): VocabFullBank {
  const bank = loadVocabBank();
  const occ = loadVocabAdminOccupancy();
  const out = emptyVocabFullBank();
  for (const r of VOCAB_ROUND_NUMBERS) {
    const allowed = new Set(occ[r]);
    out[r] = bank[r]
      .filter(
        (s) => allowed.has(s.setNumber) && !isBuiltInPlaceholderVocabSet(s),
      )
      .sort((a, b) => a.setNumber - b.setNumber);
  }
  return out;
}

export function persistVocabBank(bank: VocabFullBank): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOCAB_SETS_KEY, JSON.stringify(bank));
  emitVocabUpdate();
}

/** Flatten all rounds (admin summaries). */
export function loadVocabSets(): VocabSet[] {
  const b = loadVocabBank();
  const out: VocabSet[] = [];
  for (const r of VOCAB_ROUND_NUMBERS) {
    out.push(...b[r]);
  }
  return out;
}

export function getVocabPassageProgress(
  round: VocabRoundNum,
  sessionLevel: VocabSessionLevel,
  setNumber: number,
  passageNumber: number,
): VocabProgressRecord | null {
  const m = readVocabProgressMap();
  return m[progressKey(round, sessionLevel, setNumber, passageNumber)] ?? null;
}

export function getVocabSetBestAnyLevel(
  round: VocabRoundNum,
  setNumber: number,
  passages: VocabPassageUnit[],
): VocabProgressRecord | null {
  let best: VocabProgressRecord | null = null;
  for (const sessionLevel of VOCAB_SESSION_LEVELS) {
    for (const p of passages) {
      const r = getVocabPassageProgress(round, sessionLevel, setNumber, p.passageNumber);
      if (!r) continue;
      if (!best || r.bestScore > best.bestScore) best = r;
    }
  }
  return best;
}

export function saveVocabAttempt(args: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
  passageNumber: number;
  attainedScore: number;
  maxScore: number;
  correctCount: number;
}): VocabProgressRecord {
  const { round, sessionLevel, setNumber, passageNumber, attainedScore, maxScore, correctCount } = args;
  const m = readVocabProgressMap();
  const k = progressKey(round, sessionLevel, setNumber, passageNumber);
  const prev = m[k];
  const bestScore = prev ? Math.max(prev.bestScore, attainedScore) : attainedScore;
  const next: VocabProgressRecord = {
    bestScore,
    maxScore,
    lastScore: attainedScore,
    lastCorrectCount: correctCount,
    updatedAt: new Date().toISOString(),
    userId: getCurrentBrowserUserId() ?? undefined,
  };
  m[k] = next;
  localStorage.setItem(VOCAB_PROGRESS_KEY, JSON.stringify(m));
  emitVocabUpdate();
  return next;
}

export function mergeVocabSetsFromAdmin(incoming: VocabSet[], round: VocabRoundNum): VocabFullBank {
  const normalized = normalizeVocabSetsIncoming(incoming);
  const bank = loadVocabBank();
  const map = new Map<number, VocabSet>();
  for (const s of bank[round]) map.set(s.setNumber, s);
  for (const s of normalized) {
    const prev = map.get(s.setNumber);
    if (!prev) {
      map.set(s.setNumber, { ...s, round });
      continue;
    }
    // Import for a level should replace that whole level in the slot
    // (prevents "10 existing + 10 uploaded = 20" accumulation).
    const replacedLevels = new Set(s.passages.map((p) => p.contentLevel));
    const mergedPassages = new Map<string, VocabSet["passages"][number]>();
    for (const p of prev.passages) {
      if (replacedLevels.has(p.contentLevel)) continue;
      mergedPassages.set(`${p.contentLevel}:${p.passageNumber}`, p);
    }
    for (const p of s.passages) {
      mergedPassages.set(`${p.contentLevel}:${p.passageNumber}`, p);
    }
    map.set(s.setNumber, {
      setNumber: s.setNumber,
      round,
      passages: [...mergedPassages.values()].sort((a, b) => {
        if (a.contentLevel !== b.contentLevel) {
          const rank = { easy: 0, medium: 1, hard: 2 } as const;
          return rank[a.contentLevel] - rank[b.contentLevel];
        }
        return a.passageNumber - b.passageNumber;
      }),
    });
  }
  bank[round] = [...map.values()].sort((a, b) => a.setNumber - b.setNumber);
  persistVocabBank(bank);
  registerVocabAdminSlots(round, normalized.map((s) => s.setNumber));
  return bank;
}

export function removeVocabPassagesFromAdmin(
  setNumber: number,
  passages: { contentLevel: VocabSessionLevel; passageNumber: number }[],
  round: VocabRoundNum,
): void {
  if (passages.length === 0) return;
  const bank = loadVocabBank();
  const ix = bank[round].findIndex((s) => s.setNumber === setNumber);
  if (ix < 0) return;
  const s = bank[round][ix]!;
  const keyRemove = new Set(passages.map((p) => `${p.contentLevel}:${p.passageNumber}`));
  const nextPassages = s.passages.filter((p) => !keyRemove.has(`${p.contentLevel}:${p.passageNumber}`));
  if (nextPassages.length === 0) {
    bank[round].splice(ix, 1);
    unregisterVocabAdminSlots(round, [setNumber]);
  } else {
    bank[round][ix] = { ...s, passages: nextPassages };
  }
  persistVocabBank(bank);
}

/** Remove every passage at one difficulty for a slot (other difficulties stay). */
export function removeAllVocabPassagesForLevel(
  round: VocabRoundNum,
  setNumber: number,
  level: VocabSessionLevel,
): void {
  const s = loadVocabBank()[round].find((x) => x.setNumber === setNumber);
  if (!s) return;
  const metas = s.passages
    .filter((p) => p.contentLevel === level)
    .map((p) => ({ contentLevel: p.contentLevel, passageNumber: p.passageNumber }));
  removeVocabPassagesFromAdmin(setNumber, metas, round);
}

/** Remove the whole set (all difficulties); drops admin visibility for that slot. */
export function removeVocabSetFromRound(round: VocabRoundNum, setNumber: number): void {
  const bank = loadVocabBank();
  const ix = bank[round].findIndex((x) => x.setNumber === setNumber);
  if (ix < 0) return;
  bank[round].splice(ix, 1);
  unregisterVocabAdminSlots(round, [setNumber]);
  persistVocabBank(bank);
}

/**
 * Empty vocabulary for all rounds and clear which slots are “published”.
 * Browser only — use Admin → “Sync to server now” afterward to overwrite the Supabase snapshot.
 */
export function clearEntireVocabBankAndOccupancy(): void {
  if (typeof window === "undefined") return;
  persistVocabBank(emptyVocabFullBank());
  saveVocabAdminOccupancy(emptyVocabOccupancy());
}

export function getVocabSetByNumber(setNumber: number, round: VocabRoundNum): VocabSet | undefined {
  return loadVocabBank()[round].find((s) => s.setNumber === setNumber);
}

export function getVocabVisibleSetByNumber(setNumber: number, round: VocabRoundNum): VocabSet | undefined {
  return loadVocabVisibleBank()[round].find((s) => s.setNumber === setNumber);
}

export function countVocabSetsInBank(): number {
  const b = loadVocabVisibleBank();
  let n = 0;
  for (const r of VOCAB_ROUND_NUMBERS) n += b[r].length;
  return n;
}

export function getVocabRoundStats(round: VocabRoundNum): {
  avgPercent: number | null;
  latestAttemptDate: string | null;
} {
  const bank = loadVocabVisibleBank();
  const progMap = readVocabProgressMap();
  const percents: number[] = [];
  let latest: string | null = null;
  for (const set of bank[round]) {
    for (const p of set.passages) {
      const k = progressKey(round, p.contentLevel, set.setNumber, p.passageNumber);
      const pr = progMap[k];
      if (pr) {
        percents.push(pr.maxScore > 0 ? (pr.bestScore / pr.maxScore) * 100 : 0);
        if (!latest || pr.updatedAt > latest) latest = pr.updatedAt;
      }
    }
  }
  if (percents.length === 0) return { avgPercent: null, latestAttemptDate: null };
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  return { avgPercent: Math.round(avg * 10) / 10, latestAttemptDate: latest };
}

export function getVocabPassageFromSet(
  set: VocabSet,
  passageNumber: number,
): VocabPassageUnit | undefined {
  return set.passages.find((p) => p.passageNumber === passageNumber);
}

export function loadVocabNotebookSavedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(VOCAB_NOTEBOOK_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function markVocabWordNotebookSaved(
  round: VocabRoundNum,
  setNumber: number,
  passageNumber: number,
  word: string,
): void {
  if (typeof window === "undefined") return;
  const key = notebookStorageKey(round, setNumber, passageNumber, word);
  const s = loadVocabNotebookSavedKeys();
  s.add(key);
  localStorage.setItem(VOCAB_NOTEBOOK_KEY, JSON.stringify([...s]));
}

export function isVocabWordNotebookSaved(
  round: VocabRoundNum,
  setNumber: number,
  passageNumber: number,
  word: string,
): boolean {
  const keys = loadVocabNotebookSavedKeys();
  if (keys.has(notebookStorageKey(round, setNumber, passageNumber, word))) return true;
  if (round === 1) {
    return keys.has(legacyNotebookKey(setNumber, passageNumber, word));
  }
  return false;
}
