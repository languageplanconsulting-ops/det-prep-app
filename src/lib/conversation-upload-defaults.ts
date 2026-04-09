import {
  CONVERSATION_ROUND_COUNT,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";
import { mapConversationDifficulty } from "@/lib/conversation-admin";
import type {
  ConversationBankByRound,
  ConversationDifficulty,
  ConversationExam,
} from "@/types/conversation";

export type ConversationUploadInputRow = Partial<ConversationExam>;

export type ConversationSlotAgg = { exams: number; mcqItems: number };

function slotKey(r: number, d: ConversationDifficulty) {
  return `${r}:${d}`;
}

/** MCQ / scored steps represented in one exam row (from partial JSON). */
export function countMcqsInUploadRow(row: ConversationUploadInputRow): number {
  const sq = row.scenarioQuestions?.length ?? 0;
  const mq = row.mainQuestions?.length ?? 0;
  if (sq === 0 && mq === 0) return CONVERSATION_TOTAL_STEPS;
  return sq + mq;
}

export function emptyConversationAggMatrix(): Record<
  number,
  Record<ConversationDifficulty, ConversationSlotAgg>
> {
  const out: Record<number, Record<ConversationDifficulty, ConversationSlotAgg>> = {};
  for (let r = 1; r <= CONVERSATION_ROUND_COUNT; r++) {
    out[r] = {
      easy: { exams: 0, mcqItems: 0 },
      medium: { exams: 0, mcqItems: 0 },
      hard: { exams: 0, mcqItems: 0 },
    };
  }
  return out;
}

export function summarizeRowsIntoAggMatrix(rows: ConversationUploadInputRow[]) {
  const matrix = emptyConversationAggMatrix();
  for (const row of rows) {
    const d = row.difficulty;
    if (!d) continue;
    const r =
      typeof row.round === "number" && row.round >= 1 && row.round <= CONVERSATION_ROUND_COUNT
        ? row.round
        : 1;
    const cell = matrix[r]?.[d];
    if (!cell) continue;
    cell.exams += 1;
    cell.mcqItems += countMcqsInUploadRow(row);
  }
  return matrix;
}

/**
 * Assigns round, difficulty, setNumber, id, title the same way as admin JSON import
 * (next free set per round+difficulty from a starting set number).
 */
export function applyConversationUploadSlotDefaults(
  rows: ConversationUploadInputRow[],
  bank: ConversationBankByRound,
  selectedRound: number,
  selectedSet: number,
  selectedDifficulty: ConversationDifficulty,
): ConversationUploadInputRow[] {
  const assignedInBatch = new Map<string, Set<number>>();

  const keyOf = (r: number, d: ConversationDifficulty) => `${r}:${d}`;

  const isOccupied = (r: number, d: ConversationDifficulty, setNum: number) => {
    const inBank = (bank[r]?.[d] ?? []).some((e) => e.setNumber === setNum);
    const inBatch = assignedInBatch.get(keyOf(r, d))?.has(setNum) ?? false;
    return inBank || inBatch;
  };

  const noteAssigned = (r: number, d: ConversationDifficulty, setNum: number) => {
    const k = keyOf(r, d);
    if (!assignedInBatch.has(k)) assignedInBatch.set(k, new Set());
    assignedInBatch.get(k)!.add(setNum);
  };

  const allocateSet = (r: number, d: ConversationDifficulty) => {
    let n = Math.max(1, selectedSet);
    while (isOccupied(r, d, n)) n += 1;
    noteAssigned(r, d, n);
    return n;
  };

  return rows.map((row) => {
    let difficulty: ConversationDifficulty = selectedDifficulty;
    if (typeof row.difficulty === "string") {
      const mapped = mapConversationDifficulty(row.difficulty);
      if (mapped) difficulty = mapped;
    }

    let round = selectedRound;
    if (
      typeof row.round === "number" &&
      Number.isInteger(row.round) &&
      row.round >= 1 &&
      row.round <= CONVERSATION_ROUND_COUNT
    ) {
      round = row.round;
    }

    let targetSet: number;
    if (typeof row.setNumber === "number" && Number.isInteger(row.setNumber) && row.setNumber >= 1) {
      targetSet = row.setNumber;
      noteAssigned(round, difficulty, targetSet);
    } else {
      targetSet = allocateSet(round, difficulty);
    }

    const fallbackId = `conv_${difficulty}_${String(targetSet).padStart(2, "0")}`;
    const fallbackTitle = `Conversation ${difficulty.toUpperCase()} Set ${targetSet}`;
    return {
      ...row,
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : fallbackId,
      title:
        typeof row.title === "string" && row.title.trim() ? row.title.trim() : fallbackTitle,
      difficulty,
      round,
      setNumber: targetSet,
    };
  });
}

export function summarizeStoredExamsIntoAggMatrix(exams: ConversationExam[]) {
  const matrix = emptyConversationAggMatrix();
  for (const e of exams) {
    const r = e.round ?? 1;
    const cell = matrix[r]?.[e.difficulty];
    if (!cell) continue;
    cell.exams += 1;
    cell.mcqItems += e.scenarioQuestions.length + e.mainQuestions.length;
  }
  return matrix;
}
