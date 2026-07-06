import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";
import { computeWeaknessReport } from "@/lib/study-plan/weakness";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/** GET /api/study-plan/weakness — this user's weak auto-graded skills + AI-graded dimensions. */
export async function GET(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const report = await computeWeaknessReport(user.id);
  return NextResponse.json(report, { headers: NO_STORE_HEADERS });
}
