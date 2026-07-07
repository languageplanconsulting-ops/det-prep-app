import { NextResponse } from "next/server";

import { fetchPracticeContentSnapshot } from "@/lib/practice-content/server";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

export async function GET(request: Request) {
  const { user, supabase } = await getRequestAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const full = new URL(request.url).searchParams.get("full") === "1";

  try {
    const { snapshot, updatedAt } = await fetchPracticeContentSnapshot(supabase);
    if (full) {
      return NextResponse.json({ updatedAt, snapshot });
    }
    return NextResponse.json({
      updatedAt,
      keys: Object.keys(snapshot),
      keyCount: Object.keys(snapshot).length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load practice content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
