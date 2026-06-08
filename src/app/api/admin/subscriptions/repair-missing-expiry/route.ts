import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { weekStartMondayIsoDate } from "@/lib/addon-credits";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

const REPAIR_WINDOW_DAYS = 30;

/**
 * Finds users whose tier is paid (basic / premium / vip) but whose
 * `tier_expires_at` is NULL — a state that makes the app silently fall
 * back to the free tier and block AI access. For each, sets a fresh
 * expiry (last paid date + 30 days, or now + 30 days if no payment),
 * zeroes the AI counters and clears `lifetime_ai_used` so the user
 * actually receives their plan credits. Skips users with
 * `vip_granted_by_course = true` because they are intentionally
 * grantless.
 */
export async function POST() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const supabase = createServiceRoleSupabase();

  const { data: broken, error: scanErr } = await supabase
    .from("profiles")
    .select(
      "id, email, tier, tier_expires_at, vip_granted_by_course, ai_credits_used, lifetime_ai_used",
    )
    .in("tier", ["basic", "premium", "vip"])
    .is("tier_expires_at", null);

  if (scanErr) {
    return NextResponse.json({ error: scanErr.message }, { status: 500 });
  }

  const candidates = (broken ?? []).filter(
    (row) => row.vip_granted_by_course !== true,
  );

  if (candidates.length === 0) {
    return NextResponse.json({ repaired: [], scanned: broken?.length ?? 0 });
  }

  const userIds = candidates.map((row) => row.id as string);
  const { data: payments } = await supabase
    .from("payment_history")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false });

  const latestPayment = new Map<string, string>();
  for (const row of payments ?? []) {
    const uid = row.user_id as string;
    if (!latestPayment.has(uid) && typeof row.created_at === "string") {
      latestPayment.set(uid, row.created_at);
    }
  }

  const nowMs = Date.now();
  const weekStart = weekStartMondayIsoDate();
  const repaired: Array<{
    id: string;
    email: string | null;
    tier: string;
    newExpiry: string;
    basedOnPayment: boolean;
  }> = [];

  for (const row of candidates) {
    const id = row.id as string;
    const tier = row.tier as string;
    const lastPaidIso = latestPayment.get(id) ?? null;
    let basedOnPayment = false;
    let baseMs = nowMs;
    if (lastPaidIso) {
      const t = new Date(lastPaidIso).getTime();
      if (Number.isFinite(t)) {
        baseMs = t;
        basedOnPayment = true;
      }
    }
    const candidateMs = baseMs + REPAIR_WINDOW_DAYS * 86400 * 1000;
    // Always give at least 1 day of forward access from now.
    const expiryMs = Math.max(candidateMs, nowMs + 86400 * 1000);
    const newExpiry = new Date(expiryMs).toISOString();

    const patch = {
      tier_expires_at: newExpiry,
      ai_credits_used: 0,
      lifetime_ai_used: false,
      updated_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id);

    if (updErr) {
      console.error("[repair-missing-expiry] update failed", id, updErr.message);
      continue;
    }

    // Clear current week's VIP weekly bucket so they start fresh.
    if (tier === "vip") {
      await supabase
        .from("vip_weekly_ai_usage")
        .delete()
        .eq("user_id", id)
        .eq("week_start", weekStart);
    }

    await logAdminAction({
      adminId,
      targetUserId: id,
      action: "repair_missing_expiry",
      previousValue: {
        tier_expires_at: null,
        ai_credits_used: row.ai_credits_used ?? null,
        lifetime_ai_used: row.lifetime_ai_used ?? null,
      },
      newValue: { ...patch, basedOnPayment },
      reason: "Auto-repair: paid tier with NULL tier_expires_at",
    });

    repaired.push({
      id,
      email: (row.email as string | null) ?? null,
      tier,
      newExpiry,
      basedOnPayment,
    });
  }

  return NextResponse.json({
    repaired,
    scanned: broken?.length ?? 0,
    skippedCourseGrants: (broken?.length ?? 0) - candidates.length,
  });
}
