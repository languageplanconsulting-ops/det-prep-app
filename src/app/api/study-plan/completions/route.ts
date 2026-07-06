import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/** GET /api/study-plan/completions?since=YYYY-MM-DD — the caller's own completions. */
export async function GET(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("study_plan_completions")
    .select("completion_date, tier_completed")
    .eq("user_id", user.id)
    .gte("completion_date", since);

  return NextResponse.json({ completions: data ?? [] }, { headers: NO_STORE_HEADERS });
}

/** POST /api/study-plan/completions — record one completion for today's session. */
export async function POST(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const o = (body ?? {}) as Record<string, unknown>;
  const completionDate = o.completionDate;
  const tierCompleted = o.tierCompleted;
  if (typeof completionDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(completionDate)) {
    return NextResponse.json({ error: "completionDate must be YYYY-MM-DD" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (![5, 10, 20, 30, 60].includes(tierCompleted as number)) {
    return NextResponse.json({ error: "tierCompleted must be 5, 10, 20, 30, or 60" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { error } = await supabase.from("study_plan_completions").insert({
    user_id: user.id,
    completion_date: completionDate,
    tier_completed: tierCompleted,
    session_ref: typeof o.sessionRef === "string" ? o.sessionRef : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
