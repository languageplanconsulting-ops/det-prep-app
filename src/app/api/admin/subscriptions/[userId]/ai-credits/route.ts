import { NextResponse } from "next/server";

import { getVipWeeklyAiQuotaForUser } from "@/lib/addon-credits";
import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ userId: string }> };

function monthEndIso(now = new Date()): string {
  return new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).toISOString();
}

function plusDaysIso(days: number, now = new Date()): string {
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  next.setHours(23, 59, 59, 999);
  return next.toISOString();
}

function weekEndIso(now = new Date()): string {
  const next = new Date(now);
  const day = next.getDay();
  const daysUntilSunday = (7 - day) % 7;
  next.setDate(next.getDate() + daysUntilSunday);
  next.setHours(23, 59, 59, 999);
  return next.toISOString();
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = auth.adminUserId;
  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const credits = Math.max(0, Math.round(Number(body.credits ?? 0)));
  if (!credits) {
    return NextResponse.json({ error: "credits must be greater than 0" }, { status: 400 });
  }

  const kind =
    body.kind === "feedback" || body.kind === "mock"
      ? body.kind
      : "feedback";

  const mode =
    body.expiryMode === "7d" ||
    body.expiryMode === "week_end" ||
    body.expiryMode === "days" ||
    body.expiryMode === "month_end" ||
    body.expiryMode === "custom" ||
    body.expiryMode === "none"
      ? body.expiryMode
      : "month_end";

  let expiresAt: string | null = null;
  if (mode === "7d") expiresAt = plusDaysIso(7);
  else if (mode === "week_end") expiresAt = weekEndIso();
  else if (mode === "days") {
    const days = Math.max(1, Math.round(Number(body.days ?? 0)));
    if (!days || !Number.isFinite(days)) {
      return NextResponse.json({ error: "days is required for days mode" }, { status: 400 });
    }
    expiresAt = plusDaysIso(days);
  }
  else if (mode === "month_end") expiresAt = monthEndIso();
  else if (mode === "custom") {
    if (typeof body.expires_at !== "string" || !body.expires_at.trim()) {
      return NextResponse.json({ error: "expires_at is required for custom mode" }, { status: 400 });
    }
    const parsed = new Date(body.expires_at);
    if (!Number.isFinite(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid expires_at" }, { status: 400 });
    }
    expiresAt = parsed.toISOString();
  }

  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : `Manual ${kind} credit grant (${mode})`;

  const supabase = createServiceRoleSupabase();
  const { data: before } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = {
    user_id: userId,
    kind,
    sku: kind === "mock" ? "admin_manual_mock" : "admin_manual_feedback",
    credits_granted: credits,
    credits_used: 0,
    amount: 0,
    currency: "thb",
    status: "paid",
    expires_at: expiresAt,
    metadata: {
      source: "admin_manual",
      adminId,
      reason,
      expiryMode: mode,
    },
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("addon_credit_purchases")
    .insert(row)
    .select("id, kind, credits_granted, credits_used, status, expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId,
    targetUserId: userId,
    action: kind === "mock" ? "admin_mock_credit_grant" : "admin_ai_credit_grant",
    previousValue: null,
    newValue: row,
    reason,
  });

  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = auth.adminUserId;
  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const supabase = createServiceRoleSupabase();
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "set_visible_quota") {
    const weeklyLeftNow = Math.max(0, Math.round(Number(body.weeklyLeftNow ?? 0)));
    const monthlyLeftNow = Math.max(0, Math.round(Number(body.monthlyLeftNow ?? 0)));
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Admin set visible VIP AI quota";

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, tier, tier_expires_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const vipWeekly = await getVipWeeklyAiQuotaForUser(userId);
    const nowIso = new Date().toISOString();
    const monthlyExpiry =
      typeof profile.tier_expires_at === "string" && profile.tier_expires_at
        ? new Date(profile.tier_expires_at).toISOString()
        : monthEndIso();

    const { data: existingOverrides, error: overrideLoadError } = await supabase
      .from("addon_credit_purchases")
      .select("id, credits_granted, credits_used, expires_at, metadata")
      .eq("user_id", userId)
      .eq("kind", "feedback")
      .eq("status", "paid")
      .contains("metadata", { source: "admin_manual_override" })
      .order("created_at", { ascending: false });

    if (overrideLoadError) {
      return NextResponse.json({ error: overrideLoadError.message }, { status: 500 });
    }

    const weeklyOverride =
      (existingOverrides ?? []).find((row) => {
        const metadata = (row as { metadata?: Record<string, unknown> | null }).metadata ?? null;
        return metadata?.bucket === "weekly";
      }) ?? null;
    const monthlyOverride =
      (existingOverrides ?? []).find((row) => {
        const metadata = (row as { metadata?: Record<string, unknown> | null }).metadata ?? null;
        return metadata?.bucket === "monthly";
      }) ?? null;

    const applyOverride = async (args: {
      row: Record<string, unknown> | null;
      bucket: "weekly" | "monthly";
      leftNow: number;
      expiresAt: string;
    }) => {
      if (args.row) {
        const currentUsed = Math.max(0, Number(args.row.credits_used ?? 0));
        const patch = {
          credits_granted: currentUsed + args.leftNow,
          expires_at: args.expiresAt,
          metadata: {
            source: "admin_manual_override",
            bucket: args.bucket,
            adminId,
            reason,
            updatedAt: nowIso,
          },
          updated_at: nowIso,
        };
        const { error } = await supabase
          .from("addon_credit_purchases")
          .update(patch)
          .eq("id", String(args.row.id));
        if (error) throw error;
        return { previous: args.row, next: patch };
      }

      if (args.leftNow <= 0) return { previous: null, next: null };

      const insertRow = {
        user_id: userId,
        kind: "feedback",
        sku:
          args.bucket === "weekly"
            ? "admin_override_feedback_weekly"
            : "admin_override_feedback_monthly",
        credits_granted: args.leftNow,
        credits_used: 0,
        amount: 0,
        currency: "thb",
        status: "paid",
        expires_at: args.expiresAt,
        metadata: {
          source: "admin_manual_override",
          bucket: args.bucket,
          adminId,
          reason,
          createdAt: nowIso,
        },
        updated_at: nowIso,
      };
      const { error } = await supabase.from("addon_credit_purchases").insert(insertRow);
      if (error) throw error;
      return { previous: null, next: insertRow };
    };

    try {
      const weeklyResult = await applyOverride({
        row: weeklyOverride as Record<string, unknown> | null,
        bucket: "weekly",
        leftNow: weeklyLeftNow,
        expiresAt: vipWeekly.renewsAt,
      });
      const monthlyResult = await applyOverride({
        row: monthlyOverride as Record<string, unknown> | null,
        bucket: "monthly",
        leftNow: monthlyLeftNow,
        expiresAt: monthlyExpiry,
      });

      await logAdminAction({
        adminId,
        targetUserId: userId,
        action: "admin_ai_visible_quota_override",
        previousValue: {
          weeklyOverride,
          monthlyOverride,
          previousWeeklyLeft: vipWeekly.weeklyVisibleRemaining,
          previousMonthlyLeft: vipWeekly.monthlyVisibleRemaining,
        },
        newValue: {
          weeklyLeftNow,
          monthlyLeftNow,
          weeklyResult: weeklyResult.next,
          monthlyResult: monthlyResult.next,
        },
        reason,
      });

      return NextResponse.json({
        ok: true,
        weeklyLeftNow,
        monthlyLeftNow,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not set visible quota" },
        { status: 500 },
      );
    }
  }

  if (typeof body.creditId !== "string" || !body.creditId.trim()) {
    return NextResponse.json({ error: "creditId is required" }, { status: 400 });
  }

  const kind =
    body.kind === "feedback" || body.kind === "mock"
      ? body.kind
      : "feedback";

  const { data: before, error: beforeError } = await supabase
    .from("addon_credit_purchases")
    .select("*")
    .eq("id", body.creditId)
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();

  if (beforeError) {
    return NextResponse.json({ error: beforeError.message }, { status: 500 });
  }
  if (!before) {
    return NextResponse.json({ error: "Credit row not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.credits_granted === "number" && Number.isFinite(body.credits_granted)) {
    patch.credits_granted = Math.max(0, Math.round(body.credits_granted));
  }
  if (typeof body.credits_used === "number" && Number.isFinite(body.credits_used)) {
    patch.credits_used = Math.max(0, Math.round(body.credits_used));
  }
  if (typeof patch.credits_granted === "number" && typeof patch.credits_used === "number") {
    if (Number(patch.credits_used) > Number(patch.credits_granted)) {
      return NextResponse.json({ error: "credits_used cannot exceed credits_granted" }, { status: 400 });
    }
  } else if (
    typeof patch.credits_used === "number" &&
    Number(patch.credits_used) > Number(before.credits_granted ?? 0)
  ) {
    return NextResponse.json({ error: "credits_used cannot exceed credits_granted" }, { status: 400 });
  } else if (
    typeof patch.credits_granted === "number" &&
    Number(before.credits_used ?? 0) > Number(patch.credits_granted)
  ) {
    return NextResponse.json({ error: "credits_granted cannot be below used credits" }, { status: 400 });
  }

  if (typeof body.status === "string" && body.status.trim()) {
    patch.status = body.status.trim();
  }
  if (typeof body.expires_at === "string") {
    const parsed = body.expires_at.trim() ? new Date(body.expires_at) : null;
    if (body.expires_at.trim() && (!parsed || !Number.isFinite(parsed.getTime()))) {
      return NextResponse.json({ error: "Invalid expires_at" }, { status: 400 });
    }
    patch.expires_at = parsed ? parsed.toISOString() : null;
  } else if (body.expires_at === null) {
    patch.expires_at = null;
  }

  const { error } = await supabase
    .from("addon_credit_purchases")
    .update(patch)
    .eq("id", body.creditId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId,
    targetUserId: userId,
    action: kind === "mock" ? "admin_mock_credit_edit" : "admin_ai_credit_edit",
    previousValue: before,
    newValue: patch,
    reason:
      typeof body.reason === "string"
        ? body.reason
        : kind === "mock"
          ? "Admin edited mock credit row"
          : "Admin edited AI credit row",
  });

  return NextResponse.json({ ok: true });
}
