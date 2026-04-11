import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { getVIPStudyActivitySummaries } from "@/lib/admin-vip-study-activity";

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await getVIPStudyActivitySummaries();
  return NextResponse.json({ rows });
}
