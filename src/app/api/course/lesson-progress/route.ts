import { NextResponse, type NextRequest } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";

type Body = {
  lessonId: string;
  watchedSeconds: number;
  /** When true, mark lesson completed. When false/omitted, keep existing status. */
  completed?: boolean;
};

/** Records a student's progress on a course lesson (watch position + optional complete). */
export async function POST(request: NextRequest) {
  const supabase = await createRequestSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.lessonId || typeof body.watchedSeconds !== "number") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const watched = Math.max(0, Math.floor(body.watchedSeconds));
  const now = new Date().toISOString();

  // Read existing so a mid-watch save never clears a prior "completed".
  const { data: existing } = await supabase
    .from("course_lesson_progress")
    .select("watched_seconds, status, completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", body.lessonId)
    .maybeSingle();

  const wasCompleted = existing?.status === "completed";
  const markDone = body.completed === true || wasCompleted;
  const mergedWatched = Math.max(watched, existing?.watched_seconds ?? 0);

  const { error } = await supabase.from("course_lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: body.lessonId,
      watched_seconds: mergedWatched,
      status: markDone ? "completed" : "in_progress",
      completed_at: markDone ? (existing?.completed_at ?? now) : null,
      updated_at: now,
    },
    { onConflict: "user_id,lesson_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, watchedSeconds: mergedWatched });
}
