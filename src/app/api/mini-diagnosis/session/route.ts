import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { MINI_DIAGNOSIS_FREE_LIFETIME_LIMIT, MINI_DIAGNOSIS_STEP_COUNT } from "@/lib/mini-diagnosis/sequence";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

type StartBody = {
  setId?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as StartBody;
  if (!body.setId) return NextResponse.json({ error: "setId is required" }, { status: 400 });

  const access = await getAdminAccess();
  const isSimpleAdmin = access.ok && access.simple === true;

  if (isSimpleAdmin) {
    const supabase = createServiceRoleSupabase();
    const { data: profile } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
    if (!profile?.id) {
      return NextResponse.json({ error: "No profile available for admin preview." }, { status: 500 });
    }
    const { data: setRow, error: setError } = await supabase
      .from("mini_diagnosis_sets")
      .select("id,mini_diagnosis_set_items(count)")
      .eq("id", body.setId)
      .eq("is_active", true)
      .maybeSingle();
    const stepCount = setRow?.mini_diagnosis_set_items?.[0]?.count ?? 0;
    if (setError || !setRow || stepCount !== MINI_DIAGNOSIS_STEP_COUNT) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }
    const { data, error } = await supabase
      .from("mini_diagnosis_sessions")
      .insert({
        user_id: profile.id,
        set_id: body.setId,
        status: "in_progress",
        current_step: 1,
        targets: { adminPreviewMode: true },
        responses: [],
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to start session" }, { status: 500 });
    }
    return NextResponse.json({ sessionId: data.id });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: setRow, error: setError } = await supabase
    .from("mini_diagnosis_sets")
    .select("id,mini_diagnosis_set_items(count)")
    .eq("id", body.setId)
    .eq("is_active", true)
    .maybeSingle();
  const stepCount = setRow?.mini_diagnosis_set_items?.[0]?.count ?? 0;
  if (setError || !setRow || stepCount !== MINI_DIAGNOSIS_STEP_COUNT) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  const { data: me } = await supabase.from("profiles").select("role,tier").eq("id", user.id).maybeSingle();
  const isAdmin = me?.role === "admin";
  if (!isAdmin && (me?.tier ?? "free") === "free") {
    const { count, error: countError } = await supabase
      .from("mini_diagnosis_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if ((count ?? 0) >= MINI_DIAGNOSIS_FREE_LIFETIME_LIMIT) {
      return NextResponse.json(
        { error: "Free users can take the mini diagnosis once to check their level." },
        { status: 403 },
      );
    }
  }

  const { data, error } = await supabase
    .from("mini_diagnosis_sessions")
    .insert({
      user_id: user.id,
      set_id: body.setId,
      status: "in_progress",
      current_step: 1,
      targets: {},
      responses: [],
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to start session" }, { status: 500 });
  }
  return NextResponse.json({ sessionId: data.id });
}
