import { NextResponse, type NextRequest } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";

type Body = {
  lessonId: string;
  watchedSeconds: number;
  completed: boolean;
};

/** Records a student's progress on a course lesson. Not called anywhere yet —
 *  no student-facing course viewer exists — but the write path is ready for
 *  when one does; the admin course page's progress % reads from this table. */
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

  const { error } = await supabase.from("course_lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: body.lessonId,
      watched_seconds: Math.max(0, Math.floor(body.watchedSeconds)),
      status: body.completed ? "completed" : "in_progress",
      completed_at: body.completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
