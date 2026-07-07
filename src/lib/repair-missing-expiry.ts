import type Stripe from "stripe";

import { logAdminAction } from "@/lib/admin-auth";
import { weekStartMondayIsoDate } from "@/lib/addon-credits";
import { getStripe } from "@/lib/stripe";
import { fulfillOneTimePlanPurchase } from "@/lib/stripe-fulfillment";
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

const PAID_TIERS = ["basic", "premium", "vip"] as const;

export type DowngradeRepairResult = {
  scanned: number;
  restored: Array<{
    id: string;
    email: string | null;
    tier: string;
    tier_expires_at: string;
  }>;
  /** Free + valid-expiry Stripe rows we could not safely restore (no paid payment_history). */
  skippedNoPaidPayment: number;
};

/**
 * Repairs the mirror image of the missing-expiry case: profiles that were
 * wrongly knocked down to `tier = 'free'` while a paid window was still
 * running. The old login-downgrade bug (see grantVIPOnSignup history) set
 * `tier:"free"` but left `tier_expires_at` intact, so these rows look like
 * "Unsynced" forever and the user reads as free despite having paid time
 * left. The repairMissingTierExpiries scan can't catch them because it only
 * looks at `tier != 'free'`.
 *
 * Fingerprint we restore (Stripe one-time payers only):
 *   - tier === 'free'
 *   - tier_expires_at is in the future (paid window still open)
 *   - has stripe_customer_id, no stripe_subscription_id
 *   - not a course grant (vip_granted_by_course !== true)
 *
 * The real tier is read back from the most recent succeeded `payment_history`
 * row (no Stripe API call). Rows with no paid payment on record are left for a
 * manual "Re-sync from Stripe" rather than guessed. Idempotent.
 */
export async function repairDowngradedPaidUsers(
  options: { adminId?: string | null } = {},
): Promise<DowngradeRepairResult> {
  const supabase = createServiceRoleSupabase();
  const nowIso = new Date().toISOString();

  const { data: broken, error: scanErr } = await supabase
    .from("profiles")
    .select(
      "id, email, tier, tier_expires_at, stripe_customer_id, stripe_subscription_id, vip_granted_by_course",
    )
    .eq("tier", "free")
    .not("stripe_customer_id", "is", null)
    .is("stripe_subscription_id", null)
    .gt("tier_expires_at", nowIso);

  if (scanErr) {
    console.error("[repair-downgraded] scan failed", scanErr.message);
    return { scanned: 0, restored: [], skippedNoPaidPayment: 0 };
  }

  const candidates = (broken ?? []).filter(
    (row) => row.vip_granted_by_course !== true,
  );
  if (candidates.length === 0) {
    return { scanned: broken?.length ?? 0, restored: [], skippedNoPaidPayment: 0 };
  }

  const userIds = candidates.map((row) => row.id as string);
  const { data: payments } = await supabase
    .from("payment_history")
    .select("user_id, tier, created_at")
    .in("user_id", userIds)
    .eq("status", "succeeded")
    .in("tier", PAID_TIERS as unknown as string[])
    .order("created_at", { ascending: false });

  // Most recent paid tier on record per user.
  const latestPaidTier = new Map<string, string>();
  for (const row of payments ?? []) {
    const uid = row.user_id as string;
    const tier = row.tier as string | null;
    if (!latestPaidTier.has(uid) && tier && (PAID_TIERS as readonly string[]).includes(tier)) {
      latestPaidTier.set(uid, tier);
    }
  }

  const restored: DowngradeRepairResult["restored"] = [];
  let skippedNoPaidPayment = 0;

  for (const row of candidates) {
    const id = row.id as string;
    const tier = latestPaidTier.get(id);
    if (!tier) {
      // Can't tell which paid tier they held — leave for manual Stripe re-sync.
      skippedNoPaidPayment += 1;
      continue;
    }

    const expiry = row.tier_expires_at as string;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ tier, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updErr) {
      console.error("[repair-downgraded] update failed", id, updErr.message);
      continue;
    }

    await logAdminAction({
      adminId: options.adminId ?? null,
      targetUserId: id,
      action: "repair_downgraded_paid_user",
      previousValue: { tier: "free", tier_expires_at: expiry },
      newValue: { tier, tier_expires_at: expiry },
      reason:
        "Auto-repair: free tier with a still-valid paid expiry (old login-downgrade casualty)",
    });

    restored.push({
      id,
      email: (row.email as string | null) ?? null,
      tier,
      tier_expires_at: expiry,
    });
  }

  return { scanned: broken?.length ?? 0, restored, skippedNoPaidPayment };
}

export type UnsyncedStripeRepairResult = {
  scanned: number;
  fixed: Array<{ id: string; email: string | null; tier: string | null }>;
  skippedNoPaidSession: number;
  errors: number;
};

/**
 * Repairs the "never fulfilled at all" case: the customer paid in Stripe
 * (has stripe_customer_id) but tier is still 'free' with no expiry and no
 * subscription — meaning the webhook (checkout.session.completed /
 * async_payment_succeeded / payment_intent.succeeded) never ran fulfillment
 * for them. This is the common failure mode for Thai PromptPay, where
 * payment settles asynchronously after the customer has left the checkout
 * page, and the dashboard's webhook endpoint isn't subscribed to the async
 * event types.
 *
 * Unlike repairMissingTierExpiries / repairDowngradedPaidUsers, this reads
 * live from the Stripe API (no local trace exists yet to repair from) and
 * calls the same fulfillOneTimePlanPurchase() the webhook uses — so it's
 * exactly as idempotent (keyed on stripe_payment_intent_id).
 */
export async function repairUnsyncedStripeCustomers(
  options: { limit?: number } = {},
): Promise<UnsyncedStripeRepairResult> {
  const supabase = createServiceRoleSupabase();
  const cap = Math.min(options.limit ?? 100, 200);

  const { data: candidates, error: scanErr } = await supabase
    .from("profiles")
    .select("id, email, stripe_customer_id, vip_granted_by_course")
    .eq("tier", "free")
    .not("stripe_customer_id", "is", null)
    .is("stripe_subscription_id", null)
    .is("tier_expires_at", null)
    .limit(cap);

  if (scanErr) {
    console.error("[repair-unsynced-stripe] scan failed", scanErr.message);
    return { scanned: 0, fixed: [], skippedNoPaidSession: 0, errors: 0 };
  }

  const users = (candidates ?? []).filter((r) => r.vip_granted_by_course !== true);
  if (users.length === 0) {
    return { scanned: candidates?.length ?? 0, fixed: [], skippedNoPaidSession: 0, errors: 0 };
  }

  const stripe = getStripe();
  const fixed: UnsyncedStripeRepairResult["fixed"] = [];
  let skippedNoPaidSession = 0;
  let errors = 0;

  for (const user of users) {
    const customerId = user.stripe_customer_id as string;
    const userId = user.id as string;
    const email = (user.email as string | null) ?? null;

    try {
      const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 20 });
      let foundAndFulfilled = false;

      for (const session of sessions.data) {
        const meta = session.metadata ?? {};
        const eligible =
          session.mode === "payment" &&
          meta.purchaseKind === "plan" &&
          meta.userId === userId &&
          session.payment_status === "paid";
        if (!eligible) continue;

        const full = (await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["payment_intent", "customer"],
        })) as Stripe.Checkout.Session;

        const result = await fulfillOneTimePlanPurchase(full);
        if (result.ok) {
          fixed.push({ id: userId, email, tier: result.tier });
          foundAndFulfilled = true;
          break; // most recent paid session is enough; fulfillment is idempotent anyway
        }
      }

      if (!foundAndFulfilled) {
        skippedNoPaidSession += 1;
      }
    } catch (e) {
      console.error("[repair-unsynced-stripe] failed for user", userId, e);
      errors += 1;
    }
  }

  return { scanned: users.length, fixed, skippedNoPaidSession, errors };
}
