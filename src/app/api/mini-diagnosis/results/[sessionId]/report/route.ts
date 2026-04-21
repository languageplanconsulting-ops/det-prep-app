import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const access = await getAdminAccess();
  if (access.ok && access.simple === true) {
    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase
      .from("mini_diagnosis_results")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data: items, error: itemsErr } = await supabase
      .from("mini_diagnosis_set_items")
      .select("step_index,task_type,content,correct_answer")
      .eq("set_id", data.set_id)
      .order("step_index", { ascending: true });
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    return NextResponse.json({ result: data, stepItems: items ?? [] });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("mini_diagnosis_results")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: items, error: itemsErr } = await supabase
    .from("mini_diagnosis_set_items")
    .select("step_index,task_type,content,correct_answer")
    .eq("set_id", data.set_id)
    .order("step_index", { ascending: true });
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  return NextResponse.json({ result: data, stepItems: items ?? [] });
}
