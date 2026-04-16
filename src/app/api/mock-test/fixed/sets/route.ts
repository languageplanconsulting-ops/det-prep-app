import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { FIXED_MOCK_STEP_COUNT } from "@/lib/mock-test/fixed-sequence";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

function mapCompleteSets(data: any[] | null | undefined) {
  return (data ?? [])
    .map((row: any) => ({
      id: row.id as string,
      name: (row.user_title as string) || (row.name as string),
      stepCount: row.mock_fixed_set_items?.[0]?.count ?? 0,
    }))
    .filter((row) => row.stepCount === FIXED_MOCK_STEP_COUNT);
}

export async function GET() {
  const access = await getAdminAccess();
  if (access.ok && access.simple) {
    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase
      .from("mock_fixed_sets")
      .select("id,name,user_title,mock_fixed_set_items(count)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const sets = mapCompleteSets(data);
    return NextResponse.json({ sets });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("mock_fixed_sets")
    .select("id,name,user_title,mock_fixed_set_items(count)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sets = mapCompleteSets(data);
  return NextResponse.json({ sets });
}
