import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { fetchUserSubscriptionDetail } from "@/lib/admin-subscription-data";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await ctx.params;
  const detail = await fetchUserSubscriptionDetail(userId);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabase();
  let { data: before } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!before) {
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser.user?.email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error: createError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: String(authUser.user.email).trim().toLowerCase(),
        full_name:
          typeof authUser.user.user_metadata?.full_name === "string"
            ? authUser.user.user_metadata.full_name.trim() || null
            : null,
        tier: "free",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const { data: afterCreate } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    before = afterCreate;
  }

  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  let requestedTier: string | null = null;
  if (typeof body.tier === "string") {
    patch.tier = body.tier;
    requestedTier = body.tier;
  }
  if (typeof body.tier_expires_at === "string" || body.tier_expires_at === null) {
    patch.tier_expires_at = body.tier_expires_at;
  } else if (requestedTier) {
    if (requestedTier === "free") {
      patch.tier_expires_at = null;
    } else if (!before.tier_expires_at) {
      const next = new Date();
      next.setDate(next.getDate() + 30);
      patch.tier_expires_at = next.toISOString();
    }
  }
  if (typeof body.full_name === "string") {
    patch.full_name = body.full_name;
  }
  if (body.vip_granted_by_course === true || body.vip_granted_by_course === false) {
    patch.vip_granted_by_course = body.vip_granted_by_course;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId,
    targetUserId: userId,
    action: "subscription_patch",
    previousValue: before,
    newValue: patch,
    reason: typeof body.reason === "string" ? body.reason : null,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const { userId } = await ctx.params;
  const url = new URL(request.url);
  const reason = url.searchParams.get("reason") ?? "";

  const supabase = createServiceRoleSupabase();
  const { data: before } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      tier: "free",
      stripe_subscription_id: null,
      tier_expires_at: null,
      vip_granted_by_course: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId,
    targetUserId: userId,
    action: "revoke_access",
    previousValue: before,
    newValue: { tier: "free" },
    reason: reason || null,
  });

  return NextResponse.json({ ok: true });
}
