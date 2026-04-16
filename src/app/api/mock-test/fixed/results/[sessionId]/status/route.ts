import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const access = await getAdminAccess();
  if (access.ok && access.simple === true) {
    const supabase = createServiceRoleSupabase();

    const { data: session, error: sessionErr } = await supabase
      .from("mock_fixed_sessions")
      .select("id,user_id,targets,status")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: result, error: resultErr } = await supabase
      .from("mock_fixed_results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (resultErr) return NextResponse.json({ error: resultErr.message }, { status: 500 });

    const targets = (session.targets ?? {}) as Record<string, unknown>;
    const adminPreviewMode = targets.adminPreviewMode === true;
    return NextResponse.json({
      ready: Boolean(result?.id),
      adminPreviewMode,
      sessionStatus: session.status,
    });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session, error: sessionErr } = await supabase
    .from("mock_fixed_sessions")
    .select("id,user_id,targets,status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: result, error: resultErr } = await supabase
    .from("mock_fixed_results")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (resultErr) return NextResponse.json({ error: resultErr.message }, { status: 500 });

  const targets = (session.targets ?? {}) as Record<string, unknown>;
  const adminPreviewMode = targets.adminPreviewMode === true;
  return NextResponse.json({
    ready: Boolean(result?.id),
    adminPreviewMode,
    sessionStatus: session.status,
  });
}
