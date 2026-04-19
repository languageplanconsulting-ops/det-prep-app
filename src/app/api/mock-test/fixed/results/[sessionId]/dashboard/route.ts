import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export async function PATCH(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  let body: { saved?: boolean };
  try {
    body = (await req.json()) as { saved?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.saved !== "boolean") {
    return NextResponse.json({ error: "Expected { saved: boolean }" }, { status: 400 });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dashboard_saved_at = body.saved ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("mock_fixed_results")
    .update({ dashboard_saved_at })
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .select("dashboard_saved_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Result not found" }, { status: 404 });

  return NextResponse.json({ ok: true, dashboard_saved_at: data.dashboard_saved_at ?? null });
}
