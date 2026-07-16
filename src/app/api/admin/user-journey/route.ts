import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  fetchUserJourneyDetail,
  fetchUserJourneySummaries,
} from "@/lib/admin-user-journey-data";

/**
 * GET /api/admin/user-journey            → { summaries: UserJourneySummary[] }
 * GET /api/admin/user-journey?userId=xxx → { detail: UserJourneyDetail | null }
 */
export async function GET(request: Request) {
  const auth = await getAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (userId) {
    const detail = await fetchUserJourneyDetail(userId);
    return NextResponse.json({ detail });
  }

  const summaries = await fetchUserJourneySummaries();
  return NextResponse.json({ summaries });
}
