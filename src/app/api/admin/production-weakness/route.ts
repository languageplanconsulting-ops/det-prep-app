import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchAdminProductionWeakness } from "@/lib/admin-production-weakness-data";

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await fetchAdminProductionWeakness();
  return NextResponse.json(report);
}
