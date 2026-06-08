import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { fetchUserSubscriptionDetail } from "@/lib/admin-subscription-data";
import { weekStartMondayIsoDate } from "@/lib/addon-credits";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

const MANUAL_UPGRADE_DAYS = 31;

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
  const effectiveTier = requestedTier ?? (before.tier as string | null) ?? "free";
  const isPaidTarget = effectiveTier !== "free";
  const explicitExpiry =
    typeof body.tier_expires_at === "string" && body.tier_expires_at.trim().length > 0
      ? body.tier_expires_at
      : body.tier_expires_at === null
        ? null
        : undefined;
  if (explicitExpiry !== undefined) {
    if (explicitExpiry === null && isPaidTarget) {
      const next = new Date();
      next.setDate(next.getDate() + MANUAL_UPGRADE_DAYS);
      patch.tier_expires_at = next.toISOString();
    } else {
      patch.tier_expires_at = explicitExpiry;
    }
  } else if (requestedTier) {
    if (requestedTier === "free") {
      patch.tier_expires_at = null;
    } else if (
      !before.tier_expires_at ||
      new Date(before.tier_expires_at as string).getTime() <= Date.now()
    ) {
      const next = new Date();
      next.setDate(next.getDate() + MANUAL_UPGRADE_DAYS);
      patch.tier_expires_at = next.toISOString();
    }
  }

  if (typeof body.full_name === "string") {
    patch.full_name = body.full_name;
  }
  if (typeof body.ai_credits_used === "number" && Number.isFinite(body.ai_credits_used)) {
    patch.ai_credits_used = Math.max(0, Math.round(body.ai_credits_used));
  }
  if (body.ai_quota_mode === "default" || body.ai_quota_mode === "monthly_override") {
    patch.ai_quota_mode = body.ai_quota_mode;
  }
  if (typeof body.ai_monthly_limit_override === "number" && Number.isFinite(body.ai_monthly_limit_override)) {
    patch.ai_monthly_limit_override = Math.max(0, Math.round(body.ai_monthly_limit_override));
  } else if (body.ai_monthly_limit_override === null) {
    patch.ai_monthly_limit_override = null;
  }
  if (body.lifetime_ai_used === true || body.lifetime_ai_used === false) {
    patch.lifetime_ai_used = body.lifetime_ai_used;
  }
  if (body.vip_granted_by_course === true || body.vip_granted_by_course === false) {
    patch.vip_granted_by_course = body.vip_granted_by_course;
  }

  const wasFree = (before.tier as string | null) === "free" || !before.tier;
  const isUpgradeFromFree = Boolean(
    wasFree && requestedTier && requestedTier !== "free",
  );
  if (isUpgradeFromFree) {
    if (patch.ai_credits_used === undefined) patch.ai_credits_used = 0;
    if (patch.lifetime_ai_used === undefined) patch.lifetime_ai_used = false;
  }

  const finalQuotaMode =
    (patch.ai_quota_mode as string | undefined) ??
    (before.ai_quota_mode as string | null) ??
    "default";
  const finalOverride =
    patch.ai_monthly_limit_override !== undefined
      ? (patch.ai_monthly_limit_override as number | null)
      : (before.ai_monthly_limit_override as number | null);
  if (
    isPaidTarget &&
    finalQuotaMode === "monthly_override" &&
    (finalOverride === null || finalOverride === undefined || Number(finalOverride) <= 0)
  ) {
    return NextResponse.json(
      {
        error:
          "Monthly override mode is on but the monthly limit is 0 or empty. Set a positive ai_monthly_limit_override or switch ai_quota_mode to 'default'.",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isUpgradeFromFree) {
    await supabase
      .from("vip_weekly_ai_usage")
      .delete()
      .eq("user_id", userId)
      .eq("week_start", weekStartMondayIsoDate());
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
