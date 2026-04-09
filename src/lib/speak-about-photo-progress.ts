import {
  getWriteAboutPhotoSetByRound,
  type WriteAboutPhotoRoundNum,
} from "@/lib/write-about-photo-storage";

const PROGRESS_KEY = "ep-speak-about-photo-progress-v1";

export interface SpeakAboutPhotoItemProgress {
  latestScore160: number;
  latestAttemptId: string;
  updatedAt: string;
}

function dispatchProgress(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ep-speak-about-photo-progress"));
  }
}

export function loadSpeakAboutPhotoProgress(): Record<string, SpeakAboutPhotoItemProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, SpeakAboutPhotoItemProgress>;
  } catch {
    return {};
  }
}

function saveProgress(map: Record<string, SpeakAboutPhotoItemProgress>): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  dispatchProgress();
}

export function recordSpeakAboutPhotoProgress(
  itemId: string,
  score160: number,
  attemptId: string,
): void {
  const prev = loadSpeakAboutPhotoProgress();
  prev[itemId] = {
    latestScore160: score160,
    latestAttemptId: attemptId,
    updatedAt: new Date().toISOString(),
  };
  saveProgress(prev);
}

export function getSpeakAboutPhotoProgressForItem(
  itemId: string,
): SpeakAboutPhotoItemProgress | undefined {
  return loadSpeakAboutPhotoProgress()[itemId];
}

/** Average score (speak attempts only) and most recent attempt time in a round. */
export function getSpeakAboutPhotoRoundStats(round: WriteAboutPhotoRoundNum): {
  photoCount: number;
  averageScore: number | null;
  lastAttemptedAt: string | null;
} {
  const items = getWriteAboutPhotoSetByRound(round) ?? [];
  const scores: number[] = [];
  let lastAt: string | null = null;
  for (const it of items) {
    const p = getSpeakAboutPhotoProgressForItem(it.id);
    if (p) {
      scores.push(p.latestScore160);
      if (!lastAt || p.updatedAt > lastAt) lastAt = p.updatedAt;
    }
  }
  const averageScore =
    scores.length === 0
      ? null
      : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return {
    photoCount: items.length,
    averageScore,
    lastAttemptedAt: lastAt,
  };
}
