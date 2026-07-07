import { CONTENT_BANK_KEYS } from "@/lib/content-bank-sync";

export const PRACTICE_BANK_KEYS = CONTENT_BANK_KEYS;

export const PRACTICE_BANK_KEY = {
  conversation: "ep-conversation-bank-v2",
  dictation: "ep-dictation-bank-v1",
  fitbBank: "ep-fitb-bank-v1",
  fitbOccupancy: "ep-fitb-admin-uploaded-v2",
  readingBank: "ep-reading-sets",
  readingOccupancy: "ep-reading-admin-uploaded-v1",
  vocabBank: "ep-vocab-sets",
  vocabOccupancy: "ep-vocab-admin-uploaded-v1",
  realword: "ep-realword-bank-v1",
  dialogueSummaryBank: "ep-dialogue-summary-bank-v1",
  dialogueSummaryOccupancy: "ep-dialogue-summary-admin-uploaded-v1",
  interactiveSpeaking: "ep-interactive-speaking-scenarios-v1",
} as const;

export function snapGet(snapshot: Record<string, string>, key: string): string | null {
  const v = snapshot[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}
