import {
  getConversationExamFromBank,
  parseConversationBankFromJson,
} from "@/lib/conversation-storage";
import {
  getDictationItemFromBank,
  parseDictationBankFromJson,
} from "@/lib/dictation-storage";
import {
  composeDialogueSummaryVisibleBank,
  parseDialogueSummaryAdminOccupancyFromJson,
  parseDialogueSummaryBankFromJson,
} from "@/lib/dialogue-summary-storage";
import {
  composeFitbVisibleBank,
  parseFitbAdminOccupancyFromJson,
  parseFitbBankFromJson,
} from "@/lib/fitb-storage";
import { PRACTICE_BANK_KEY, snapGet } from "@/lib/practice-content/keys";
import type { PracticeContentSnapshot, PracticeSetQuery } from "@/lib/practice-content/types";
import {
  composeRealWordVisibleBank,
  parseRealWordBankFromJson,
} from "@/lib/realword-storage";
import {
  composeReadingVisibleBank,
  getReadingExamFromSet,
  parseReadingAdminOccupancyFromJson,
  parseReadingBankFromJson,
} from "@/lib/reading-storage";
import {
  composeVocabVisibleBank,
  getVocabPassageFromSet,
  parseVocabAdminOccupancyFromJson,
  parseVocabBankFromJson,
} from "@/lib/vocab-storage";
import type { ConversationDifficulty } from "@/types/conversation";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";
import type { DialogueSummaryDifficulty, DialogueSummaryRoundNum } from "@/types/dialogue-summary";
import type { FitbDifficulty, FitbRoundNum } from "@/types/fitb";
import type { ReadingDifficulty, ReadingRoundNum } from "@/types/reading";
import type { RealWordDifficulty, RealWordRoundNum } from "@/types/realword";
import type { VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

export function resolveDictationItem(
  snapshot: PracticeContentSnapshot,
  round: DictationRoundNum,
  difficulty: DictationDifficulty,
  setNumber: number,
) {
  const bank = parseDictationBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.dictation));
  return getDictationItemFromBank(bank, round, difficulty, setNumber);
}

export function resolveFitbSet(
  snapshot: PracticeContentSnapshot,
  round: FitbRoundNum,
  difficulty: FitbDifficulty,
  setNumber: number,
) {
  const bank = parseFitbBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.fitbBank));
  const occ = parseFitbAdminOccupancyFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.fitbOccupancy));
  const visible = composeFitbVisibleBank(bank, occ);
  return visible[round][difficulty].find((s) => s.setNumber === setNumber) ?? null;
}

export function resolveReadingExam(
  snapshot: PracticeContentSnapshot,
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
  examNumber: number,
) {
  const set = resolveReadingSet(snapshot, round, difficulty, setNumber);
  if (!set) return null;
  return getReadingExamFromSet(set, examNumber) ?? null;
}

export function resolveReadingSet(
  snapshot: PracticeContentSnapshot,
  round: ReadingRoundNum,
  difficulty: ReadingDifficulty,
  setNumber: number,
) {
  const bank = parseReadingBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.readingBank));
  const occ = parseReadingAdminOccupancyFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.readingOccupancy));
  const visible = composeReadingVisibleBank(bank, occ);
  return visible[round][difficulty].find((s) => s.setNumber === setNumber) ?? null;
}

export function resolveVocabPassage(
  snapshot: PracticeContentSnapshot,
  round: VocabRoundNum,
  setNumber: number,
  passageNumber: number,
) {
  const set = resolveVocabSet(snapshot, round, setNumber);
  if (!set) return null;
  return getVocabPassageFromSet(set, passageNumber) ?? null;
}

export function resolveVocabSet(
  snapshot: PracticeContentSnapshot,
  round: VocabRoundNum,
  setNumber: number,
) {
  const bank = parseVocabBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.vocabBank));
  const occ = parseVocabAdminOccupancyFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.vocabOccupancy));
  const visible = composeVocabVisibleBank(bank, occ);
  return visible[round].find((s) => s.setNumber === setNumber) ?? null;
}

export function resolveRealWordSet(
  snapshot: PracticeContentSnapshot,
  round: RealWordRoundNum,
  difficulty: RealWordDifficulty,
  setNumber: number,
) {
  const bank = parseRealWordBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.realword));
  const visible = composeRealWordVisibleBank(bank);
  return visible[round][difficulty].find((s) => s.setNumber === setNumber) ?? null;
}

export function resolveConversationExam(
  snapshot: PracticeContentSnapshot,
  round: number,
  difficulty: ConversationDifficulty,
  setNumber: number,
) {
  const bank = parseConversationBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.conversation));
  return getConversationExamFromBank(bank, round, difficulty, setNumber);
}

export function resolveDialogueSummaryExam(
  snapshot: PracticeContentSnapshot,
  round: DialogueSummaryRoundNum,
  difficulty: DialogueSummaryDifficulty,
  setNumber: number,
) {
  const bank = parseDialogueSummaryBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.dialogueSummaryBank));
  const occ = parseDialogueSummaryAdminOccupancyFromJson(
    snapGet(snapshot, PRACTICE_BANK_KEY.dialogueSummaryOccupancy),
  );
  const visible = composeDialogueSummaryVisibleBank(bank, occ);
  return visible[round][difficulty].find((e) => e.setNumber === setNumber) ?? null;
}

/** List set numbers for a lane (same order as website grids). */
export function listLaneSetNumbers(
  snapshot: PracticeContentSnapshot,
  skill: PracticeSetQuery["skill"],
  round: number,
  difficulty?: string,
): number[] {
  switch (skill) {
    case "dictation": {
      const bank = parseDictationBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.dictation));
      const d = difficulty as DictationDifficulty;
      return bank[round as DictationRoundNum]?.[d]?.map((x) => x.setNumber).sort((a, b) => a - b) ?? [];
    }
    case "fitb": {
      const bank = parseFitbBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.fitbBank));
      const occ = parseFitbAdminOccupancyFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.fitbOccupancy));
      const visible = composeFitbVisibleBank(bank, occ);
      const d = difficulty as FitbDifficulty;
      return visible[round as FitbRoundNum]?.[d]?.map((x) => x.setNumber) ?? [];
    }
    case "reading": {
      const bank = parseReadingBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.readingBank));
      const occ = parseReadingAdminOccupancyFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.readingOccupancy));
      const visible = composeReadingVisibleBank(bank, occ);
      const d = difficulty as ReadingDifficulty;
      return visible[round as ReadingRoundNum]?.[d]?.map((x) => x.setNumber) ?? [];
    }
    case "vocab": {
      const bank = parseVocabBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.vocabBank));
      const occ = parseVocabAdminOccupancyFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.vocabOccupancy));
      const visible = composeVocabVisibleBank(bank, occ);
      return visible[round as VocabRoundNum]?.map((x) => x.setNumber) ?? [];
    }
    case "realword": {
      const bank = parseRealWordBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.realword));
      const visible = composeRealWordVisibleBank(bank);
      const d = difficulty as RealWordDifficulty;
      return visible[round as RealWordRoundNum]?.[d]?.map((x) => x.setNumber) ?? [];
    }
    case "conversation": {
      const bank = parseConversationBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.conversation));
      const d = difficulty as ConversationDifficulty;
      return bank[round]?.[d]?.filter((e) => e.setNumber > 0).map((e) => e.setNumber).sort((a, b) => a - b) ?? [];
    }
    case "dialogue_summary": {
      const bank = parseDialogueSummaryBankFromJson(snapGet(snapshot, PRACTICE_BANK_KEY.dialogueSummaryBank));
      const occ = parseDialogueSummaryAdminOccupancyFromJson(
        snapGet(snapshot, PRACTICE_BANK_KEY.dialogueSummaryOccupancy),
      );
      const visible = composeDialogueSummaryVisibleBank(bank, occ);
      const d = difficulty as DialogueSummaryDifficulty;
      return visible[round as DialogueSummaryRoundNum]?.[d]?.map((x) => x.setNumber) ?? [];
    }
    default:
      return [];
  }
}

export function resolvePracticeSet(snapshot: PracticeContentSnapshot, query: PracticeSetQuery): unknown {
  const { skill, round, set } = query;
  switch (skill) {
    case "dictation":
      return resolveDictationItem(
        snapshot,
        round as DictationRoundNum,
        query.difficulty as DictationDifficulty,
        set,
      );
    case "fitb":
      return resolveFitbSet(snapshot, round as FitbRoundNum, query.difficulty as FitbDifficulty, set);
    case "reading":
      return resolveReadingExam(
        snapshot,
        round as ReadingRoundNum,
        query.difficulty as ReadingDifficulty,
        set,
        query.exam ?? 1,
      );
    case "vocab":
      return resolveVocabPassage(snapshot, round as VocabRoundNum, set, query.passage ?? 1);
    case "realword":
      return resolveRealWordSet(
        snapshot,
        round as RealWordRoundNum,
        query.difficulty as RealWordDifficulty,
        set,
      );
    case "conversation":
      return resolveConversationExam(
        snapshot,
        round,
        query.difficulty as ConversationDifficulty,
        set,
      );
    case "dialogue_summary":
      return resolveDialogueSummaryExam(
        snapshot,
        round as DialogueSummaryRoundNum,
        query.difficulty as DialogueSummaryDifficulty,
        set,
      );
    default:
      return null;
  }
}

/** Strip heavy inline audio from API payloads; clients use audioPath or dedicated audio endpoint. */
export function stripInlineAudioForApi<T extends Record<string, unknown>>(payload: T): T {
  const out = { ...payload };
  if ("audioBase64" in out) delete out.audioBase64;
  if ("audioInIndexedDb" in out) delete out.audioInIndexedDb;
  if ("scenarioAudioBase64" in out) delete out.scenarioAudioBase64;
  if ("scenarioAudioInIndexedDb" in out) delete out.scenarioAudioInIndexedDb;
  if (Array.isArray(out.scenarioQuestions)) {
    (out as Record<string, unknown>).scenarioQuestions = (
      out.scenarioQuestions as Record<string, unknown>[]
    ).map((q) => {
      const qq = { ...q };
      delete qq.audioBase64;
      delete qq.audioInIndexedDb;
      return qq;
    });
  }
  if (Array.isArray(out.mainQuestions)) {
    (out as Record<string, unknown>).mainQuestions = (
      out.mainQuestions as Record<string, unknown>[]
    ).map((q) => {
      const qq = { ...q };
      delete qq.audioBase64;
      delete qq.audioInIndexedDb;
      return qq;
    });
  }
  return out;
}
