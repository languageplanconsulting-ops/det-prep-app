import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";

const SKILL_ORDER = [
  "literacy",
  "comprehension",
  "conversation",
  "production",
  "mock_test",
] as const;

const SKILL_LABELS: Record<(typeof SKILL_ORDER)[number], string> = {
  literacy: "Literacy",
  comprehension: "Comprehension",
  conversation: "Conversation",
  production: "Production",
  mock_test: "Mock test",
};

/**
 * Aggregates ended study sessions with recorded duration (visible tab time while in a test).
 * Not filtered by `completed` so partial attempts still count toward time-on-task.
 */
export async function GET() {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .select("skill, duration_seconds")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .gt("duration_seconds", 0);

    if (error) {
      console.error("[study/time-by-skill]", error.message);
      return NextResponse.json({ error: "Could not load study time" }, { status: 500 });
    }

    const secondsBySkill = new Map<string, number>();
    for (const row of data ?? []) {
      const sk = typeof row.skill === "string" ? row.skill : "";
      const sec = Math.max(0, Math.floor(Number(row.duration_seconds) || 0));
      if (!sec) continue;
      secondsBySkill.set(sk, (secondsBySkill.get(sk) ?? 0) + sec);
    }

    let totalSeconds = 0;
    const skills = SKILL_ORDER.map((skill) => {
      const sec = secondsBySkill.get(skill) ?? 0;
      totalSeconds += sec;
      return {
        skill,
        label: SKILL_LABELS[skill],
        minutes: Math.round((sec / 60) * 10) / 10,
        seconds: sec,
      };
    });

    return NextResponse.json({
      skills,
      totalMinutes: Math.round((totalSeconds / 60) * 10) / 10,
      totalSeconds,
    });
  } catch (e) {
    console.error("[study/time-by-skill]", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
