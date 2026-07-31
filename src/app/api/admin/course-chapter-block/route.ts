import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

const VALID = [
  "production",
  "conversation",
  "comprehension",
  "literacy",
  "general",
  "retired",
] as const;

/** Set (or clear) the DET study block a course chapter teaches. */
export async function POST(req: Request) {
  const auth = await getAdminAccess(req);
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as { chapterId?: unknown; studyBlock?: unknown };
  const chapterId = typeof b.chapterId === "string" ? b.chapterId : "";
  if (!chapterId) return NextResponse.json({ error: "chapterId is required" }, { status: 400 });

  // null clears the tag and falls back to title matching.
  const studyBlock =
    b.studyBlock === null || b.studyBlock === "" ? null : String(b.studyBlock ?? "");
  if (studyBlock !== null && !VALID.includes(studyBlock as (typeof VALID)[number])) {
    return NextResponse.json({ error: `Invalid studyBlock: ${studyBlock}` }, { status: 400 });
  }

  const supabase = createServiceRoleSupabase();
  const { error } = await supabase
    .from("course_chapters")
    .update({ study_block: studyBlock })
    .eq("id", chapterId);

  if (error) {
    const missingColumn = /study_block/.test(error.message) || error.code === "42703";
    if (missingColumn) {
      return NextResponse.json(
        {
          error:
            "ยังไม่ได้ deploy migration 043 — รัน supabase/manual_run_course_chapter_study_block.sql ก่อน",
          reason: "not_deployed",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
