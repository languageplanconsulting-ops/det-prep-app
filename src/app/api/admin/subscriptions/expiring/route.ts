import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchExpiringUsers } from "@/lib/admin-subscription-data";

export async function GET(request: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tab = new URL(request.url).searchParams.get("tab") ?? "7";
  const bucket =
    tab === "14" ? "14" : tab === "expired" ? "expired" : "7";

  const users = await fetchExpiringUsers(bucket);
  return NextResponse.json({ users, bucket });
}
