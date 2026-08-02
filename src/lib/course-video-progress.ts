/**
 * Persist / restore how far a learner got in a course lecture video.
 *
 * Server (`course_lesson_progress.watched_seconds`) is the source of truth when
 * logged in; localStorage covers admin-code preview and offline gaps.
 */

const STORAGE_KEY = "ep-course-video-progress-v1";

type ProgressMap = Record<string, { seconds: number; updatedAt: string }>;

function readMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: ProgressMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

/** Best known resume point for a lesson (local only). */
export function getLocalWatchedSeconds(lessonId: string): number {
  const row = readMap()[lessonId];
  return row ? Math.max(0, Math.floor(row.seconds)) : 0;
}

export function setLocalWatchedSeconds(lessonId: string, seconds: number) {
  const map = readMap();
  const next = Math.max(0, Math.floor(seconds));
  const prev = map[lessonId]?.seconds ?? 0;
  // Keep the furthest point so a scrub-back does not erase resume progress.
  map[lessonId] = {
    seconds: Math.max(prev, next),
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
}

/**
 * Save progress: always local; also POST to the API when the session has a user.
 * `completed` only when the caller marks the lesson done.
 */
export async function saveLessonWatchProgress(opts: {
  lessonId: string;
  watchedSeconds: number;
  completed?: boolean;
}): Promise<void> {
  const seconds = Math.max(0, Math.floor(opts.watchedSeconds));
  setLocalWatchedSeconds(opts.lessonId, seconds);

  const body: Record<string, unknown> = {
    lessonId: opts.lessonId,
    watchedSeconds: seconds,
  };
  // Only send completed:true — omit otherwise so the API keeps prior completion.
  if (opts.completed === true) body.completed = true;

  try {
    await fetch("/api/course/lesson-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    /* local already saved */
  }
}

export function formatWatchClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
