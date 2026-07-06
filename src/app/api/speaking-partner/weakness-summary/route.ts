import { NextResponse } from "next/server";
import { fetchWeaknessTopFive } from "@/lib/speaking-partner-weakness";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

export async function GET(req: Request) {
  try {
    const { user } = await getRequestAuthUser(req);
    const userId = user?.id ?? null;
    if (!userId) {
      return NextResponse.json({ topFive: [] });
    }
    const topFive = await fetchWeaknessTopFive(userId);
    return NextResponse.json({ topFive });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load weakness summary";
    console.error("[speaking-partner-weakness-summary]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
