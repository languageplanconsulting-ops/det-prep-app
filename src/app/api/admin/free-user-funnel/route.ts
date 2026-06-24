import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchFreeUserFunnelData } from "@/lib/admin-free-user-funnel-data";

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await fetchFreeUserFunnelData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load free-user funnel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
