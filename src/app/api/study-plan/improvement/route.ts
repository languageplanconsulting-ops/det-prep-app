import { NextResponse } from "next/server";

import { resolvePlanIdentity } from "@/lib/study-plan/plan-identity";
import { computeImprovementReport } from "@/lib/study-plan/improvement";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/** GET /api/study-plan/improvement — this user's recently-improved practice cohorts, if any. */
export async function GET(req: Request) {
  const identity = await resolvePlanIdentity(req);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const report = await computeImprovementReport(identity.userId);
  return NextResponse.json(report, { headers: NO_STORE_HEADERS });
}
