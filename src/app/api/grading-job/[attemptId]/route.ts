import { NextResponse } from "next/server";
import { chargeAiCreditForUser } from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { getAdminAccess } from "@/lib/admin-auth";
import { gradingDeadlineFrom } from "@/lib/grading-escalation";
import { runGradingJob } from "@/lib/grading-job-runner";
import {
  GRADING_JOB_MAX_ATTEMPTS,
  GRADING_PENDING_MESSAGE_EN,
  GRADING_PENDING_MESSAGE_TH,
  completeGradingJob,
  getGradingJob,
  recordGradingJobFailure,
} from "@/lib/grading-jobs";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";

// Each poll does real grading work, so it needs the same budget as a submit.
export const maxDuration = 300;

/**
 * Status of one submission, and the thing that actually finishes it.
 *
 * The learner's "กำลังตรวจอยู่ โปรดรอสักครู่" screen polls here. Every poll
 * runs another full escalation pass, so waiting is not passive — it is the
 * retry. A learner who keeps the screen open finishes fastest; one who closes
 * the tab is picked up by the cron sweep instead, and their report is waiting
 * when they come back.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const startedAt = Date.now();
  const { attemptId } = await ctx.params;
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }

  const job = await getGradingJob(attemptId);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A job belongs to whoever submitted it. Anonymous jobs (user_id null) stay
  // readable by attempt id, which is an unguessable client-generated value.
  const userId = await getOptionalAuthUserId(req);
  if (job.userId && job.userId !== userId) {
    const admin = await getAdminAccess(req);
    if (!admin.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  if (job.status === "done" && job.report) {
    return NextResponse.json({ status: "done", report: job.report });
  }

  if (job.status === "abandoned") {
    // Systematically broken, not a blip — stop pretending a retry will help.
    return NextResponse.json(
      {
        status: "abandoned",
        error:
          "ตรวจไม่สำเร็จ ทีมงานได้รับแจ้งแล้ว งานของคุณถูกเก็บไว้ครบ (We couldn't grade this. Your work is saved and the team has been notified.)",
      },
      { status: 200 },
    );
  }

  // Still pending — spend this request grading it.
  try {
    const { report, usage, model } = await runGradingJob(job, {
      deadlineAt: gradingDeadlineFrom(startedAt, maxDuration),
    });

    let creditCharged = job.creditCharged;
    if (job.userId && !creditCharged) {
      const surfaceToTaskType = {
        read_then_write: "read_then_write",
        read_then_speak: "read_then_speak",
        write_about_photo: "write_about_photo",
        speak_about_photo: "speak_about_photo",
      } as const;
      const charged = await chargeAiCreditForUser(
        job.userId,
        surfaceToTaskType[job.surface],
      );
      creditCharged = charged.ok;
    }

    await completeGradingJob({ attemptId, report, creditCharged });
    if (usage) {
      scheduleApiUsageLog({
        userId: job.userId,
        operation: `${job.surface}_job_retry`,
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: { attemptId, recoveredAfterAttempts: job.attempts + 1, model },
      });
    }
    return NextResponse.json({ status: "done", report });
  } catch (e) {
    await recordGradingJobFailure({
      attemptId,
      attempts: job.attempts,
      error: e instanceof Error ? e.message : String(e),
    });
    const attemptsSoFar = job.attempts + 1;
    return NextResponse.json({
      status: attemptsSoFar >= GRADING_JOB_MAX_ATTEMPTS ? "abandoned" : "pending",
      messageTh: GRADING_PENDING_MESSAGE_TH,
      messageEn: GRADING_PENDING_MESSAGE_EN,
      attempts: attemptsSoFar,
    });
  }
}
