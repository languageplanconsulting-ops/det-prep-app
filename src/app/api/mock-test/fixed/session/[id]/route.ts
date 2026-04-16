import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await getAdminAccess();
  if (access.ok && access.simple === true) {
    const supabase = createServiceRoleSupabase();
    const { data: session, error: sessionErr } = await supabase
      .from("mock_fixed_sessions")
      .select("id,user_id,set_id,status,current_step,responses,targets,started_at,completed_at,cancelled_at")
      .eq("id", id)
      .single();
    if (sessionErr || !session) return NextResponse.json({ error: sessionErr?.message ?? "Not found" }, { status: 404 });

    const { data: setRow, error: setErr } = await supabase
      .from("mock_fixed_sets")
      .select("id,name,user_title")
      .eq("id", session.set_id)
      .single();
    if (setErr || !setRow) return NextResponse.json({ error: setErr?.message ?? "Fixed set not found" }, { status: 404 });

    const { data: items, error: itemsErr } = await supabase
      .from("mock_fixed_set_items")
      .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
      .eq("set_id", session.set_id)
      .order("step_index", { ascending: true });
    if (itemsErr || !items) return NextResponse.json({ error: itemsErr?.message ?? "Fixed set items not found" }, { status: 404 });
    if (items.length !== 20) {
      return NextResponse.json({ error: "Fixed set is incomplete" }, { status: 409 });
    }

    return NextResponse.json({
      session: {
        ...session,
        mock_fixed_sets: setRow,
        mock_fixed_set_items: items,
      },
    });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session, error: sessionErr } = await supabase
    .from("mock_fixed_sessions")
    .select("id,user_id,set_id,status,current_step,responses,targets,started_at,completed_at,cancelled_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (sessionErr || !session) return NextResponse.json({ error: sessionErr?.message ?? "Not found" }, { status: 404 });

  const { data: setRow, error: setErr } = await supabase
    .from("mock_fixed_sets")
    .select("id,name,user_title")
    .eq("id", session.set_id)
    .single();
  if (setErr || !setRow) return NextResponse.json({ error: setErr?.message ?? "Fixed set not found" }, { status: 404 });

  const { data: items, error: itemsErr } = await supabase
    .from("mock_fixed_set_items")
    .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
    .eq("set_id", session.set_id)
    .order("step_index", { ascending: true });
  if (itemsErr || !items) return NextResponse.json({ error: itemsErr?.message ?? "Fixed set items not found" }, { status: 404 });
  if (items.length !== 20) {
    return NextResponse.json({ error: "Fixed set is incomplete" }, { status: 409 });
  }

  return NextResponse.json({
    session: {
      ...session,
      mock_fixed_sets: setRow,
      mock_fixed_set_items: items,
    },
  });
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

  const supabase = await createRouteHandlerSupabase();
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
