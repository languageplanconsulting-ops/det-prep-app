"use client";

export type PracticeAttemptInput = {
  taskType: string;
  scorePct: number;
  detail?: Record<string, unknown>;
};

/** Best-effort: exam scoring/local storage is the source of truth, so a failed
 * or slow network call here must never block or break the submit flow. */
export async function postPracticeAttempt(input: PracticeAttemptInput): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/practice-attempts/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ attempt: input }),
    });
  } catch {
    /* ignore */
  }
}

export type ServerPracticeAttempt = {
  task_type: string;
  score_pct: number | null;
  detail: Record<string, unknown> | null;
  source: string;
  created_at: string;
};

export async function fetchPracticeAttempts(taskType: string): Promise<ServerPracticeAttempt[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch(`/api/practice-attempts/sync?taskType=${encodeURIComponent(taskType)}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const body = (await res.json().catch(() => ({}))) as { attempts?: ServerPracticeAttempt[] };
    return Array.isArray(body.attempts) ? body.attempts : [];
  } catch {
    return [];
  }
}
