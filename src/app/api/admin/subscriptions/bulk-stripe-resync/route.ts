import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin-auth";
import { repairUnsyncedStripeCustomers } from "@/lib/repair-missing-expiry";

export const runtime = "nodejs";

/**
 * Bulk admin tool: re-sync ALL "Unsynced" users from Stripe in one shot.
 *
 * "Unsynced" = tier='free' + has stripe_customer_id + no stripe_subscription_id
 * + no tier_expires_at. These are Stripe payers whose webhook was missed
 * (common with PromptPay async_payment_succeeded if the event isn't enabled
 * in the Stripe Dashboard). Manually clicking "Re-sync from Stripe" per user
 * becomes untenable at scale — this endpoint handles them all at once.
 * Same repair also runs daily via /api/cron/repair-subscriptions.
 *
 * Idempotent: fulfillment is keyed on stripe_payment_intent_id in
 * payment_history, so re-running for an already-fixed user is a no-op.
 *
 * POST /api/admin/subscriptions/bulk-stripe-resync
 * Body (optional): { limit?: number }  // default 100, max 200
 * → { ok, scanned, fixed, skippedNoPaidSession, errors, users }
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // empty body is fine
  }
  const limit = Number(body.limit ?? 100);

  const result = await repairUnsyncedStripeCustomers({ limit });

  return NextResponse.json({
    ok: true,
    scanned: result.scanned,
    fixed: result.fixed.length,
    skippedNoPaidSession: result.skippedNoPaidSession,
    errors: result.errors,
    users: result.fixed.map((u) => ({ userId: u.id, email: u.email, outcome: "fixed", tier: u.tier })),
  });
}
