import { dictationRowsToPatches, parseDictationBankJson } from "@/lib/dictation-admin";
import {
  clearDictationBankJson,
  loadDictationBankJson,
  saveDictationBankJson,
} from "@/lib/dictation-bank-indexeddb";
import {
  clearAllDictationAudioInIndexedDb,
  deleteDictationAudioByItemId,
  putDictationAudioByItemId,
} from "@/lib/dictation-audio-indexeddb";
import {
  DICTATION_DIFFICULTIES,
  DICTATION_MAX_SCORE,
  DICTATION_ROUND_NUMBERS,
  DICTATION_SET_COUNT,
} from "@/lib/dictation-constants";
import type {
  DictationDifficulty,
  DictationFullBank,
  DictationItem,
  DictationProgressRecord,
  DictationRoundNum,
} from "@/types/dictation";

const DICTATION_BANK_KEY = "ep-dictation-bank-v1";
const DICTATION_PROGRESS_KEY = "ep-dictation-progress-v2";
const DICTATION_PROGRESS_LEGACY_KEY = "ep-dictation-progress-v1";

type ProgressMap = Record<string, DictationProgressRecord>;

/** In-memory bank after IndexedDB/localStorage hydrate (avoids sync read missing IDB-only saves). */
let dictationBankMemoryCache: DictationFullBank | null = null;
let dictationBankHydratePromise: Promise<void> | null = null;

function emitDictationUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-dictation-storage"));
}

function cloneDictationFullBank(bank: DictationFullBank): DictationFullBank {
  if (typeof structuredClone === "function") return structuredClone(bank);
  return JSON.parse(JSON.stringify(bank)) as DictationFullBank;
}

function isStorageQuotaError(e: unknown): boolean {
  if (!(e instanceof DOMException)) return false;
  return e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED";
}

function attachDictationBankCrossTabListener(): void {
  if (typeof window === "undefined") return;
  const g = window as Window & { __epDictationBankStorageHook?: boolean };
  if (g.__epDictationBankStorageHook) return;
  g.__epDictationBankStorageHook = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== DICTATION_BANK_KEY) return;
    dictationBankMemoryCache = parseStoredBank(e.newValue);
  });
}

/**
 * Load bank from IndexedDB (authoritative when present) or localStorage, then cache in memory.
 * Call once from dictation UI mount or before async writes.
 */
export async function ensureDictationBankReady(): Promise<void> {
  if (typeof window === "undefined") return;
  attachDictationBankCrossTabListener();
  if (dictationBankMemoryCache !== null) return;
  if (dictationBankHydratePromise) return dictationBankHydratePromise;

  dictationBankHydratePromise = (async () => {
    let idbJson: string | null = null;
    try {
      idbJson = await loadDictationBankJson();
    } catch (err) {
      console.warn("[dictation-storage] IndexedDB bank load failed", err);
    }
    const lsRaw = localStorage.getItem(DICTATION_BANK_KEY);
    if (idbJson) {
      dictationBankMemoryCache = parseStoredBank(idbJson);
    } else {
      dictationBankMemoryCache = parseStoredBank(lsRaw);
      if (lsRaw?.trim()) {
        try {
          await saveDictationBankJson(lsRaw);
        } catch (err) {
          console.warn("[dictation-storage] IndexedDB bank mirror failed", err);
        }
      }
    }
  })();

  try {
    await dictationBankHydratePromise;
  } finally {
    dictationBankHydratePromise = null;
  }
}

/** Move legacy inline audio payloads into IndexedDB so localStorage JSON stays small. */
async function migrateInlineAudioToIndexedDbBank(bank: DictationFullBank): Promise<void> {
  for (const round of DICTATION_ROUND_NUMBERS) {
    for (const difficulty of DICTATION_DIFFICULTIES) {
      const arr = bank[round][difficulty];
      for (let i = 0; i < arr.length; i++) {
        const row = arr[i]!;
        const b64 = row.audioBase64?.trim();
        if (b64) {
          try {
            await putDictationAudioByItemId({
              id: row.id,
              audioBase64: b64,
              mimeType: row.audioMimeType,
            });
            arr[i] = {
              ...row,
              audioBase64: undefined,
              audioInIndexedDb: true,
            };
          } catch (err) {
            console.warn(
              "[dictation-storage] Could not move inline audio to IndexedDB for",
              row.id,
              err,
            );
          }
        } else if (row.audioInIndexedDb && row.audioBase64) {
          arr[i] = { ...row, audioBase64: undefined };
        }
      }
    }
  }
}

function progressKey(round: DictationRoundNum, difficulty: DictationDifficulty, setNumber: number): string {
  return `${round}:${difficulty}:${setNumber}`;
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
    if (parts.length === 2 && (parts[0] === "easy" || parts[0] === "medium" || parts[0] === "hard")) {
      out[`1:${parts[0]}:${parts[1]}`] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function readDictationProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  let v2 = safeParseProgress(localStorage.getItem(DICTATION_PROGRESS_KEY));
  if (Object.keys(v2).length > 0) return v2;
  const v1 = safeParseProgress(localStorage.getItem(DICTATION_PROGRESS_LEGACY_KEY));
  if (Object.keys(v1).length === 0) return {};
  v2 = migrateLegacyProgress(v1);
  try {
    localStorage.setItem(DICTATION_PROGRESS_KEY, JSON.stringify(v2));
  } catch {
    /* ignore */
  }
  return v2;
}

export function loadDictationProgressMap(): ProgressMap {
  return readDictationProgressMap();
}

function emptyDictationFullBank(): DictationFullBank {
  const b = {} as DictationFullBank;
  for (const r of DICTATION_ROUND_NUMBERS) {
    b[r] = { easy: [], medium: [], hard: [] };
  }
  return b;
}

function isRound(n: number): n is DictationRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

function isV1BankShape(o: unknown): o is Record<DictationDifficulty, DictationItem[]> {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const x = o as Record<string, unknown>;
  return "easy" in x && "medium" in x && "hard" in x && !("1" in x);
}

function migrateV1BankToFull(v1: Record<DictationDifficulty, DictationItem[]>): DictationFullBank {
  const bank = emptyDictationFullBank();
  const round = 1 as DictationRoundNum;
  for (const d of DICTATION_DIFFICULTIES) {
    const arr = v1[d];
    if (!Array.isArray(arr)) continue;
    bank[round][d] = arr.map((row) => {
      const r = { ...row } as DictationItem;
      if (!r.round) r.round = round;
      return r;
    });
  }
  return bank;
}

function parseStoredBank(raw: string | null): DictationFullBank {
  const base = emptyDictationFullBank();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isV1BankShape(parsed)) {
      return migrateV1BankToFull(parsed);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    const o = parsed as Record<string, unknown>;
    for (const r of DICTATION_ROUND_NUMBERS) {
      const block = o[String(r)];
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      for (const level of DICTATION_DIFFICULTIES) {
        const arr = b[level];
        if (!Array.isArray(arr)) continue;
        const bySet = new Map<number, DictationItem>();
        for (const row of base[r][level]) bySet.set(row.setNumber, row);
        for (const item of arr) {
          if (!item || typeof item !== "object") continue;
          const it = item as Partial<DictationItem>;
          if (
            typeof it.setNumber === "number" &&
            it.setNumber >= 1 &&
            it.setNumber <= DICTATION_SET_COUNT &&
            typeof it.transcript === "string" &&
            typeof it.audioPath === "string" &&
            typeof it.hintText === "string" &&
            typeof it.id === "string" &&
            typeof it.difficulty === "string"
          ) {
            const roundNum = typeof it.round === "number" && isRound(it.round) ? it.round : r;
            bySet.set(it.setNumber, {
              id: it.id,
              round: roundNum,
              difficulty: it.difficulty as DictationDifficulty,
              setNumber: it.setNumber,
              audioPath: it.audioPath,
              audioBase64:
                typeof it.audioBase64 === "string" && it.audioBase64.trim()
                  ? it.audioBase64
                  : undefined,
              audioMimeType:
                typeof it.audioMimeType === "string" && it.audioMimeType.trim()
                  ? it.audioMimeType
                  : undefined,
              audioInIndexedDb: it.audioInIndexedDb === true,
              transcript: it.transcript,
              hintText: it.hintText,
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

export function loadDictationBank(): DictationFullBank {
  if (typeof window === "undefined") return emptyDictationFullBank();
  if (dictationBankMemoryCache !== null) {
    return cloneDictationFullBank(dictationBankMemoryCache);
  }
  return parseStoredBank(localStorage.getItem(DICTATION_BANK_KEY));
}

export async function persistDictationBank(bank: DictationFullBank): Promise<void> {
  if (typeof window === "undefined") return;
  await ensureDictationBankReady();
  await migrateInlineAudioToIndexedDbBank(bank);
  const json = JSON.stringify(bank);

  try {
    await saveDictationBankJson(json);
  } catch (err) {
    console.error("[dictation-storage] Failed to save dictation bank to IndexedDB", err);
    throw new Error(
      "Could not save dictation data (IndexedDB). Check browser storage permissions or free disk space, then try again.",
    );
  }

  dictationBankMemoryCache = parseStoredBank(json);

  try {
    localStorage.setItem(DICTATION_BANK_KEY, json);
  } catch (e) {
    if (isStorageQuotaError(e)) {
      try {
        localStorage.removeItem(DICTATION_BANK_KEY);
      } catch {
        /* ignore */
      }
      emitDictationUpdate();
      return;
    }
    throw e;
  }
  emitDictationUpdate();
}

/** One-shot: shrink any legacy inline audio in the saved bank (call from admin on mount). */
export async function migrateDictationBankInlineAudioToIndexedDb(): Promise<void> {
  if (typeof window === "undefined") return;
  const bank = loadDictationBank();
  await persistDictationBank(bank);
}

export function getDictationItem(
  round: DictationRoundNum,
  difficulty: DictationDifficulty,
  setNumber: number,
): DictationItem | null {
  const bank = loadDictationBank();
  return bank[round][difficulty].find((x) => x.setNumber === setNumber) ?? null;
}

export function getAllDictationItems(): DictationItem[] {
  const bank = loadDictationBank();
  const out: DictationItem[] = [];
  for (const round of DICTATION_ROUND_NUMBERS) {
    for (const difficulty of DICTATION_DIFFICULTIES) {
      out.push(...bank[round][difficulty]);
    }
  }
  return out;
}

export async function updateDictationItemById(
  id: string,
  updates: Partial<Pick<DictationItem, "audioBase64" | "audioMimeType" | "transcript" | "hintText">>,
): Promise<boolean> {
  if (!id.trim()) return false;
  await ensureDictationBankReady();
  const bank = loadDictationBank();
  let changed = false;
  for (const round of DICTATION_ROUND_NUMBERS) {
    for (const difficulty of DICTATION_DIFFICULTIES) {
      const arr = bank[round][difficulty];
      const idx = arr.findIndex((x) => x.id === id);
      if (idx < 0) continue;
      const prev = arr[idx]!;
      const next: DictationItem = {
        ...prev,
        ...(updates.transcript != null ? { transcript: String(updates.transcript) } : {}),
        ...(updates.hintText != null ? { hintText: String(updates.hintText) } : {}),
      };
      if (updates.audioBase64 != null) {
        const incomingBase64 = String(updates.audioBase64).trim();
        if (incomingBase64) {
          const mimeType = updates.audioMimeType != null ? String(updates.audioMimeType) : prev.audioMimeType;
          try {
            await putDictationAudioByItemId({
              id: prev.id,
              audioBase64: incomingBase64,
              mimeType,
            });
            next.audioBase64 = undefined;
            next.audioMimeType = mimeType?.trim() ? mimeType : prev.audioMimeType;
            next.audioInIndexedDb = true;
          } catch {
            next.audioBase64 = incomingBase64;
            next.audioMimeType = mimeType?.trim() ? mimeType : prev.audioMimeType;
            next.audioInIndexedDb = false;
          }
        } else {
          next.audioBase64 = undefined;
          if (updates.audioMimeType != null) next.audioMimeType = undefined;
          next.audioInIndexedDb = false;
          try {
            await deleteDictationAudioByItemId(prev.id);
          } catch {
            /* ignore */
          }
        }
      } else if (updates.audioMimeType != null) {
        next.audioMimeType = String(updates.audioMimeType);
      }
      arr[idx] = next;
      changed = true;
      break;
    }
    if (changed) break;
  }
  if (changed) await persistDictationBank(bank);
  return changed;
}

export async function clearDictationAudio(options?: { round?: DictationRoundNum }): Promise<number> {
  await ensureDictationBankReady();
  const bank = loadDictationBank();
  let cleared = 0;
  for (const round of DICTATION_ROUND_NUMBERS) {
    if (options?.round && round !== options.round) continue;
    for (const difficulty of DICTATION_DIFFICULTIES) {
      const arr = bank[round][difficulty];
      for (let i = 0; i < arr.length; i++) {
        const row = arr[i]!;
        if (!row.audioBase64 && !row.audioMimeType && !row.audioInIndexedDb) continue;
        arr[i] = {
          ...row,
          audioBase64: undefined,
          audioMimeType: undefined,
          audioInIndexedDb: false,
        };
        void deleteDictationAudioByItemId(row.id);
        cleared += 1;
      }
    }
  }
  if (cleared > 0) await persistDictationBank(bank);
  return cleared;
}

export async function removeDictationItemsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const remove = new Set(ids.map((x) => x.trim()).filter(Boolean));
  if (remove.size === 0) return 0;
  await ensureDictationBankReady();
  const bank = loadDictationBank();
  let removed = 0;
  for (const round of DICTATION_ROUND_NUMBERS) {
    for (const difficulty of DICTATION_DIFFICULTIES) {
      const prev = bank[round][difficulty];
      const next = prev.filter((row) => !remove.has(row.id));
      for (const row of prev) {
        if (remove.has(row.id)) void deleteDictationAudioByItemId(row.id);
      }
      removed += prev.length - next.length;
      bank[round][difficulty] = next;
    }
  }
  if (removed > 0) await persistDictationBank(bank);
  return removed;
}

export function getDictationProgress(
  round: DictationRoundNum,
  difficulty: DictationDifficulty,
  setNumber: number,
): DictationProgressRecord | null {
  return readDictationProgressMap()[progressKey(round, difficulty, setNumber)] ?? null;
}

export function saveDictationAttempt(args: {
  round: DictationRoundNum;
  difficulty: DictationDifficulty;
  setNumber: number;
  attainedScore: number;
  maxScore: number;
}): DictationProgressRecord {
  const { round, difficulty, setNumber, attainedScore, maxScore } = args;
  const m = readDictationProgressMap();
  const k = progressKey(round, difficulty, setNumber);
  const prev = m[k];
  const bestScore = prev ? Math.max(prev.bestScore, attainedScore) : attainedScore;
  const next: DictationProgressRecord = {
    bestScore,
    maxScore,
    lastScore: attainedScore,
    updatedAt: new Date().toISOString(),
  };
  m[k] = next;
  localStorage.setItem(DICTATION_PROGRESS_KEY, JSON.stringify(m));
  emitDictationUpdate();
  return next;
}

export async function mergeDictationBankFromAdmin(
  text: string,
  round: DictationRoundNum,
): Promise<{ bank: DictationFullBank; patchCount: number }> {
  await ensureDictationBankReady();
  const rows = parseDictationBankJson(text.trim());
  const patches = dictationRowsToPatches(rows).map((p) => ({
    ...p,
    round,
    id: `dictation-r${round}-${p.difficulty}-${p.setNumber}-admin`,
  }));
  const bank = loadDictationBank();
  for (const p of patches) {
    const list = bank[p.round][p.difficulty];
    const idx = list.findIndex((x) => x.setNumber === p.setNumber);
    if (idx >= 0) list[idx] = p;
    else list.push(p);
  }
  for (const p of patches) {
    bank[p.round][p.difficulty].sort((a, b) => a.setNumber - b.setNumber);
  }
  await persistDictationBank(bank);
  return { bank, patchCount: patches.length };
}

export async function revertDictationSetsToDefaults(
  round: DictationRoundNum,
  difficulty: DictationDifficulty,
  setNumbers: number[],
): Promise<void> {
  if (setNumbers.length === 0) return;
  await ensureDictationBankReady();
  const bank = loadDictationBank();
  const byNum = new Map(bank[round][difficulty].map((x) => [x.setNumber, x]));
  for (const n of setNumbers) {
    byNum.delete(n);
  }
  bank[round][difficulty] = [...byNum.values()].sort((a, b) => a.setNumber - b.setNumber);
  await persistDictationBank(bank);
}

export function dictationMaxForDifficulty(difficulty: DictationDifficulty): number {
  return DICTATION_MAX_SCORE[difficulty];
}

export function clearAllDictationData(): void {
  if (typeof window === "undefined") return;
  dictationBankMemoryCache = emptyDictationFullBank();
  localStorage.setItem(DICTATION_BANK_KEY, JSON.stringify(dictationBankMemoryCache));
  localStorage.removeItem(DICTATION_PROGRESS_KEY);
  localStorage.removeItem(DICTATION_PROGRESS_LEGACY_KEY);
  void clearAllDictationAudioInIndexedDb();
  void clearDictationBankJson().catch(() => {});
  emitDictationUpdate();
}

export function countDictationSetsInBank(): number {
  const b = loadDictationBank();
  let n = 0;
  for (const r of DICTATION_ROUND_NUMBERS) {
    for (const d of DICTATION_DIFFICULTIES) n += b[r][d].length;
  }
  return n;
}

export function getDictationRoundStats(round: DictationRoundNum): {
  avgPercent: number | null;
  latestAttemptDate: string | null;
} {
  const bank = loadDictationBank();
  const progMap = readDictationProgressMap();
  const percents: number[] = [];
  let latest: string | null = null;
  for (const d of DICTATION_DIFFICULTIES) {
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
