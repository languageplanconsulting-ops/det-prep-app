import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getAdminAccess();
  const supabase = access.ok && access.simple ? createServiceRoleSupabase() : await createRouteHandlerSupabase();

  const {
    data: { user },
  } = access.ok && access.simple ? { data: { user: { id: "admin" } } } : await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: setRow, error: setErr } = await supabase
    .from("mini_diagnosis_sets")
    .select("id,name,internal_name,user_title,is_active")
    .eq("id", id)
    .single();
  if (setErr || !setRow) return NextResponse.json({ error: setErr?.message ?? "Set not found" }, { status: 404 });

  const { data: items, error: itemsErr } = await supabase
    .from("mini_diagnosis_set_items")
    .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
    .eq("set_id", id)
    .order("step_index", { ascending: true });
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  return NextResponse.json({
    set: setRow,
    items: items ?? [],
  });
}
