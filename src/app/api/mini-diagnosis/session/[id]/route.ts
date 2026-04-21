import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { MINI_DIAGNOSIS_STEP_COUNT } from "@/lib/mini-diagnosis/sequence";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await getAdminAccess();
  if (access.ok && access.simple === true) {
    const supabase = createServiceRoleSupabase();
    const { data: session, error: sessionErr } = await supabase
      .from("mini_diagnosis_sessions")
      .select("id,user_id,set_id,status,current_step,responses,targets,started_at,completed_at,cancelled_at")
      .eq("id", id)
      .single();
    if (sessionErr || !session) return NextResponse.json({ error: sessionErr?.message ?? "Not found" }, { status: 404 });

    const { data: setRow, error: setErr } = await supabase
      .from("mini_diagnosis_sets")
      .select("id,name,user_title")
      .eq("id", session.set_id)
      .single();
    if (setErr || !setRow) return NextResponse.json({ error: setErr?.message ?? "Set not found" }, { status: 404 });

    const { data: items, error: itemsErr } = await supabase
      .from("mini_diagnosis_set_items")
      .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
      .eq("set_id", session.set_id)
      .order("step_index", { ascending: true });
    if (itemsErr || !items) return NextResponse.json({ error: itemsErr?.message ?? "Items not found" }, { status: 404 });
    if (items.length !== MINI_DIAGNOSIS_STEP_COUNT) {
      return NextResponse.json({ error: "Mini diagnosis set is incomplete" }, { status: 409 });
    }

    return NextResponse.json({
      session: {
        ...session,
        mini_diagnosis_sets: setRow,
        mini_diagnosis_set_items: items,
      },
    });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session, error: sessionErr } = await supabase
    .from("mini_diagnosis_sessions")
    .select("id,user_id,set_id,status,current_step,responses,targets,started_at,completed_at,cancelled_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (sessionErr || !session) return NextResponse.json({ error: sessionErr?.message ?? "Not found" }, { status: 404 });

  const { data: setRow, error: setErr } = await supabase
    .from("mini_diagnosis_sets")
    .select("id,name,user_title")
    .eq("id", session.set_id)
    .single();
  if (setErr || !setRow) return NextResponse.json({ error: setErr?.message ?? "Set not found" }, { status: 404 });

  const { data: items, error: itemsErr } = await supabase
    .from("mini_diagnosis_set_items")
    .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
    .eq("set_id", session.set_id)
    .order("step_index", { ascending: true });
  if (itemsErr || !items) return NextResponse.json({ error: itemsErr?.message ?? "Items not found" }, { status: 404 });
  if (items.length !== MINI_DIAGNOSIS_STEP_COUNT) {
    return NextResponse.json({ error: "Mini diagnosis set is incomplete" }, { status: 409 });
  }

  return NextResponse.json({
    session: {
      ...session,
      mini_diagnosis_sets: setRow,
      mini_diagnosis_set_items: items,
    },
  });
}
