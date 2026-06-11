import { NextResponse } from "next/server";

import {
  repairDowngradedPaidUsers,
  repairMissingTierExpiries,
} from "@/lib/repair-missing-expiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled subscription self-heal (Vercel Cron).
 *
 * Runs the same two idempotent repairs the admin subscriptions page triggers,
 * but on a schedule so broken payers get fixed even when no admin opens that
 * page:
 *   - repairMissingTierExpiries:   paid tier with NULL expiry  → back-fill expiry
 *   - repairDowngradedPaidUsers:   free tier with valid expiry → restore real tier
 *
 * Auth: when CRON_SECRET is set, Vercel sends `Authorization: Bearer <secret>`
 * on every cron invocation. We require it so the endpoint can't be triggered by
 * anyone who finds the URL. If CRON_SECRET is unset we refuse (fail closed).
 *
 * Schedule is declared in vercel.json.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/repair-subscriptions] CRON_SECRET not set — refusing");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const missingExpiry = await repairMissingTierExpiries({ adminId: null });
    const downgraded = await repairDowngradedPaidUsers({ adminId: null });

    const summary = {
      ok: true,
      missingExpiry: {
        scanned: missingExpiry.scanned,
        repaired: missingExpiry.repaired.length,
      },
      downgraded: {
        scanned: downgraded.scanned,
        restored: downgraded.restored.length,
        skippedNoPaidPayment: downgraded.skippedNoPaidPayment,
      },
    };
    console.log("[cron/repair-subscriptions]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "repair failed";
    console.error("[cron/repair-subscriptions] failed", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
