import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ userId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as {
    days?: number;
    reason?: string;
    expires_at?: string | null;
  } | null;

  const supabase = createServiceRoleSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let nextExpiry: string;
  if (body?.expires_at) {
    nextExpiry = new Date(body.expires_at).toISOString();
  } else {
    const days = Number(body?.days ?? 30);
    const base = profile.tier_expires_at
      ? new Date(profile.tier_expires_at as string)
      : new Date();
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    nextExpiry = d.toISOString();
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      tier_expires_at: nextExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId,
    targetUserId: userId,
    action: "extend_expiry",
    previousValue: { tier_expires_at: profile.tier_expires_at },
    newValue: { tier_expires_at: nextExpiry },
    reason: body?.reason ?? null,
  });

  return NextResponse.json({ ok: true, tier_expires_at: nextExpiry });
}
