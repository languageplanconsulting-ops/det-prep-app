import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";

/**
 * Per-user study-plan settings for the /course planner.
 *
 * Uses the caller's own session (not the service role) so RLS on
 * course_plan_settings is the access control — a user can only ever touch their
 * own row. Degrades to 503 when migration 042 has not been deployed, which the
 * client treats as "keep using localStorage".
 */

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /schema cache/i.test(error.message ?? "")
  );
}

/** The `progress` column arrives with 048 — tolerate a database still on 047. */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || /column .*progress.* does not exist/i.test(error.message ?? "");
}

export async function GET() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // `progress` arrives with 048. Selected separately so a deployment sitting on
  // 042-047 still syncs the plan instead of 500-ing on an unknown column.
  let data: Record<string, unknown> | null = null;
  let hasProgressColumn = true;
  {
    const withProgress = await supabase
      .from("course_plan_settings")
      .select("settings, overrides, carry_over, progress, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (withProgress.error && isMissingColumn(withProgress.error)) {
      hasProgressColumn = false;
      const legacy = await supabase
        .from("course_plan_settings")
        .select("settings, overrides, carry_over, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (legacy.error) {
        if (isMissingTable(legacy.error)) {
          return NextResponse.json({ error: "not_deployed" }, { status: 503 });
        }
        return NextResponse.json({ error: legacy.error.message }, { status: 500 });
      }
      data = legacy.data;
    } else if (withProgress.error) {
      if (isMissingTable(withProgress.error)) {
        return NextResponse.json({ error: "not_deployed" }, { status: 503 });
      }
      return NextResponse.json({ error: withProgress.error.message }, { status: 500 });
    } else {
      data = withProgress.data;
    }
  }

  return NextResponse.json({
    settings: data?.settings ?? null,
    overrides: data?.overrides ?? null,
    carryOver: data?.carry_over ?? null,
    progress: hasProgressColumn ? (data?.progress ?? null) : null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(req: Request) {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as {
    settings?: unknown;
    overrides?: unknown;
    carryOver?: unknown;
    progress?: unknown;
  };
  const patch: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (b.settings !== undefined) patch.settings = b.settings ?? {};
  if (b.overrides !== undefined) patch.overrides = b.overrides ?? {};
  if (b.carryOver !== undefined) patch.carry_over = b.carryOver ?? { entries: [] };
  if (b.progress !== undefined) patch.progress = b.progress ?? { completedIds: [], accuracy: {} };

  let { error } = await supabase
    .from("course_plan_settings")
    .upsert(patch, { onConflict: "user_id" });

  // Pre-048 database: save everything else rather than losing the whole write
  // because completion has nowhere to go yet.
  if (error && isMissingColumn(error) && patch.progress !== undefined) {
    delete patch.progress;
    ({ error } = await supabase
      .from("course_plan_settings")
      .upsert(patch, { onConflict: "user_id" }));
  }

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: "not_deployed" }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
