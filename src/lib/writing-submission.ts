import type { WritingFollowUpPrompt } from "@/types/writing";

export type FollowUpResponse = {
  promptEn: string;
  promptTh: string;
  answer: string;
};

const SEP = "\n\n";

/** Builds one string for Gemini + highlight offsets (main essay + labeled follow-ups). */
export function buildWritingSubmissionBundle(
  mainEssay: string,
  followUps: WritingFollowUpPrompt[],
  answers: string[],
): string {
  let s = mainEssay.trim();
  const n = Math.min(followUps.length, answers.length);
  for (let i = 0; i < n; i++) {
    const fu = followUps[i];
    const a = answers[i]?.trim() ?? "";
    s += `${SEP}--- Follow-up ${i + 1} ---${SEP}`;
    s += `Prompt (EN): ${fu.promptEn}${SEP}`;
    s += `Prompt (TH): ${fu.promptTh}${SEP}`;
    s += `Learner response:${SEP}${a}`;
  }
  return s;
}

export function normalizeFollowUpResponses(
  followUps: WritingFollowUpPrompt[],
  answers: string[],
): FollowUpResponse[] {
  return followUps.map((p, i) => ({
    promptEn: p.promptEn,
    promptTh: p.promptTh,
    answer: (answers[i] ?? "").trim(),
  }));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
