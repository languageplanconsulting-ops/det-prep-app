import { STUDY_IDLE_PAUSE_MS } from "@/lib/study-session-limits";

const ACTIVE_SESSION_KEY = "active_session";
const SESSION_API = "/api/study/session";

/** User-interaction events that keep the study clock running. */
const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "mousemove",
  "wheel",
  "touchstart",
  "scroll",
] as const;

export type StudySkill =
  | "literacy"
  | "comprehension"
  | "conversation"
  | "production"
  | "mock_test";

export type StudyDifficulty = "easy" | "medium" | "hard";

let recoveryPromise: Promise<void> | null = null;

async function endSessionRemote(
  sessionId: string,
  score: number | null | undefined,
  completed: boolean,
  durationSeconds?: number,
): Promise<void> {
  const res = await fetch(SESSION_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      sessionId,
      score,
      completed,
      ...(durationSeconds !== undefined
        ? { duration_seconds: durationSeconds }
        : {}),
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to end session (${res.status})`);
  }
}

export async function finalizeLatestStudySession(params: {
  exerciseType: string;
  setId?: string | null;
  score?: number | null;
  completed?: boolean;
  submissionPayload?: unknown;
  reportPayload?: unknown;
}): Promise<void> {
  const res = await fetch(SESSION_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      exerciseType: params.exerciseType,
      setId: params.setId ?? null,
      score: params.score ?? null,
      completed: params.completed ?? true,
      submission_payload: params.submissionPayload,
      report_payload: params.reportPayload,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to finalize session (${res.status})`);
  }
}

/**
 * On app load, ends any persisted session as incomplete (abandoned).
 */
export function recoverAbandonedStudySession(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (recoveryPromise) return recoveryPromise;
  recoveryPromise = (async () => {
    const sessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!sessionId) return;
    try {
      await endSessionRemote(sessionId, undefined, false);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      /* keep localStorage for a later retry */
    }
  })();
  return recoveryPromise;
}

async function clearStaleSessionIfAny(): Promise<void> {
  const existing = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!existing) return;
  try {
    await endSessionRemote(existing, undefined, false);
  } catch {
    /* ignore; startSession may still proceed */
  }
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export class StudyTracker {
  private sessionId: string | null = null;
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  /** Sum of completed visible segments (ms), excluding the current segment. */
  private visibleMsAtPause = 0;
  /** Start of the current visible segment (when tab is visible). */
  private visibleSegmentStart = 0;
  private onVisibilityChange: (() => void) | null = null;
  /** Timestamp (ms) of the last real user interaction. */
  private lastActivityAt = 0;
  /** True while the clock is paused for inactivity (tab visible but idle). */
  private idle = false;
  private onActivity: (() => void) | null = null;

  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Active visible study time in seconds (tab visible AND not idle only).
   */
  getElapsedSeconds(): number {
    if (typeof document === "undefined") {
      return Math.floor(this.visibleMsAtPause / 1000);
    }
    if (this.idle || document.visibilityState === "hidden") {
      return Math.floor(this.visibleMsAtPause / 1000);
    }
    return Math.floor(
      (this.visibleMsAtPause + (Date.now() - this.visibleSegmentStart)) / 1000,
    );
  }

  async startSession(
    _userId: string,
    exerciseType: string,
    skill: StudySkill,
    difficulty?: StudyDifficulty,
    setId?: string | null,
  ): Promise<string> {
    await clearStaleSessionIfAny();

    const res = await fetch(SESSION_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        exerciseType,
        skill,
        difficulty: difficulty ?? null,
        setId: setId ?? null,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Failed to start session (${res.status})`);
    }

    const { sessionId } = (await res.json()) as { sessionId: string };
    this.sessionId = sessionId;
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);

    this.visibleMsAtPause = 0;
    this.visibleSegmentStart = Date.now();
    this.lastActivityAt = Date.now();
    this.idle = false;

    this.onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.pauseVisibleClock();
      } else {
        // Returning to the tab counts as activity.
        this.lastActivityAt = Date.now();
        if (this.idle) this.resumeFromIdle();
        else this.resumeVisibleClock();
      }
    };
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.onActivity = () => {
      this.lastActivityAt = Date.now();
      if (this.idle) this.resumeFromIdle();
    };
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, this.onActivity, { passive: true });
    }

    this.tickIntervalId = setInterval(() => {
      void this.pushDuration();
    }, 5000);

    return sessionId;
  }

  private pauseVisibleClock(): void {
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
    // When already idle the active segment was folded in at pause; adding the
    // segment again here would count the idle gap.
    if (this.idle) return;
    this.visibleMsAtPause += Date.now() - this.visibleSegmentStart;
  }

  private resumeVisibleClock(): void {
    if (this.idle) {
      this.visibleSegmentStart = Date.now();
      return;
    }
    this.visibleSegmentStart = Date.now();
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
    }
    this.tickIntervalId = setInterval(() => {
      void this.pushDuration();
    }, 5000);
    void this.pushDuration();
  }

  /** Freeze the clock at the last interaction; stop accruing idle time. */
  private pauseForIdle(): void {
    if (this.idle) return;
    const activeMs = Math.max(0, this.lastActivityAt - this.visibleSegmentStart);
    this.visibleMsAtPause += activeMs;
    this.idle = true;
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
    void this.pushDuration();
  }

  /** Resume counting after the learner interacts again. */
  private resumeFromIdle(): void {
    if (!this.idle) return;
    this.idle = false;
    this.visibleSegmentStart = Date.now();
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
    }
    this.tickIntervalId = setInterval(() => {
      void this.pushDuration();
    }, 5000);
  }

  private async pushDuration(): Promise<void> {
    if (!this.sessionId) return;
    // Pause the clock if the learner has gone idle (tab visible but no
    // interaction for a while) — an abandoned open tab stops accruing time.
    if (
      !this.idle &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      Date.now() - this.lastActivityAt > STUDY_IDLE_PAUSE_MS
    ) {
      this.pauseForIdle();
      return;
    }
    const seconds = this.getElapsedSeconds();
    try {
      const res = await fetch(SESSION_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          sessionId: this.sessionId,
          duration_seconds: seconds,
        }),
      });
      if (!res.ok) {
        console.warn("[StudyTracker] PATCH duration failed", res.status);
      }
    } catch (e) {
      console.warn("[StudyTracker] PATCH duration error", e);
    }
  }

  async endSession(
    sessionId: string,
    score: number | null | undefined,
    completed: boolean,
  ): Promise<void> {
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    if (this.onActivity) {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, this.onActivity);
      }
      this.onActivity = null;
    }
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }

    const finalSeconds = this.getElapsedSeconds();

    if (this.sessionId === sessionId) {
      this.sessionId = null;
    }

    localStorage.removeItem(ACTIVE_SESSION_KEY);

    await endSessionRemote(sessionId, score, completed, finalSeconds);
  }

  /**
   * Tear down listeners/timers without remote end (e.g. after endSession elsewhere).
   */
  dispose(): void {
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    if (this.onActivity) {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, this.onActivity);
      }
      this.onActivity = null;
    }
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }
}
