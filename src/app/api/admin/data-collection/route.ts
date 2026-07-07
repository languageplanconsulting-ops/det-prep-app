import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchDataCollectionData } from "@/lib/admin-data-collection-data";

export async function GET(req: Request) {
  const auth = await getAdminAccess(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const examType = new URL(req.url).searchParams.get("examType") ?? "all";
    const data = await fetchDataCollectionData(examType);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load submissions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
