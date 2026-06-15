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
      exerciseType?: unknown;
      setId?: unknown;
      score?: unknown;
      completed?: unknown;
      duration_seconds?: unknown;
      submission_payload?: unknown;
      report_payload?: unknown;
    };

    // Normalize the incoming "finish" signals. `completed`/`score` are treated
    // as MONOTONIC: a real finish can raise them, but an abandon write (the
    // unmount / start-of-next-session cleanup that sends completed:false) must
    // never lower a session that was already finished. See useStudyTimer.ts.
    const incomingCompleted =
      body.completed === undefined ? undefined : Boolean(body.completed);
    let incomingScore: number | null = null;
    if (body.score !== undefined && body.score !== null) {
      const n = Number(body.score);
      if (Number.isFinite(n)) incomingScore = Math.round(n);
    }
    const isFinish = incomingCompleted === true || incomingScore != null;

    const SELECT = "id, started_at, ended_at, duration_seconds, completed, score";
    type SessionRow = {
      id: string;
      started_at: string;
      ended_at: string | null;
      duration_seconds: number | null;
      completed: boolean | null;
      score: number | null;
    };

    let row: SessionRow | null = null;

    if (typeof body.sessionId === "string" && body.sessionId) {
      const { data } = await supabase
        .from("study_sessions")
        .select(SELECT)
        .eq("user_id", user.id)
        .eq("id", body.sessionId)
        .maybeSingle();
      row = (data as SessionRow | null) ?? null;
    } else {
      const exerciseType =
        typeof body.exerciseType === "string" ? body.exerciseType.trim() : "";
      if (!exerciseType) {
        return NextResponse.json(
          { error: "sessionId or exerciseType required" },
          { status: 400 },
        );
      }
      const setIdFilter =
        body.setId != null
          ? typeof body.setId === "string"
            ? body.setId
            : String(body.setId)
          : null;
      const baseQuery = () => {
        let q = supabase
          .from("study_sessions")
          .select(SELECT)
          .eq("user_id", user.id)
          .eq("exercise_type", exerciseType);
        if (setIdFilter != null) q = q.eq("set_id", setIdFilter);
        return q;
      };

      // Prefer a still-open session for this exercise.
      const open = await baseQuery()
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      row = (open.data as SessionRow | null) ?? null;

      // If none is open but this is a genuine finish, allow upgrading the most
      // recent (already-ended) session — it was likely closed early as
      // "abandoned" by cleanup before this finish landed.
      if (!row && isFinish) {
        const recent = await baseQuery()
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        row = (recent.data as SessionRow | null) ?? null;
      }
    }

    if (!row) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Build an upgrade-only patch: only ever raise completed false→true and
    // fill a null score; carry the latest payloads if provided.
    const buildUpgrade = (current: SessionRow) => {
      const patch: {
        completed?: boolean;
        score?: number | null;
        submission_payload?: unknown;
        report_payload?: unknown;
      } = {};
      if (incomingCompleted === true && current.completed !== true) {
        patch.completed = true;
      }
      if (incomingScore != null && current.score == null) {
        patch.score = incomingScore;
      }
      if (body.submission_payload !== undefined) {
        patch.submission_payload = body.submission_payload;
      }
      if (body.report_payload !== undefined) {
        patch.report_payload = body.report_payload;
      }
      return patch;
    };

    // Already ended (typically by an abandon-cleanup write): only allow a
    // monotonic upgrade, never a downgrade.
    if (row.ended_at != null) {
      if (!isFinish) {
        return NextResponse.json({ ok: true });
      }
      const patch = buildUpgrade(row);
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ ok: true });
      }
      const { error } = await supabase
        .from("study_sessions")
        .update(patch)
        .eq("id", row.id)
        .eq("user_id", user.id);
      if (error) {
        console.error("[study/session] PUT upgrade", error.message);
        return NextResponse.json({ error: "Could not update session" }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // First end of an open session.
    const endedAt = new Date().toISOString();
    const startedMs = new Date(row.started_at).getTime();
    const wallSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));

    let duration = row.duration_seconds ?? 0;
    if (typeof body.duration_seconds === "number" && !Number.isNaN(body.duration_seconds)) {
      duration = Math.max(0, Math.floor(body.duration_seconds));
    } else if (duration === 0 || duration == null) {
      duration = wallSeconds;
    }

    const updatePayload: {
      ended_at: string;
      duration_seconds: number;
      completed: boolean;
      score: number | null;
      submission_payload?: unknown;
      report_payload?: unknown;
    } = {
      ended_at: endedAt,
      duration_seconds: duration,
      completed: incomingCompleted === true,
      score: incomingScore,
    };

    if (body.submission_payload !== undefined) {
      updatePayload.submission_payload = body.submission_payload;
    }
    if (body.report_payload !== undefined) {
      updatePayload.report_payload = body.report_payload;
    }

    // Guard against a concurrent writer that ended this row first: only the
    // write that flips ended_at from null wins here.
    const { data: ended, error } = await supabase
      .from("study_sessions")
      .update(updatePayload)
      .eq("id", row.id)
      .eq("user_id", user.id)
      .is("ended_at", null)
      .select("id");

    if (error) {
      console.error("[study/session] PUT", error.message);
      return NextResponse.json({ error: "Could not end session" }, { status: 500 });
    }

    // Lost the race (another write — likely abandon cleanup — ended it first).
    // If this was the genuine finish, apply it as a monotonic upgrade instead.
    if ((!ended || ended.length === 0) && isFinish) {
      const patch = buildUpgrade(row);
      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await supabase
          .from("study_sessions")
          .update(patch)
          .eq("id", row.id)
          .eq("user_id", user.id);
        if (upErr) {
          console.error("[study/session] PUT upgrade-after-race", upErr.message);
          return NextResponse.json({ error: "Could not update session" }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[study/session] PUT", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
