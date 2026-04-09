import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await ctx.params;
  const supabase = createServiceRoleSupabase();
  const { data: notes, error } = await supabase
    .from("subscription_notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = [
    ...new Set(
      (notes ?? []).map((n) => n.admin_id as string | null).filter(Boolean),
    ),
  ] as string[];

  const names = new Map<string, string>();
  if (ids.length) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    for (const a of admins ?? []) {
      names.set(
        a.id as string,
        ((a.full_name as string)?.trim() || (a.email as string)) ?? "",
      );
    }
  }

  return NextResponse.json({
    notes: (notes ?? []).map((n) => ({
      ...n,
      adminName: n.admin_id ? names.get(n.admin_id as string) ?? null : null,
    })),
  });
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { note?: string } | null;
  const note = body?.note?.trim();
  if (!note) {
    return NextResponse.json({ error: "note required" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("subscription_notes")
    .insert({
      user_id: userId,
      admin_id: adminId,
      note,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, note: data });
}
