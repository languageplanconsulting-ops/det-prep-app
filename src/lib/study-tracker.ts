const ACTIVE_SESSION_KEY = "active_session";
const SESSION_API = "/api/study/session";

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

  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Active visible study time in seconds (tab visible only).
   */
  getElapsedSeconds(): number {
    if (typeof document === "undefined") {
      return Math.floor(this.visibleMsAtPause / 1000);
    }
    if (document.visibilityState === "hidden") {
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

    this.onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.pauseVisibleClock();
      } else {
        this.resumeVisibleClock();
      }
    };
    document.addEventListener("visibilitychange", this.onVisibilityChange);

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
    this.visibleMsAtPause += Date.now() - this.visibleSegmentStart;
  }

  private resumeVisibleClock(): void {
    this.visibleSegmentStart = Date.now();
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
    }
    this.tickIntervalId = setInterval(() => {
      void this.pushDuration();
    }, 5000);
    void this.pushDuration();
  }

  private async pushDuration(): Promise<void> {
    if (!this.sessionId) return;
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
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }
}
