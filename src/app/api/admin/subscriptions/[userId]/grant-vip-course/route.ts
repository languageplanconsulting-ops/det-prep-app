import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { grantVIPManually } from "@/lib/vip-access";

type Ctx = { params: Promise<{ userId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as {
    reason?: string;
    notes?: string | null;
  } | null;

  const supabase = createServiceRoleSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, vip_granted_by_course")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (profile.vip_granted_by_course === true) {
    return NextResponse.json({ error: "Already course VIP" }, { status: 400 });
  }

  try {
    await grantVIPManually(
      profile.email as string,
      adminId,
      body?.notes ?? body?.reason ?? null,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
