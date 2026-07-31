import { NextResponse } from "next/server";

import { resolvePlanIdentity } from "@/lib/study-plan/plan-identity";
import { computeWeaknessReport } from "@/lib/study-plan/weakness";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/** GET /api/study-plan/weakness — this user's weak auto-graded skills + AI-graded dimensions. */
export async function GET(req: Request) {
  const identity = await resolvePlanIdentity(req);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const report = await computeWeaknessReport(identity.userId);
  return NextResponse.json(report, { headers: NO_STORE_HEADERS });
}
