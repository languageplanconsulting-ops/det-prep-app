import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { parseFixedMockUploadJson } from "@/lib/mock-test/fixed-upload";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

async function ensureAdmin() {
  const access = await getAdminAccess();
  if (!access.ok) {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  if (access.simple) {
    return { supabase: createServiceRoleSupabase(), userId: null as string | null, simple: true };
  }
  const supabase = await createRouteHandlerSupabase();
  return { supabase, userId: access.adminUserId, simple: false };
}

type SaveBody = {
  internal_name?: string;
  user_title?: string;
  grouped_items?: Record<string, unknown>;
};

export async function POST(req: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const body = (await req.json().catch(() => ({}))) as SaveBody;
  const internalName = String(body.internal_name ?? "").trim();
  const userTitle = String(body.user_title ?? "").trim();
  if (!internalName || !userTitle) {
    return NextResponse.json({ error: "internal_name and user_title are required" }, { status: 400 });
  }

  const parsed = parseFixedMockUploadJson(JSON.stringify({ grouped_items: body.grouped_items ?? {} }));
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data: setRow, error: setErr } = await supabase
    .from("mock_fixed_sets")
    .upsert(
      [
        {
          name: internalName,
          internal_name: internalName,
          user_title: userTitle,
          is_active: false,
          created_by: userId,
        },
      ],
      { onConflict: "internal_name" },
    )
    .select("id")
    .single();
  if (setErr || !setRow) {
    return NextResponse.json({ error: setErr?.message ?? "Failed to create set" }, { status: 500 });
  }

  const { error: deactivateErr } = await supabase
    .from("mock_fixed_sets")
    .update({ is_active: false })
    .eq("id", setRow.id);
  if (deactivateErr) {
    return NextResponse.json({ error: deactivateErr.message }, { status: 500 });
  }

  const { error: deleteErr } = await supabase.from("mock_fixed_set_items").delete().eq("set_id", setRow.id);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  const rows = parsed.rows.map((r) => ({
    set_id: setRow.id,
    step_index: r.step_index,
    task_type: r.task_type,
    time_limit_sec: r.time_limit_sec,
    rest_after_step_sec: r.rest_after_step_sec ?? 0,
    is_ai_graded: r.is_ai_graded ?? false,
    content: r.content,
    correct_answer: r.correct_answer,
  }));
  const { error: insertErr } = await supabase.from("mock_fixed_set_items").insert(rows);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const { error: activateErr } = await supabase
    .from("mock_fixed_sets")
    .update({ is_active: true, user_title: userTitle, name: internalName, internal_name: internalName })
    .eq("id", setRow.id);
  if (activateErr) return NextResponse.json({ error: activateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, setId: setRow.id, savedRows: rows.length });
}
