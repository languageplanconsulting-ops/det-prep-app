import { NextResponse } from "next/server";

import { chargeAiCreditForUser } from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { gradingDeadlineFrom } from "@/lib/grading-escalation";
import { runGradingJob } from "@/lib/grading-job-runner";
import {
  completeGradingJob,
  listPendingGradingJobs,
  recordGradingJobFailure,
} from "@/lib/grading-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Sweep submissions whose learner closed the tab before grading finished.
 *
 * Someone who stays on the waiting screen finishes fastest — every poll of
 * /api/grading-job/[attemptId] is itself a grading attempt. This is the safety
 * net for everyone else: their answer was saved before grading started, so it
 * gets graded here and the real report is waiting when they come back.
 *
 * Auth mirrors /api/cron/content-health — Vercel sends
 * `Authorization: Bearer <CRON_SECRET>`; no secret configured means fail closed.
 * Schedule lives in vercel.json.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/grading-jobs] CRON_SECRET not set — refusing");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Deliberately small per run: these are minutes-old submissions, not a
  // backlog, and each one is a full grading pass.
  const jobs = await listPendingGradingJobs(8);
  let completed = 0;
  let stillPending = 0;

  for (const job of jobs) {
    // Leave room to finish the pass we start rather than being killed mid-flight.
    const deadlineAt = gradingDeadlineFrom(startedAt, maxDuration);
    if (deadlineAt - Date.now() < 40_000) break;
    try {
      const { report, usage } = await runGradingJob(job, { deadlineAt });
      let creditCharged = job.creditCharged;
      if (job.userId && !creditCharged) {
        const charged = await chargeAiCreditForUser(job.userId, job.surface);
        creditCharged = charged.ok;
      }
      await completeGradingJob({ attemptId: job.attemptId, report, creditCharged });
      completed++;
      if (usage) {
        scheduleApiUsageLog({
          userId: job.userId,
          operation: `${job.surface}_cron_rescue`,
          provider: usage.provider,
          model: usage.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          meta: { attemptId: job.attemptId, afterAttempts: job.attempts + 1 },
        });
      }
    } catch (e) {
      await recordGradingJobFailure({
        attemptId: job.attemptId,
        attempts: job.attempts,
        error: e instanceof Error ? e.message : String(e),
      });
      stillPending++;
    }
  }

  return NextResponse.json({
    ok: true,
    picked: jobs.length,
    completed,
    stillPending,
    tookMs: Date.now() - startedAt,
  });
}
