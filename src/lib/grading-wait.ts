/**
 * Client half of the "never lose an answer" guarantee.
 *
 * A submit route answers one of three ways:
 *   200 + report   → graded, done
 *   202 + pending  → the answer is SAVED on the server but grading is still
 *                    going; keep asking, don't show an error
 *   4xx/5xx        → a real problem
 *
 * On 202 we poll the job. Each poll is itself a grading attempt server-side,
 * so waiting is what finishes the work. There is no timeout that gives up
 * quietly: if we stop polling we say so, and the report is still coming
 * (the cron sweep finishes it), so the learner can reopen it later.
 */

export const GRADING_PENDING_TH = "กำลังตรวจอยู่ โปรดรอสักครู่";
export const GRADING_PENDING_EN = "Still grading — please wait a moment.";

/** Gentle, then steady. Fast first polls catch the common quick recovery. */
const POLL_DELAYS_MS = [3000, 4000, 5000, 6000, 8000, 10000];

/** ~4 minutes of active waiting before we hand off to the background sweep. */
const MAX_POLLS = 30;

function delayFor(attempt: number): number {
  return POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)]!;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type GradingWaitOutcome<T> =
  | { kind: "done"; report: T }
  /** Still grading in the background; the learner can come back to it. */
  | { kind: "still-working" }
  /** Repeatedly failed — a human needs to look, retrying won't help. */
  | { kind: "abandoned"; message: string };

/**
 * Poll a pending grading job until the real report lands.
 *
 * `onTick` reports elapsed seconds so the UI can reassure without pretending
 * to know how long is left.
 */
export async function waitForGradingJob<T>(
  attemptId: string,
  opts?: { onTick?: (elapsedSeconds: number) => void; signal?: AbortSignal },
): Promise<GradingWaitOutcome<T>> {
  const startedAt = Date.now();
  for (let i = 0; i < MAX_POLLS; i++) {
    if (opts?.signal?.aborted) return { kind: "still-working" };
    await sleep(delayFor(i));
    opts?.onTick?.(Math.round((Date.now() - startedAt) / 1000));
    try {
      const res = await fetch(`/api/grading-job/${encodeURIComponent(attemptId)}`, {
        credentials: "same-origin",
        signal: opts?.signal,
      });
      if (!res.ok) continue; // transient — keep waiting, never fail the learner here
      const data = (await res.json()) as {
        status?: string;
        report?: T;
        error?: string;
      };
      if (data.status === "done" && data.report) {
        return { kind: "done", report: data.report };
      }
      if (data.status === "abandoned") {
        return {
          kind: "abandoned",
          message:
            data.error ??
            "ตรวจไม่สำเร็จ ทีมงานได้รับแจ้งแล้ว งานของคุณถูกเก็บไว้ครบ",
        };
      }
    } catch {
      // Network blip mid-wait. The job is safe on the server; keep polling.
    }
  }
  return { kind: "still-working" };
}

/**
 * Normalize a submit response. Returns the report when graded, or the
 * attemptId to wait on when the server accepted the work but isn't done.
 */
export type SubmitOutcome<T> =
  | { kind: "report"; report: T }
  | { kind: "pending"; attemptId: string };

export async function readGradingSubmitResponse<T>(
  res: Response,
): Promise<SubmitOutcome<T>> {
  const data = (await res.json()) as { error?: string; status?: string; attemptId?: string } & T;
  if (res.status === 202 && data.status === "pending" && data.attemptId) {
    return { kind: "pending", attemptId: data.attemptId };
  }
  if (!res.ok) {
    throw new Error(data.error || `Grading failed (${res.status})`);
  }
  return { kind: "report", report: data as T };
}
