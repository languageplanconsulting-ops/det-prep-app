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
 *
 * Query (optional): `since` — ISO datetime. When present, only sessions with
 * `ended_at >= since` are included (used to scope the breakdown to a trailing
 * window, e.g. today / 7d / 30d / 365d). Omit for all-time totals.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sinceRaw = url.searchParams.get("since")?.trim();
    let since: string | null = null;
    if (sinceRaw) {
      const d = new Date(sinceRaw);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid since" }, { status: 400 });
      }
      since = d.toISOString();
    }

    let query = supabase
      .from("study_sessions")
      .select("skill, duration_seconds")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .gt("duration_seconds", 0);
    if (since) {
      query = query.gte("ended_at", since);
    }
    const { data, error } = await query;

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
