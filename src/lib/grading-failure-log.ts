import "server-only";

import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import type { AllGradingAttemptsFailedError } from "@/lib/grading-escalation";

/** Marks the rows this module writes, so a query can separate them from real usage. */
export const GRADING_FAILED_OPERATION_SUFFIX = "_failed";

export function gradingFailedOperation(operation: string): string {
  return `${operation}${GRADING_FAILED_OPERATION_SUFFIX}`;
}

/**
 * Persist a total grading failure — every model on every reachable provider
 * refused this submission.
 *
 * Until now the only trace of that was a console line in the platform log.
 * That is why the August 2026 outage ran for a day and a half before a learner
 * emailed to say she could not see her score: nothing the admin can open shows
 * a grade that never happened, and the provider's own error text — the one
 * sentence that says WHICH key died and why — was thrown away with it.
 *
 * So the failure goes in `api_usage_logs` beside the successes, at zero cost so
 * it never moves the spend numbers, carrying the raw per-model failure strings.
 * Fire-and-forget: a learner already waited through the whole ladder, and this
 * row must never add to that or turn a 503 into a 500.
 */
export function logGradingFailure(input: {
  /** Same label used for the success row, e.g. "writing_report". */
  operation: string;
  userId: string | null;
  attemptId?: string | null;
  error: AllGradingAttemptsFailedError;
}): void {
  scheduleApiUsageLog({
    userId: input.userId,
    operation: gradingFailedOperation(input.operation),
    provider: "none",
    model: null,
    costUsd: 0,
    meta: {
      attemptId: input.attemptId ?? null,
      permanent: input.error.permanent,
      failures: input.error.failures,
    },
  });
}

/** The ladder ran out of luck, but the next submit may well work. */
export const GRADING_BUSY_MESSAGE =
  "ระบบตรวจกำลังไม่ว่างชั่วคราว งานของคุณยังอยู่ครบ — กดส่งอีกครั้งได้เลย (Grading is briefly busy. Your work is safe — please submit again.)";

/**
 * No provider is reachable at all. "Try again" would be a lie, and a learner
 * who trusts it re-sends the same answer into the same wall until they give up
 * and write to support — which is exactly what happened. Tell them it is our
 * side, tell them their credit is intact, and tell them to keep their work.
 */
export const GRADING_UNAVAILABLE_MESSAGE =
  "ตอนนี้ระบบตรวจอัตโนมัติใช้งานไม่ได้ (เป็นปัญหาฝั่งเรา ไม่ใช่บัญชีของคุณ) — คำตอบของคุณยังอยู่บนหน้าจอ กรุณาคัดลอกเก็บไว้ก่อน แล้วกลับมาส่งใหม่ภายหลัง เครดิตของคุณยังไม่ถูกตัด และทีมงานได้รับแจ้งแล้ว (Automatic grading is down on our side — not your account. Your answer is still on screen: please copy it and submit again later. No feedback credit was used, and the team has been notified.)";

/** Body for the 503 the routes return when the whole ladder failed. */
export function gradingFailureResponseBody(error: AllGradingAttemptsFailedError): {
  error: string;
  retryable: boolean;
} {
  return {
    error: error.permanent ? GRADING_UNAVAILABLE_MESSAGE : GRADING_BUSY_MESSAGE,
    retryable: error.retryable,
  };
}
