/**
 * DET "Interactive Writing" — on the real test since 2 April 2024, replacing Read, Then Write.
 * 30 s to read the prompt, 5 min for the main response, then ONE follow-up revealed only after the
 * main response is submitted, answered in 3 min. Mirrors src/lib/interactive-writing.ts.
 */
import type { WritingFollowUpPrompt, WritingTopic } from "./production-types";

export const IW_PREP_SECONDS = 30;
export const IW_MAIN_SECONDS = 5 * 60;
export const IW_FOLLOW_SECONDS = 3 * 60;
export const IW_MIN_TOTAL_WORDS = 50;
export const IW_LAUNCH_TH = "2 เมษายน 2024";
export const IW_LAUNCH_EN = "2 April 2024";

/** Offline fallback when the follow-up request itself fails. */
export function iwFallbackFollowUp(topic: WritingTopic): WritingFollowUpPrompt {
  return (
    topic.followUps?.find((f) => f.promptEn.trim()) ?? {
      promptEn:
        "What is the strongest argument against your opinion on this topic, and how would you respond to it? Explain your thoughts.",
      promptTh: "ลองมองจากมุมตรงข้าม ข้อโต้แย้งที่หนักแน่นที่สุดต่อความเห็นของคุณคืออะไร และคุณจะตอบกลับอย่างไร",
    }
  );
}
