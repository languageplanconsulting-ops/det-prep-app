import { NextResponse } from "next/server";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

/** Whether the signed-in user has ever finished a mini diagnosis (pretest). */
export async function GET() {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ authenticated: false, completed: false });

    const { count, error } = await createServiceRoleSupabase()
      .from("mini_diagnosis_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ authenticated: true, completed: null });

    return NextResponse.json({ authenticated: true, completed: (count ?? 0) > 0 });
  } catch {
    return NextResponse.json({ authenticated: false, completed: null });
  }
}
