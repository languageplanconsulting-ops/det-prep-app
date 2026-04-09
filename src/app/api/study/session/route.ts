import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";

const SKILLS = new Set([
  "literacy",
  "comprehension",
  "conversation",
  "production",
  "mock_test",
]);

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

export async function POST(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      exerciseType?: unknown;
      skill?: unknown;
      difficulty?: unknown;
      setId?: unknown;
    };

    const exerciseType =
      typeof body.exerciseType === "string" ? body.exerciseType.trim() : "";
    const skill = typeof body.skill === "string" ? body.skill : "";
    if (!exerciseType || !SKILLS.has(skill)) {
      return NextResponse.json(
        { error: "Invalid exerciseType or skill" },
        { status: 400 },
      );
    }

    let difficulty: string | null = null;
    if (body.difficulty != null) {
      if (
        typeof body.difficulty !== "string" ||
        !DIFFICULTIES.has(body.difficulty)
      ) {
        return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
      }
      difficulty = body.difficulty;
    }

    const setId =
      body.setId == null
        ? null
        : typeof body.setId === "string"
          ? body.setId
          : String(body.setId);

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        exercise_type: exerciseType,
        skill,
        difficulty,
        set_id: setId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[study/session] POST insert", error.message);
      return NextResponse.json({ error: "Could not create session" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: data.id });
  } catch (e) {
    console.error("[study/session] POST", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      sessionId?: unknown;
      duration_seconds?: unknown;
    };

    if (typeof body.sessionId !== "string" || !body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }
    if (typeof body.duration_seconds !== "number" || Number.isNaN(body.duration_seconds)) {
      return NextResponse.json(
        { error: "duration_seconds must be a number" },
        { status: 400 },
      );
    }

    const duration = Math.max(0, Math.floor(body.duration_seconds));

    const { data: row, error: fetchErr } = await supabase
      .from("study_sessions")
      .select("id, ended_at")
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (row.ended_at != null) {
      return NextResponse.json({ error: "Session already ended" }, { status: 409 });
    }

    const { error } = await supabase
      .from("study_sessions")
      .update({ duration_seconds: duration })
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .is("ended_at", null);

    if (error) {
      console.error("[study/session] PATCH", error.message);
      return NextResponse.json({ error: "Could not update session" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[study/session] PATCH", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      sessionId?: unknown;
      score?: unknown;
      completed?: unknown;
      duration_seconds?: unknown;
    };

    if (typeof body.sessionId !== "string" || !body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const { data: row, error: fetchErr } = await supabase
      .from("study_sessions")
      .select("id, started_at, ended_at, duration_seconds")
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (row.ended_at != null) {
      return NextResponse.json({ ok: true });
    }

    const endedAt = new Date().toISOString();
    const startedMs = new Date(row.started_at).getTime();
    const wallSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));

    let duration = row.duration_seconds ?? 0;
    if (typeof body.duration_seconds === "number" && !Number.isNaN(body.duration_seconds)) {
      duration = Math.max(0, Math.floor(body.duration_seconds));
    } else if (duration === 0 || duration == null) {
      duration = wallSeconds;
    }

    const completed = Boolean(body.completed);
    let score: number | null = null;
    if (body.score !== undefined && body.score !== null) {
      const n = Number(body.score);
      if (Number.isFinite(n)) score = Math.round(n);
    }

    const { error } = await supabase
      .from("study_sessions")
      .update({
        ended_at: endedAt,
        duration_seconds: duration,
        completed,
        score,
      })
      .eq("id", body.sessionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[study/session] PUT", error.message);
      return NextResponse.json({ error: "Could not end session" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[study/session] PUT", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
