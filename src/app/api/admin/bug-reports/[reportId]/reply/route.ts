import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { replyToBugReport, type BugReportStatus } from "@/lib/bug-reports";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

type Ctx = { params: Promise<{ reportId: string }> };

type Body = {
  replyBody?: string;
  status?: BugReportStatus;
};

export async function POST(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.replyBody || !body?.status) {
    return NextResponse.json({ error: "replyBody and status are required" }, { status: 400 });
  }

  let adminEmail: string | null = null;
  if (!auth.simple && auth.adminUserId) {
    try {
      const supabase = await createRouteHandlerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      adminEmail = user?.email ?? null;
    } catch {
      adminEmail = null;
    }
  }

  const result = await replyToBugReport({
    reportId,
    adminId: auth.adminUserId,
    adminEmail,
    replyBody: body.replyBody,
    nextStatus: body.status,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
