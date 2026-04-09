import { DIALOGUE_SUMMARY_ROUND_NUMBERS, DIALOGUE_SUMMARY_SET_COUNT } from "@/lib/dialogue-summary-constants";
import type {
  DialogueSummaryDifficulty,
  DialogueSummaryExam,
  DialogueSummaryFullBank,
  DialogueSummaryRoundNum,
} from "@/types/dialogue-summary";

function placeholderExam(
  round: DialogueSummaryRoundNum,
  difficulty: DialogueSummaryDifficulty,
  setNumber: number,
): DialogueSummaryExam {
  const id = `ds-r${round}-${difficulty}-s${String(setNumber).padStart(2, "0")}`;
  return {
    id,
    round,
    difficulty,
    setNumber,
    titleEn: `Café scheduling (set ${setNumber})`,
    titleTh: `นัดร้านกาแฟ (ชุด ${setNumber})`,
    scenarioSentences: [
      "Alex and Jordan work at a small design studio downtown.",
      "Their client suddenly asked to move Friday's presentation to Monday morning.",
      "The team is split: some want to accept; others worry about unfinished slides.",
      "They meet briefly at a café across the street to decide what to tell the client.",
      "They must agree on a polite reply before the café closes in twenty minutes.",
    ],
    dialogue: [
      { speaker: "Alex", text: "I know Monday is tight, but refusing might upset the client." },
      { speaker: "Jordan", text: "True, yet our deck still has placeholder charts in section four." },
      { speaker: "Alex", text: "Could we ship a trimmed version and label it 'preview'?" },
      { speaker: "Jordan", text: "Risky — they might think we're unprofessional." },
      { speaker: "Alex", text: "Then we ask for Sunday night instead of Monday morning?" },
      { speaker: "Jordan", text: "That buys us one more day. I'll check if Maya can animate tonight." },
      { speaker: "Alex", text: "If she can't, we propose Tuesday with a clear timeline." },
      { speaker: "Jordan", text: "I'll draft two emails: one optimistic, one conservative." },
      { speaker: "Alex", text: "Lead with gratitude; stress quality over speed." },
      { speaker: "Jordan", text: "Agreed. Let's send the conservative one first and keep the other ready." },
    ],
  };
}

export function emptyDialogueSummaryFullBank(): DialogueSummaryFullBank {
  const b = {} as DialogueSummaryFullBank;
  for (const r of DIALOGUE_SUMMARY_ROUND_NUMBERS) {
    b[r] = { easy: [], medium: [], hard: [] };
  }
  return b;
}

/** Built-in content only in round 1; other rounds start empty until admin upload. */
export function defaultDialogueSummaryFullBank(): DialogueSummaryFullBank {
  const bank = emptyDialogueSummaryFullBank();
  const r = 1 as DialogueSummaryRoundNum;
  for (const d of ["easy", "medium", "hard"] as const) {
    bank[r][d] = Array.from({ length: DIALOGUE_SUMMARY_SET_COUNT }, (_, i) =>
      placeholderExam(r, d, i + 1),
    );
  }
  return bank;
}
