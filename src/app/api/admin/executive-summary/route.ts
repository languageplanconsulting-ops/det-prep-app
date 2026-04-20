import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchExecutiveSummary } from "@/lib/admin-executive-data";

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await fetchExecutiveSummary();
  return NextResponse.json(data);
}
