import { NextResponse, type NextRequest } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";
import { OBJECTIVE_PLACEMENT_TASKS, AI_GRADED_PLACEMENT_TASKS } from "@/lib/course-plan/placement";

const VALID_TASK_TYPES = new Set<string>([
  ...OBJECTIVE_PLACEMENT_TASKS,
  ...AI_GRADED_PLACEMENT_TASKS,
]);
const VALID_LEVELS = new Set(["easy", "medium", "hard"]);

export type SkillPlacementRow = {
  taskType: string;
  currentLevel: "easy" | "medium" | "hard";
  lastScore160: number | null;
  placedAt: string;
};

/** All of the signed-in learner's placement results — used by PlacementRunner to resume. */
export async function GET(request: NextRequest) {
  const supabase = await createRequestSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("course_skill_placement")
    .select("task_type, current_level, last_score160, placed_at")
    .eq("user_id", user.id);

  if (error) {
    // Migration not deployed yet — degrade to "nothing placed" rather than break the page.
    if (error.code === "42P01" || error.code === "PGRST205" || /schema cache/i.test(error.message)) {
      return NextResponse.json({ placements: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const placements: SkillPlacementRow[] = (data ?? []).map((r) => ({
    taskType: r.task_type,
    currentLevel: r.current_level as "easy" | "medium" | "hard",
    lastScore160: r.last_score160,
    placedAt: r.placed_at,
  }));
  return NextResponse.json({ placements });
}

type Body = {
  taskType: string;
  currentLevel: "easy" | "medium" | "hard";
  lastScore160?: number | null;
};

/** Upserts ONE skill's placement result. */
export async function POST(request: NextRequest) {
  const supabase = await createRequestSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.taskType || !VALID_TASK_TYPES.has(body.taskType)) {
    return NextResponse.json({ error: "invalid taskType" }, { status: 400 });
  }
  if (!body.currentLevel || !VALID_LEVELS.has(body.currentLevel)) {
    return NextResponse.json({ error: "invalid currentLevel" }, { status: 400 });
  }

  // placed_at deliberately omitted — Supabase upsert overwrites every column
  // present in the patch, and placed_at must stay write-once (default now()
  // on INSERT only; an UPDATE conflict leaves the original timestamp alone).
  const { error } = await supabase.from("course_skill_placement").upsert(
    {
      user_id: user.id,
      task_type: body.taskType,
      current_level: body.currentLevel,
      consecutive_pass_count: 0,
      last_score160: body.lastScore160 ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,task_type" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
