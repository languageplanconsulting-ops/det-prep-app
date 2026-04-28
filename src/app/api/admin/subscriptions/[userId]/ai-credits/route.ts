import { NextResponse } from "next/server";

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
  if (!body || typeof body.creditId !== "string" || !body.creditId.trim()) {
    return NextResponse.json({ error: "creditId is required" }, { status: 400 });
  }

  const kind =
    body.kind === "feedback" || body.kind === "mock"
      ? body.kind
      : "feedback";

  const supabase = createServiceRoleSupabase();
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
