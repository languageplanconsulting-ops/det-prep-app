import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchAdminStudyActivity } from "@/lib/admin-study-activity-data";

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await fetchAdminStudyActivity();
  return NextResponse.json({ rows });
}
