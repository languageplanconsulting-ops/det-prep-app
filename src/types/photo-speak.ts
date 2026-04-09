import type { SpeakingAttemptReport } from "@/types/speaking";

/** One photo task shown as a card on the hub. */
export interface PhotoSpeakItem {
  id: string;
  titleEn: string;
  titleTh: string;
  imageUrl: string;
  promptEn: string;
  promptTh: string;
  /** Admin hints for task relevancy (e.g. city, people, night). */
  keywords: string[];
  /**
   * Write-about-photo only: scene/context line from admin (optional; shown as hint).
   * Distinct from the answer prompt (`promptEn`).
   */
  contextEn?: string;
}

export interface PhotoSpeakAttemptReport extends SpeakingAttemptReport {
  kind: "photo-speak";
  imageUrl: string;
  taskKeywords: string[];
  /** Practice area that started this attempt (navigation + labels). */
  originHub?: "speak-about-photo" | "write-about-photo";
}
