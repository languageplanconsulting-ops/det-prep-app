import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { MINI_DIAGNOSIS_FREE_LIFETIME_LIMIT, MINI_DIAGNOSIS_STEP_COUNT } from "@/lib/mini-diagnosis/sequence";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

function mapCompleteSets(data: any[] | null | undefined) {
  return (data ?? [])
    .map((row: any) => ({
      id: row.id as string,
      name: (row.user_title as string) || (row.name as string),
      internal_name: row.internal_name as string,
      user_title: row.user_title as string,
      stepCount: row.mini_diagnosis_set_items?.[0]?.count ?? 0,
    }))
    .filter((row) => row.stepCount === MINI_DIAGNOSIS_STEP_COUNT);
}

export async function GET() {
  const access = await getAdminAccess();
  if (access.ok && access.simple) {
    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase
      .from("mini_diagnosis_sets")
      .select("id,name,internal_name,user_title,mini_diagnosis_set_items(count)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sets: mapCompleteSets(data) });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("mini_diagnosis_sets")
    .select("id,name,internal_name,user_title,mini_diagnosis_set_items(count)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: me } = await supabase.from("profiles").select("role,tier").eq("id", user.id).maybeSingle();
  const isAdmin = me?.role === "admin";
  const isFreeTier = !isAdmin && (me?.tier ?? "free") === "free";

  const { data: latestResult, count: resultCount } = await supabase
    .from("mini_diagnosis_results")
    .select("session_id,actual_total,level_label,created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    sets: mapCompleteSets(data),
    latestResult: latestResult
      ? {
          sessionId: latestResult.session_id as string,
          total: latestResult.actual_total as number,
          levelLabel: latestResult.level_label as string,
          createdAt: latestResult.created_at as string,
        }
      : null,
    freeLimitReached: isFreeTier && (resultCount ?? 0) >= MINI_DIAGNOSIS_FREE_LIFETIME_LIMIT,
  });
}
