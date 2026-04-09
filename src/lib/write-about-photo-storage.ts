import type { PhotoSpeakItem } from "@/types/photo-speak";

const ROUNDS_KEY = "ep-write-about-photo-rounds-v1";
const PROGRESS_KEY = "ep-write-about-photo-progress-v1";

export type WriteAboutPhotoRoundNum = 1 | 2 | 3 | 4 | 5;

export const WRITE_ABOUT_PHOTO_ROUND_NUMBERS: WriteAboutPhotoRoundNum[] = [1, 2, 3, 4, 5];

export interface WriteAboutPhotoRoundsState {
  rounds: Record<WriteAboutPhotoRoundNum, PhotoSpeakItem[]>;
}

export interface WriteAboutPhotoItemProgress {
  latestScore160: number;
  latestAttemptId: string;
  updatedAt: string;
}

function emptyRounds(): WriteAboutPhotoRoundsState {
  return {
    rounds: {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    },
  };
}

function isRound(n: number): n is WriteAboutPhotoRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export function loadWriteAboutPhotoRounds(): WriteAboutPhotoRoundsState {
  if (typeof window === "undefined") return emptyRounds();
  try {
    const raw = localStorage.getItem(ROUNDS_KEY);
    if (!raw) return emptyRounds();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyRounds();
    const r = (parsed as { rounds?: unknown }).rounds;
    if (!r || typeof r !== "object") return emptyRounds();
    const base = emptyRounds();
    for (const n of WRITE_ABOUT_PHOTO_ROUND_NUMBERS) {
      const arr = (r as Record<string, unknown>)[String(n)];
      if (Array.isArray(arr)) {
        base.rounds[n] = arr.filter((x) => x && typeof x === "object") as PhotoSpeakItem[];
      }
    }
    return base;
  } catch {
    return emptyRounds();
  }
}

export function saveWriteAboutPhotoRounds(state: WriteAboutPhotoRoundsState): void {
  localStorage.setItem(ROUNDS_KEY, JSON.stringify(state));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ep-write-about-photo-rounds"));
  }
}

export function getWriteAboutPhotoRoundCounts(): Record<WriteAboutPhotoRoundNum, number> {
  const s = loadWriteAboutPhotoRounds();
  return {
    1: s.rounds[1].length,
    2: s.rounds[2].length,
    3: s.rounds[3].length,
    4: s.rounds[4].length,
    5: s.rounds[5].length,
  };
}

/** Replace one round entirely (admin bulk). */
export function replaceWriteAboutPhotoRound(
  round: WriteAboutPhotoRoundNum,
  items: PhotoSpeakItem[],
): WriteAboutPhotoRoundsState {
  const s = loadWriteAboutPhotoRounds();
  s.rounds[round] = [...items];
  saveWriteAboutPhotoRounds(s);
  return s;
}

/** Merge by id within a round (upsert). */
export function mergeWriteAboutPhotoRoundItems(
  round: WriteAboutPhotoRoundNum,
  incoming: PhotoSpeakItem[],
): WriteAboutPhotoRoundsState {
  const s = loadWriteAboutPhotoRounds();
  const map = new Map<string, PhotoSpeakItem>();
  for (const t of s.rounds[round]) map.set(t.id, t);
  for (const t of incoming) map.set(t.id, t);
  s.rounds[round] = [...map.values()];
  saveWriteAboutPhotoRounds(s);
  return s;
}

export function removeWriteAboutPhotoItemsByIds(ids: string[]): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const s = loadWriteAboutPhotoRounds();
  for (const n of WRITE_ABOUT_PHOTO_ROUND_NUMBERS) {
    s.rounds[n] = s.rounds[n].filter((it) => !idSet.has(it.id));
  }
  saveWriteAboutPhotoRounds(s);
}

export function loadWriteAboutPhotoProgress(): Record<string, WriteAboutPhotoItemProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, WriteAboutPhotoItemProgress>;
  } catch {
    return {};
  }
}

function saveProgress(map: Record<string, WriteAboutPhotoItemProgress>): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ep-write-about-photo-progress"));
  }
}

export function recordWriteAboutPhotoProgress(
  itemId: string,
  score160: number,
  attemptId: string,
): void {
  const prev = loadWriteAboutPhotoProgress();
  prev[itemId] = {
    latestScore160: score160,
    latestAttemptId: attemptId,
    updatedAt: new Date().toISOString(),
  };
  saveProgress(prev);
}

export function getWriteAboutPhotoProgressForItem(itemId: string): WriteAboutPhotoItemProgress | undefined {
  return loadWriteAboutPhotoProgress()[itemId];
}

export function findWriteAboutPhotoItemInStorage(itemId: string): PhotoSpeakItem | undefined {
  const s = loadWriteAboutPhotoRounds();
  for (const n of WRITE_ABOUT_PHOTO_ROUND_NUMBERS) {
    const found = s.rounds[n].find((it) => it.id === itemId);
    if (found) return found;
  }
  return undefined;
}

export function getWriteAboutPhotoRoundForItemId(itemId: string): WriteAboutPhotoRoundNum | undefined {
  const s = loadWriteAboutPhotoRounds();
  for (const n of WRITE_ABOUT_PHOTO_ROUND_NUMBERS) {
    if (s.rounds[n].some((it) => it.id === itemId)) return n;
  }
  return undefined;
}

export function getWriteAboutPhotoSetByRound(round: number): PhotoSpeakItem[] | undefined {
  if (!isRound(round)) return undefined;
  return loadWriteAboutPhotoRounds().rounds[round];
}
