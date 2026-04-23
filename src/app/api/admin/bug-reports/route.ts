import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { listBugReports } from "@/lib/bug-reports";

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await listBugReports();
  return NextResponse.json({ reports: rows });
}
