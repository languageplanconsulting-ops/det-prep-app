import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";
import { buildSpeakingAttemptReport } from "@/lib/speaking-report";

export function buildPhotoSpeakAttemptReport(
  attemptId: string,
  itemId: string,
  titleEn: string,
  titleTh: string,
  promptEn: string,
  promptTh: string,
  prepMinutes: number,
  transcript: string,
  imageUrl: string,
  taskKeywords: string[],
  originHub?: "speak-about-photo" | "write-about-photo",
): PhotoSpeakAttemptReport {
  const base = buildSpeakingAttemptReport(
    attemptId,
    itemId,
    titleEn,
    titleTh,
    itemId,
    promptEn,
    promptTh,
    prepMinutes,
    transcript,
    { taskKeywordHints: taskKeywords, variant: "photo-speak" },
  );
  return {
    ...base,
    kind: "photo-speak",
    imageUrl,
    taskKeywords,
    ...(originHub ? { originHub } : {}),
  };
}
