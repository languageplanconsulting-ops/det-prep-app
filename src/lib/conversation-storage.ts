import { parseConversationBankJson } from "@/lib/conversation-admin";
import {
  CONVERSATION_DIFFICULTIES,
  CONVERSATION_FULL_SCORE,
  CONVERSATION_MAX_SCORE,
  CONVERSATION_ROUND_COUNT,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";
import { conversationScore, countConversationCorrect } from "@/lib/conversation-scoring";
import { buildDefaultConversationBank } from "@/lib/conversation-default-data";
import { isUploadedConversationExam } from "@/lib/conversation-practice-filter";
import type {
  ConversationBankByRound,
  ConversationDifficulty,
  ConversationExam,
  ConversationProgressRecord,
} from "@/types/conversation";

export const CONVERSATION_LS_BANK_KEY = "ep-conversation-bank-v2";
export const CONVERSATION_LS_BANK_LEGACY_KEY = "ep-conversation-bank-v1";
export const CONVERSATION_LS_PROGRESS_KEY = "ep-conversation-progress-v2";
export const CONVERSATION_LS_PROGRESS_LEGACY_KEY = "ep-conversation-progress-v1";

const BANK_KEY = CONVERSATION_LS_BANK_KEY;
const LEGACY_BANK_KEY = CONVERSATION_LS_BANK_LEGACY_KEY;
const PROGRESS_KEY = CONVERSATION_LS_PROGRESS_KEY;
const LEGACY_PROGRESS_KEY = CONVERSATION_LS_PROGRESS_LEGACY_KEY;

function emitConversationUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-conversation-storage"));
}

function progressKey(round: number, difficulty: ConversationDifficulty, setNumber: number): string {
  return `${round}:${difficulty}:${setNumber}`;
}

type ProgressMap = Record<string, ConversationProgressRecord>;

function safeParseProgress(raw: string | null): ProgressMap {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    return migrateProgressKeys(o as ProgressMap);
  } catch {
    return {};
  }
}

function migrateProgressKeys(m: ProgressMap): ProgressMap {
  const next: ProgressMap = { ...m };
  for (const [k, v] of Object.entries(m)) {
    if (/^\d+:(easy|medium|hard):\d+$/.test(k)) continue;
    const legacy = k.match(/^(easy|medium|hard):(\d+)$/);
    if (legacy) {
      const nk = `1:${legacy[1]}:${legacy[2]}`;
      if (!next[nk]) next[nk] = v;
      delete next[k];
    }
  }
  return next;
}

function cloneRoundBank(
  src: Record<ConversationDifficulty, ConversationExam[]>,
): Record<ConversationDifficulty, ConversationExam[]> {
  return {
    easy: src.easy.map((e) => ({
      ...e,
      highlightedWords: e.highlightedWords.map((h) => ({ ...h })),
      scenarioQuestions: e.scenarioQuestions.map((q) => ({ ...q })),
      mainQuestions: e.mainQuestions.map((m) => ({ ...m, options: [...m.options] })),
    })),
    medium: src.medium.map((e) => ({
      ...e,
      highlightedWords: e.highlightedWords.map((h) => ({ ...h })),
      scenarioQuestions: e.scenarioQuestions.map((q) => ({ ...q })),
      mainQuestions: e.mainQuestions.map((m) => ({ ...m, options: [...m.options] })),
    })),
    hard: src.hard.map((e) => ({
      ...e,
      highlightedWords: e.highlightedWords.map((h) => ({ ...h })),
      scenarioQuestions: e.scenarioQuestions.map((q) => ({ ...q })),
      mainQuestions: e.mainQuestions.map((m) => ({ ...m, options: [...m.options] })),
    })),
  };
}

function cloneBank(src: ConversationBankByRound): ConversationBankByRound {
  const out: ConversationBankByRound = {};
  for (let r = 1; r <= CONVERSATION_ROUND_COUNT; r++) {
    out[r] = cloneRoundBank(src[r] ?? buildDefaultConversationBank()[r]!);
  }
  return out;
}

function isLegacyBankShape(o: Record<string, unknown>): boolean {
  return o.easy != null || o.medium != null || o.hard != null;
}

function isRoundBankShape(o: Record<string, unknown>): boolean {
  return o["1"] != null || o["2"] != null;
}

function mergeExamIntoRoundBank(
  base: ConversationBankByRound,
  exam: ConversationExam,
  round: number,
): void {
  if (round < 1 || round > CONVERSATION_ROUND_COUNT) return;
  const d = exam.difficulty;
  const map = new Map<number, ConversationExam>();
  for (const row of base[round]![d]) map.set(row.setNumber, row);
  map.set(exam.setNumber, { ...exam, round });
  base[round]![d] = [...map.values()].sort((a, b) => a.setNumber - b.setNumber);
}

function overlayLegacyFlatBank(base: ConversationBankByRound, legacy: Record<string, unknown>): void {
  for (const level of ["easy", "medium", "hard"] as const) {
    const arr = legacy[level];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const it = item as Partial<ConversationExam>;
      if (
        typeof it.setNumber !== "number" ||
        it.setNumber < 1 ||
        !Number.isInteger(it.setNumber) ||
        typeof it.id !== "string" ||
        typeof it.title !== "string" ||
        typeof it.scenario !== "string" ||
        !Array.isArray(it.highlightedWords) ||
        !Array.isArray(it.scenarioQuestions) ||
        !Array.isArray(it.mainQuestions)
      ) {
        continue;
      }
      const round = typeof it.round === "number" ? it.round : 1;
      mergeExamIntoRoundBank(base, { ...it, difficulty: level, setNumber: it.setNumber } as ConversationExam, round);
    }
  }
}

function overlayRoundChunk(
  base: ConversationBankByRound,
  round: number,
  chunk: Record<string, unknown>,
): void {
  for (const level of ["easy", "medium", "hard"] as const) {
    const arr = chunk[level];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const it = item as Partial<ConversationExam>;
      if (
        typeof it.setNumber !== "number" ||
        it.setNumber < 1 ||
        !Number.isInteger(it.setNumber) ||
        typeof it.id !== "string" ||
        typeof it.title !== "string" ||
        typeof it.scenario !== "string" ||
        !Array.isArray(it.highlightedWords) ||
        !Array.isArray(it.scenarioQuestions) ||
        !Array.isArray(it.mainQuestions)
      ) {
        continue;
      }
      const examRound = typeof it.round === "number" ? it.round : round;
      mergeExamIntoRoundBank(
        base,
        { ...it, difficulty: level, setNumber: it.setNumber, round: examRound } as ConversationExam,
        examRound,
      );
    }
  }
}

function parseStoredBank(raw: string | null): ConversationBankByRound {
  const base = cloneBank(buildDefaultConversationBank());
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    const o = parsed as Record<string, unknown>;

    if (isLegacyBankShape(o)) {
      overlayLegacyFlatBank(base, o);
      return base;
    }

    if (isRoundBankShape(o) || Object.keys(o).some((k) => /^\d+$/.test(k))) {
      for (let r = 1; r <= CONVERSATION_ROUND_COUNT; r++) {
        const chunk = o[String(r)] as Record<string, unknown> | undefined;
        if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) continue;
        overlayRoundChunk(base, r, chunk);
      }
      return base;
    }
    return base;
  } catch {
    return base;
  }
}

/**
 * Moves every exam out of `hard` into `medium` (new set numbers when needed), clears `hard`,
 * and rewires learner progress keys. Persists when anything changed.
 */
function migrateConversationHardTierAway(bank: ConversationBankByRound): boolean {
  const renames: { from: string; to: string }[] = [];
  let bankChanged = false;

  for (let r = 1; r <= CONVERSATION_ROUND_COUNT; r++) {
    const rb = bank[r];
    if (!rb || rb.hard.length === 0) continue;
    const usedMedium = new Set(rb.medium.map((e) => e.setNumber));
    let maxMedium = rb.medium.reduce((m, e) => Math.max(m, e.setNumber), 0);

    const sortedHard = [...rb.hard].sort((a, b) => a.setNumber - b.setNumber);
    for (const exam of sortedHard) {
      const oldSet = exam.setNumber;
      let newSet = oldSet;
      if (usedMedium.has(newSet)) {
        newSet = maxMedium + 1;
        while (usedMedium.has(newSet)) newSet += 1;
      }
      usedMedium.add(newSet);
      maxMedium = Math.max(maxMedium, newSet);

      rb.medium.push({
        ...exam,
        difficulty: "medium",
        setNumber: newSet,
      });
      renames.push({ from: progressKey(r, "hard", oldSet), to: progressKey(r, "medium", newSet) });
    }
    rb.hard = [];
    rb.medium.sort((a, b) => a.setNumber - b.setNumber);
    bankChanged = true;
  }

  if (!bankChanged) return false;

  const m = loadConversationProgressMap();
  let progChanged = false;
  for (const { from, to } of renames) {
    const old = m[from];
    if (!old) continue;
    delete m[from];
    progChanged = true;
    const existing = m[to];
    if (!existing) {
      m[to] = old;
      continue;
    }
    const newer = existing.updatedAt >= old.updatedAt ? existing : old;
    const older = existing.updatedAt >= old.updatedAt ? old : existing;
    m[to] = {
      bestScore: Math.max(existing.bestScore, old.bestScore),
      maxScore: newer.maxScore,
      lastItemOk:
        newer.lastItemOk && newer.lastItemOk.length === CONVERSATION_TOTAL_STEPS
          ? [...newer.lastItemOk]
          : older.lastItemOk && older.lastItemOk.length === CONVERSATION_TOTAL_STEPS
            ? [...older.lastItemOk]
            : newer.lastItemOk
              ? [...newer.lastItemOk]
              : [...(older.lastItemOk ?? [])],
      updatedAt: newer.updatedAt,
    };
  }
  for (const k of Object.keys(m)) {
    if (/^\d+:hard:\d+$/.test(k)) {
      delete m[k];
      progChanged = true;
    }
  }
  if (progChanged) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(m));
    emitConversationUpdate();
  }
  return true;
}

function loadBankFromLocalStorage(): ConversationBankByRound {
  if (typeof window === "undefined") return cloneBank(buildDefaultConversationBank());
  const bank = parseStoredBank(localStorage.getItem(BANK_KEY) ?? localStorage.getItem(LEGACY_BANK_KEY));
  if (migrateConversationHardTierAway(bank)) {
    persistConversationBank(bank);
  }
  return bank;
}

export function loadConversationBank(): ConversationBankByRound {
  return loadBankFromLocalStorage();
}

export function persistConversationBank(bank: ConversationBankByRound): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BANK_KEY, JSON.stringify(bank));
    emitConversationUpdate();
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error(
        "Browser storage quota exceeded. Conversation audio is stored in IndexedDB when you generate from Admin — retry after a refresh. If it persists, free site data or remove old exams.",
      );
    }
    throw e;
  }
}

export function getConversationExam(
  round: number,
  difficulty: ConversationDifficulty,
  setNumber: number,
): ConversationExam | null {
  const bank = loadConversationBank();
  const rb = bank[round];
  if (!rb) return null;
  const found = rb[difficulty].find((e) => e.setNumber === setNumber) ?? null;
  if (!found || !isUploadedConversationExam(found)) return null;
  return found;
}

export function loadConversationProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  const raw =
    localStorage.getItem(PROGRESS_KEY) ?? localStorage.getItem(LEGACY_PROGRESS_KEY);
  return safeParseProgress(raw);
}

export function hydrateProgressStorage(): void {
  if (typeof window === "undefined") return;
  const m = loadConversationProgressMap();
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(m));
}

export function getConversationProgress(
  round: number,
  difficulty: ConversationDifficulty,
  setNumber: number,
): ConversationProgressRecord | null {
  return loadConversationProgressMap()[progressKey(round, difficulty, setNumber)] ?? null;
}

/** Average of best-score % per set (only sets with at least one saved attempt). */
export function getConversationRoundStats(round: number): {
  avgPercent: number | null;
  latestAttemptDate: string | null;
} {
  const m = loadConversationProgressMap();
  const bank = loadConversationBank();
  const percents: number[] = [];
  let latest: string | null = null;
  const rb = bank[round];
  if (rb) {
    for (const d of CONVERSATION_DIFFICULTIES) {
      for (const exam of rb[d] ?? []) {
        if (!isUploadedConversationExam(exam)) continue;
        const p = m[progressKey(round, d, exam.setNumber)];
        if (p && p.maxScore > 0) {
          percents.push((p.bestScore / p.maxScore) * 100);
          if (!latest || p.updatedAt > latest) latest = p.updatedAt;
        }
      }
    }
  }
  if (percents.length === 0) return { avgPercent: null, latestAttemptDate: null };
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  return { avgPercent: Math.round(avg * 10) / 10, latestAttemptDate: latest };
}

export function saveConversationProgress(args: {
  round: number;
  difficulty: ConversationDifficulty;
  setNumber: number;
  itemOk: boolean[];
  /** Defaults from level; use exam.maxScore when set in JSON. */
  maxScore?: number;
}): ConversationProgressRecord {
  const { round, difficulty, setNumber, itemOk } = args;
  const maxScore = args.maxScore ?? CONVERSATION_MAX_SCORE[difficulty];
  const correct = countConversationCorrect(itemOk);
  const score = conversationScore(correct, maxScore);
  const m = loadConversationProgressMap();
  const k = progressKey(round, difficulty, setNumber);
  const prev = m[k];
  const bestScore = prev ? Math.max(prev.bestScore, score) : score;
  const next: ConversationProgressRecord = {
    bestScore,
    maxScore,
    lastItemOk: [...itemOk],
    updatedAt: new Date().toISOString(),
  };
  m[k] = next;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(m));
  emitConversationUpdate();
  return next;
}

export function mergeConversationBankFromAdmin(text: string): { count: number } {
  const exams = parseConversationBankJson(text.trim());
  const bank = loadConversationBank();
  for (const e of exams) {
    const r = e.round ?? 1;
    mergeExamIntoRoundBank(bank, e, r);
  }
  persistConversationBank(bank);
  return { count: exams.length };
}

export function getAllConversationExams(): ConversationExam[] {
  const bank = loadConversationBank();
  const out: ConversationExam[] = [];
  for (let r = 1; r <= CONVERSATION_ROUND_COUNT; r++) {
    out.push(...(bank[r]?.easy ?? []), ...(bank[r]?.medium ?? []), ...(bank[r]?.hard ?? []));
  }
  return out;
}

/** Total conversation exams in the bank (all rounds × difficulties). */
export function countConversationExamsInBank(): number {
  return getAllConversationExams().length;
}

export function updateConversationExamById(
  id: string,
  updates: Partial<ConversationExam>,
): boolean {
  if (!id.trim()) return false;
  const bank = loadConversationBank();
  let changed = false;
  for (let r = 1; r <= CONVERSATION_ROUND_COUNT; r++) {
    for (const d of ["easy", "medium", "hard"] as const) {
      const arr = bank[r]?.[d];
      if (!arr) continue;
      const idx = arr.findIndex((x) => x.id === id);
      if (idx < 0) continue;
      const prev = arr[idx]!;
      const next: ConversationExam = {
        ...prev,
        ...updates,
      };
      arr[idx] = next;
      changed = true;
      break;
    }
    if (changed) break;
  }
  if (changed) persistConversationBank(bank);
  return changed;
}

/** Remove imported exams at the given set slots (admin revert). */
export function removeConversationExamsFromAdmin(
  round: number,
  difficulty: ConversationDifficulty,
  setNumbers: number[],
): void {
  if (setNumbers.length === 0) return;
  const bank = loadConversationBank();
  const remove = new Set(setNumbers);
  const rb = bank[round]?.[difficulty];
  if (!rb) return;
  bank[round]![difficulty] = rb.filter((e) => !remove.has(e.setNumber));
  persistConversationBank(bank);
}

const BANK_DIFFICULTY_SLOTS: ConversationDifficulty[] = ["easy", "medium", "hard"];

/**
 * Removes exams by id from the round bank, clears learner progress for those slots,
 * and persists. Caller should delete IndexedDB audio via `deleteConversationAudioKeysForExamId`.
 */
export function removeConversationExamsByIds(ids: string[]): number {
  const idSet = new Set(ids.map((x) => x.trim()).filter(Boolean));
  if (idSet.size === 0) return 0;
  const bank = loadConversationBank();
  let removed = 0;
  const progressToDelete: string[] = [];

  for (let r = 1; r <= CONVERSATION_ROUND_COUNT; r++) {
    for (const d of BANK_DIFFICULTY_SLOTS) {
      const arr = bank[r]?.[d];
      if (!arr?.length) continue;
      const next: ConversationExam[] = [];
      for (const e of arr) {
        if (idSet.has(e.id)) {
          progressToDelete.push(progressKey(r, d, e.setNumber));
          removed += 1;
        } else {
          next.push(e);
        }
      }
      if (next.length !== arr.length) {
        bank[r]![d] = next;
      }
    }
  }

  if (removed === 0) return 0;

  persistConversationBank(bank);

  const m = loadConversationProgressMap();
  let progChanged = false;
  for (const k of progressToDelete) {
    if (m[k]) {
      delete m[k];
      progChanged = true;
    }
  }
  if (progChanged) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(m));
    emitConversationUpdate();
  }

  return removed;
}

export function conversationMaxForDifficulty(_d: ConversationDifficulty): number {
  return CONVERSATION_FULL_SCORE;
}

/** Full score is always CONVERSATION_FULL_SCORE; legacy `exam.maxScore` / difficulty tiers are ignored. */
export function conversationMaxForExam(_exam: { difficulty: ConversationDifficulty; maxScore?: number }): number {
  return CONVERSATION_FULL_SCORE;
}
