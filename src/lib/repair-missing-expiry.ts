import { logAdminAction } from "@/lib/admin-auth";
import { weekStartMondayIsoDate } from "@/lib/addon-credits";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

const REPAIR_WINDOW_DAYS = 30;

export type RepairResult = {
  scanned: number;
  repaired: Array<{
    id: string;
    email: string | null;
    tier: string;
    newExpiry: string;
    basedOnPayment: boolean;
  }>;
  skippedCourseGrants: number;
};

/**
 * Finds profiles with a paid tier (basic / premium / vip) but no
 * `tier_expires_at` set, then back-fills a fresh 30-day expiry from
 * their most recent successful payment (falling back to now), zeroes
 * `ai_credits_used`, clears `lifetime_ai_used`, and resets the current
 * week's VIP usage bucket. Idempotent: a second call with no broken
 * profiles is essentially free.
 */
export async function repairMissingTierExpiries(
  options: { adminId?: string | null } = {},
): Promise<RepairResult> {
  const supabase = createServiceRoleSupabase();

  const { data: broken, error: scanErr } = await supabase
    .from("profiles")
    .select(
      "id, email, tier, tier_expires_at, vip_granted_by_course, ai_credits_used, lifetime_ai_used",
    )
    .in("tier", ["basic", "premium", "vip"])
    .is("tier_expires_at", null);

  if (scanErr) {
    console.error("[repair-missing-expiry] scan failed", scanErr.message);
    return { scanned: 0, repaired: [], skippedCourseGrants: 0 };
  }

  const candidates = (broken ?? []).filter(
    (row) => row.vip_granted_by_course !== true,
  );

  const skippedCourseGrants = (broken?.length ?? 0) - candidates.length;
  if (candidates.length === 0) {
    return { scanned: broken?.length ?? 0, repaired: [], skippedCourseGrants };
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
  const repaired: RepairResult["repaired"] = [];

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

    if (tier === "vip") {
      await supabase
        .from("vip_weekly_ai_usage")
        .delete()
        .eq("user_id", id)
        .eq("week_start", weekStart);
    }

    await logAdminAction({
      adminId: options.adminId ?? null,
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

  return { scanned: broken?.length ?? 0, repaired, skippedCourseGrants };
}
