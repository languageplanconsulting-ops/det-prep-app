import type { ConversationDifficulty } from "@/types/conversation";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";
import type { FitbDifficulty, FitbRoundNum } from "@/types/fitb";
import type { RealWordDifficulty, RealWordRoundNum } from "@/types/realword";
import type { DialogueSummaryDifficulty, DialogueSummaryRoundNum } from "@/types/dialogue-summary";
import type { ReadingDifficulty, ReadingRoundNum } from "@/types/reading";
import type { VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

import { removeConversationExamsFromAdmin } from "@/lib/conversation-storage";
import { revertDictationSetsToDefaults } from "@/lib/dictation-storage";
import { revertFitbAdminSlotsToDefaults } from "@/lib/fitb-storage";
import { removePhotoSpeakItemsByIds } from "@/lib/photo-speak-storage";
import { removeWriteAboutPhotoItemsByIds } from "@/lib/write-about-photo-storage";
import { revertReadingSetsToDefaults } from "@/lib/reading-storage";
import { revertDialogueSummarySlots } from "@/lib/dialogue-summary-storage";
import { revertRealWordSetToDefault } from "@/lib/realword-storage";
import { removeSpeakingTopicsByIds } from "@/lib/speaking-storage";
import { removeVocabPassagesFromAdmin } from "@/lib/vocab-storage";
import { removeInteractiveSpeakingScenariosByIds } from "@/lib/interactive-speaking-storage";
import { removeWritingTopicsByIds } from "@/lib/writing-storage";

export type AdminExamUploadKind =
  | "writing"
  | "speaking"
  | "photo"
  | "writeAboutPhoto"
  | "reading"
  | "vocab"
  | "dictation"
  | "fitb"
  | "conversation"
  | "realword"
  | "dialogueSummary"
  | "interactiveSpeaking";

export type AdminUploadRevertSpec =
  | {
      kind: "conversation";
      /** Per-exam targets (supports mixed difficulty/round in one import). */
      slots?: { round: number; difficulty: ConversationDifficulty; setNumber: number }[];
      /** Legacy: single difficulty strip */
      round?: number;
      difficulty?: ConversationDifficulty;
      setNumbers?: number[];
    }
  | { kind: "dictation"; difficulty: DictationDifficulty; setNumbers: number[]; round: DictationRoundNum }
  | { kind: "reading"; difficulty: ReadingDifficulty; setNumbers: number[]; round: ReadingRoundNum }
  | {
      kind: "vocab";
      round: VocabRoundNum;
      setNumber: number;
      passages: { contentLevel: VocabSessionLevel; passageNumber: number }[];
    }
  | { kind: "fitb"; difficulty: FitbDifficulty; setNumbers: number[]; round: FitbRoundNum }
  | { kind: "realword"; difficulty: RealWordDifficulty; setNumbers: number[]; round: RealWordRoundNum }
  | {
      kind: "dialogueSummary";
      slots: { round: DialogueSummaryRoundNum; difficulty: DialogueSummaryDifficulty; setNumber: number }[];
    }
  | { kind: "writing"; topicIds: string[] }
  | { kind: "speaking"; topicIds: string[] }
  | { kind: "photo"; itemIds: string[] }
  | { kind: "writeAboutPhoto"; itemIds: string[] }
  | { kind: "interactiveSpeaking"; ids: string[] };

export type AdminUploadLogEntry = {
  id: string;
  at: string;
  examKind: AdminExamUploadKind;
  fileName: string | null;
  summary: string;
  rawText: string;
  rawTruncated: boolean;
  revertSpec: AdminUploadRevertSpec | null;
};

const LOG_KEY = "ep-admin-upload-log-v1";
const MAX_ENTRIES = 80;
const MAX_RAW_CHARS = 40_000;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `upl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emitAdminUploadLogChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("admin-upload-log-changed"));
}

export function loadAdminUploadLog(): AdminUploadLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.filter((x): x is AdminUploadLogEntry => {
      return (
        !!x &&
        typeof x === "object" &&
        typeof (x as AdminUploadLogEntry).id === "string" &&
        typeof (x as AdminUploadLogEntry).rawText === "string" &&
        typeof (x as AdminUploadLogEntry).examKind === "string"
      );
    });
    let changed = false;
    const normalized = cleaned.slice(0, MAX_ENTRIES).map((e) => {
      if (e.rawText.length <= MAX_RAW_CHARS) return e;
      changed = true;
      return {
        ...e,
        rawText: e.rawText.slice(0, MAX_RAW_CHARS),
        rawTruncated: true,
      };
    });
    if (changed) {
      try {
        persistLog(normalized);
      } catch {
        /* ignore */
      }
    }
    return normalized;
  } catch {
    return [];
  }
}

function persistLog(entries: AdminUploadLogEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOG_KEY, JSON.stringify(entries));
}

export function appendAdminUploadLog(args: {
  examKind: AdminExamUploadKind;
  fileName: string | null;
  summary: string;
  rawText: string;
  revertSpec: AdminUploadRevertSpec | null;
}): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: false, error: "Not in browser." };
  const rawTruncated = args.rawText.length > MAX_RAW_CHARS;
  const rawText = rawTruncated ? args.rawText.slice(0, MAX_RAW_CHARS) : args.rawText;
  const entry: AdminUploadLogEntry = {
    id: newId(),
    at: new Date().toISOString(),
    examKind: args.examKind,
    fileName: args.fileName?.trim() || null,
    summary: rawTruncated ? `${args.summary} (file text truncated for storage)` : args.summary,
    rawText,
    rawTruncated,
    revertSpec: args.revertSpec,
  };
  const prev = loadAdminUploadLog();
  const next = [entry, ...prev].slice(0, MAX_ENTRIES);
  try {
    persistLog(next);
    emitAdminUploadLogChanged();
    return { ok: true };
  } catch {
    // Fallback: keep the log entry metadata but drop raw text payload to reduce storage pressure.
    const liteEntry: AdminUploadLogEntry = {
      ...entry,
      rawText: "",
      rawTruncated: true,
      summary: `${entry.summary} (raw text omitted: storage full)`,
    };
    const liteNext = [liteEntry, ...prev].slice(0, MAX_ENTRIES);
    try {
      persistLog(liteNext);
      emitAdminUploadLogChanged();
      return { ok: true };
    } catch {
      return {
        ok: false,
        error:
          "Could not save upload log (storage full). Clear old uploads or large audio data in this browser.",
      };
    }
  }
}

export function removeAdminUploadLogEntry(id: string): void {
  const next = loadAdminUploadLog().filter((e) => e.id !== id);
  persistLog(next);
  emitAdminUploadLogChanged();
}

export function clearAdminUploadLogForExamKind(examKind: AdminExamUploadKind): void {
  if (typeof window === "undefined") return;
  const next = loadAdminUploadLog().filter((e) => e.examKind !== examKind);
  persistLog(next);
  emitAdminUploadLogChanged();
}

export async function applyAdminUploadRevert(
  entry: AdminUploadLogEntry,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!entry.revertSpec) {
    return { ok: false, error: "This entry has no revert data (log-only)." };
  }
  const spec = entry.revertSpec;
  try {
    switch (spec.kind) {
      case "conversation": {
        const cs = spec as {
          slots?: { round: number; difficulty: ConversationDifficulty; setNumber: number }[];
          round?: number;
          difficulty?: ConversationDifficulty;
          setNumbers?: number[];
        };
        if (Array.isArray(cs.slots) && cs.slots.length > 0) {
          for (const s of cs.slots) {
            removeConversationExamsFromAdmin(s.round, s.difficulty, [s.setNumber]);
          }
        } else if (
          typeof cs.round === "number" &&
          cs.difficulty &&
          Array.isArray(cs.setNumbers) &&
          cs.setNumbers.length > 0
        ) {
          removeConversationExamsFromAdmin(cs.round, cs.difficulty, cs.setNumbers);
        }
        break;
      }
      case "dictation": {
        const dr = spec as { round?: DictationRoundNum };
        const round: DictationRoundNum =
          dr.round === 1 || dr.round === 2 || dr.round === 3 || dr.round === 4 || dr.round === 5
            ? dr.round
            : 1;
        await revertDictationSetsToDefaults(round, spec.difficulty, spec.setNumbers);
        break;
      }
      case "reading": {
        const rr = spec as { round?: ReadingRoundNum };
        const round: ReadingRoundNum =
          rr.round === 1 || rr.round === 2 || rr.round === 3 || rr.round === 4 || rr.round === 5
            ? rr.round
            : 1;
        revertReadingSetsToDefaults(round, spec.difficulty, spec.setNumbers);
        break;
      }
      case "vocab": {
        const vr = spec as { round?: VocabRoundNum };
        const round: VocabRoundNum =
          vr.round === 1 || vr.round === 2 || vr.round === 3 || vr.round === 4 || vr.round === 5
            ? vr.round
            : 1;
        removeVocabPassagesFromAdmin(spec.setNumber, spec.passages, round);
        break;
      }
      case "fitb": {
        const fr = spec as { round?: FitbRoundNum };
        const round = fr.round ?? 1;
        revertFitbAdminSlotsToDefaults(round, spec.difficulty, spec.setNumbers);
        break;
      }
      case "realword": {
        const rw = spec as {
          difficulty: RealWordDifficulty;
          setNumbers?: number[];
          setNumber?: number;
          round?: RealWordRoundNum;
        };
        const round: RealWordRoundNum =
          rw.round === 1 || rw.round === 2 || rw.round === 3 || rw.round === 4 || rw.round === 5
            ? rw.round
            : 1;
        const nums =
          Array.isArray(rw.setNumbers) && rw.setNumbers.length > 0
            ? rw.setNumbers
            : typeof rw.setNumber === "number"
              ? [rw.setNumber]
              : [];
        for (const n of nums) {
          revertRealWordSetToDefault(round, rw.difficulty, n);
        }
        break;
      }
      case "dialogueSummary": {
        const ds = spec as {
          slots?: { round: DialogueSummaryRoundNum; difficulty: DialogueSummaryDifficulty; setNumber: number }[];
        };
        if (Array.isArray(ds.slots) && ds.slots.length > 0) {
          revertDialogueSummarySlots(ds.slots);
        }
        break;
      }
      case "writing":
        removeWritingTopicsByIds(spec.topicIds);
        break;
      case "speaking":
        removeSpeakingTopicsByIds(spec.topicIds);
        break;
      case "photo":
        removePhotoSpeakItemsByIds(spec.itemIds);
        break;
      case "writeAboutPhoto":
        removeWriteAboutPhotoItemsByIds(spec.itemIds);
        break;
      case "interactiveSpeaking":
        removeInteractiveSpeakingScenariosByIds(spec.ids);
        break;
    }
    removeAdminUploadLogEntry(entry.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Revert failed." };
  }
}
