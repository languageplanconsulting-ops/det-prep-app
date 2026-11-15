import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { presentSessionItems, stripAdaptiveBank } from "@/lib/mock-test/adaptive-dictation";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRequestSupabase } from "@/lib/supabase-request-client";

/**
 * Adaptive dictation: inject the sentence each dictation step should play
 * (chosen from this session's earlier answers) and drop the sentence bank,
 * which holds every level's answer and audio.
 */
function presentItemsForSession<
  T extends { step_index: number; task_type: string; content?: Record<string, unknown> | null },
>(req: Request, session: { responses?: unknown; targets?: unknown }, items: T[]): T[] {
  // Only clients that know about adaptive dictation get it. Others (the mobile
  // app, a stale web bundle) play the fixed sentence they were given, so they
  // must be served — and scored against — exactly that.
  if (new URL(req.url).searchParams.get("adaptive") !== "1") return stripAdaptiveBank(items);
  const targets = (session.targets ?? {}) as Record<string, unknown>;
  const allowGaps =
    targets.singleStepPreview === true ||
    (Array.isArray(targets.retakeSteps) && targets.retakeSteps.length > 0);
  const responses = Array.isArray(session.responses)
    ? (session.responses as Array<{ step_index?: number; adaptive?: unknown }>)
    : [];
  return presentSessionItems(items, responses, allowGaps);
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await getAdminAccess();
  if (access.ok && access.simple === true) {
    const supabase = createServiceRoleSupabase();
    const { data: session, error: sessionErr } = await supabase
      .from("mock_fixed_sessions")
      .select("id,user_id,set_id,status,current_step,responses,targets,started_at,completed_at,cancelled_at")
      .eq("id", id)
      .single();
    if (sessionErr || !session) {
      return NextResponse.json(
        { error: sessionErr?.message ?? "Not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const { data: setRow, error: setErr } = await supabase
      .from("mock_fixed_sets")
      .select("id,name,user_title")
      .eq("id", session.set_id)
      .single();
    if (setErr || !setRow) {
      return NextResponse.json(
        { error: setErr?.message ?? "Fixed set not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const { data: items, error: itemsErr } = await supabase
      .from("mock_fixed_set_items")
      .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
      .eq("set_id", session.set_id)
      .order("step_index", { ascending: true });
    if (itemsErr || !items) {
      return NextResponse.json(
        { error: itemsErr?.message ?? "Fixed set items not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }
    if (items.length !== 20) {
      return NextResponse.json({ error: "Fixed set is incomplete" }, { status: 409, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      {
        session: {
          ...session,
          mock_fixed_sets: setRow,
          mock_fixed_set_items: presentItemsForSession(req, session, items),
        },
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { data: session, error: sessionErr } = await supabase
    .from("mock_fixed_sessions")
    .select("id,user_id,set_id,status,current_step,responses,targets,started_at,completed_at,cancelled_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (sessionErr || !session) {
    return NextResponse.json(
      { error: sessionErr?.message ?? "Not found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const { data: setRow, error: setErr } = await supabase
    .from("mock_fixed_sets")
    .select("id,name,user_title")
    .eq("id", session.set_id)
    .single();
  if (setErr || !setRow) {
    return NextResponse.json(
      { error: setErr?.message ?? "Fixed set not found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const { data: items, error: itemsErr } = await supabase
    .from("mock_fixed_set_items")
    .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
    .eq("set_id", session.set_id)
    .order("step_index", { ascending: true });
  if (itemsErr || !items) {
    return NextResponse.json(
      { error: itemsErr?.message ?? "Fixed set items not found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }
  if (items.length !== 20) {
    return NextResponse.json({ error: "Fixed set is incomplete" }, { status: 409, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    {
      session: {
        ...session,
        mock_fixed_sets: setRow,
        mock_fixed_set_items: presentItemsForSession(req, session, items),
      },
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const access = await getAdminAccess();
  if (access.ok && access.simple === true) {
    const supabase = createServiceRoleSupabase();
    const { error } = await supabase.from("mock_fixed_sessions").update(body).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = body.status;
  const cancelledAt = body.cancelled_at;
  if (status !== "cancelled" || typeof cancelledAt !== "string") {
    return NextResponse.json({ error: "Only cancellation is allowed" }, { status: 400 });
  }
  const { error } = await supabase
    .from("mock_fixed_sessions")
    .update({ status: "cancelled", cancelled_at: cancelledAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "in_progress");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
