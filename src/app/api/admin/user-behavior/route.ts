import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchUserBehaviorData } from "@/lib/admin-user-behavior-data";

export async function GET(req: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days"));
  const windowDays = [7, 14, 30, 90].includes(daysParam) ? daysParam : 30;

  try {
    const data = await fetchUserBehaviorData(windowDays);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load user behavior";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
