import { NextResponse } from "next/server";

import { openReportsAboutMedia, runContentHealthCheck } from "@/lib/health/content-health";
import { sendContentHealthReportToAdmin } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Nightly content self-heal (Vercel Cron).
 *
 * Walks every mock-test and practice media URL a learner could hit, repairs the
 * repairable class on the spot (an image on an outside host gets copied onto
 * our own storage and the row rewritten), and emails a summary only when the
 * run found something. Broken audio is reported, never auto-"fixed".
 *
 * This is the standing answer to bug report 60ff3a3d: a dead image host should
 * be caught and fixed here, not by a paying learner losing a graded step.
 *
 * Auth mirrors /api/cron/repair-subscriptions — Vercel sends
 * `Authorization: Bearer <CRON_SECRET>`; no secret configured means fail closed.
 * Schedule lives in vercel.json.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/content-health] CRON_SECRET not set — refusing");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runContentHealthCheck({ repair: true });
    const somethingHappened = report.repaired.length > 0 || report.unrepaired.length > 0;

    let emailed = false;
    if (somethingHappened) {
      const waitingReports = await openReportsAboutMedia();
      const mail = await sendContentHealthReportToAdmin({
        scanned: report.scanned,
        healthy: report.healthy,
        repaired: report.repaired,
        unrepaired: report.unrepaired,
        waitingReports,
      });
      emailed = mail.ok;
    }

    console.log(
      `[cron/content-health] scanned=${report.scanned} healthy=${report.healthy} ` +
        `repaired=${report.repaired.length} unrepaired=${report.unrepaired.length}`,
    );

    return NextResponse.json({
      ok: true,
      scanned: report.scanned,
      healthy: report.healthy,
      repaired: report.repaired.length,
      unrepaired: report.unrepaired.length,
      emailed,
      details: { repaired: report.repaired, unrepaired: report.unrepaired },
    });
  } catch (err) {
    console.error("[cron/content-health] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "content health check failed" },
      { status: 500 },
    );
  }
}
