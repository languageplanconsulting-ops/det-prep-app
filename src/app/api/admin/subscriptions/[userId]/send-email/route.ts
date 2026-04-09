import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ userId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await ctx.params;
  const supabase = createServiceRoleSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await _request.json().catch(() => null)) as {
    template?: string;
  } | null;

  console.log(
    "[admin-email] SEND (stub)",
    profile.email,
    profile.full_name,
    body?.template,
  );

  return NextResponse.json({ ok: true });
}
