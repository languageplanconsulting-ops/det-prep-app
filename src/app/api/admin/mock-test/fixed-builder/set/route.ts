import { NextRequest, NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

async function ensureAdmin() {
  const access = await getAdminAccess();
  if (!access.ok) {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  if (access.simple) {
    return { supabase: createServiceRoleSupabase() };
  }
  const supabase = await createRouteHandlerSupabase();
  return { supabase };
}

type FixedItemRow = {
  step_index: number;
  task_type: string;
  time_limit_sec: number;
  rest_after_step_sec: number | null;
  is_ai_graded: boolean | null;
  content: Record<string, unknown> | null;
  correct_answer: Record<string, unknown> | null;
};

export async function GET(req: NextRequest) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const setId = req.nextUrl.searchParams.get("setId")?.trim() ?? "";
  if (!setId) {
    return NextResponse.json({ error: "setId is required" }, { status: 400 });
  }

  const { data: setRow, error: setErr } = await supabase
    .from("mock_fixed_sets")
    .select("id,name,internal_name,user_title")
    .eq("id", setId)
    .single();
  if (setErr || !setRow) {
    return NextResponse.json({ error: setErr?.message ?? "Set not found" }, { status: 404 });
  }

  const { data: items, error: itemsErr } = await supabase
    .from("mock_fixed_set_items")
    .select("step_index,task_type,time_limit_sec,rest_after_step_sec,is_ai_graded,content,correct_answer")
    .eq("set_id", setId)
    .order("step_index", { ascending: true });
  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  const groupedItems = (items ?? []).reduce<Record<string, unknown[]>>((acc, raw) => {
    const row = raw as FixedItemRow;
    const taskRows = acc[row.task_type] ?? [];
    taskRows.push({
      content: row.content ?? {},
      correct_answer: row.correct_answer ?? null,
      time_limit_sec: row.time_limit_sec,
      rest_after_step_sec: row.rest_after_step_sec ?? 0,
      is_ai_graded: row.is_ai_graded === true,
    });
    acc[row.task_type] = taskRows;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    set: {
      id: setRow.id,
      internal_name: String(setRow.internal_name ?? setRow.name ?? ""),
      user_title: String(setRow.user_title ?? setRow.name ?? ""),
      grouped_items: groupedItems,
    },
  });
}
