import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";

const REPORT_PREFIX = "ep-photo-speak-report:";

/** Same-tab handoff cache: session page stashes the report here right before navigating. */
export function savePhotoSpeakReport(report: PhotoSpeakAttemptReport): void {
  try {
    localStorage.setItem(`${REPORT_PREFIX}${report.attemptId}`, JSON.stringify(report));
  } catch {
    /* Safari/private mode: same-tab handoff still covers immediate report view. */
  }
}

export function loadPhotoSpeakReport(attemptId: string): PhotoSpeakAttemptReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${REPORT_PREFIX}${attemptId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PhotoSpeakAttemptReport;
  } catch {
    return null;
  }
}
