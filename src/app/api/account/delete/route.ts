import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-service account deletion, required for the store apps (App Store guideline 5.1.1(v)).
 *
 * 1. A live Stripe subscription is cancelled first, so a deleted account is never billed again.
 *    If that fails we stop: keeping the account is better than charging a deleted one.
 * 2. Admin audit rows that point at this user (admin_actions.target_user_id has no ON DELETE rule)
 *    are unlinked so they don't block the delete.
 * 3. The auth user is hard-deleted; profiles cascade and take every learning table with them
 *    (scores, sessions, notebook, credits, in-app payment rows; Stripe keeps the real payment records).
 * 4. Safety net: if the hard delete is still blocked, the profile is anonymised and the auth user
 *    soft-deleted, so the login and e-mail are gone either way.
 */
export async function POST(request: Request) {
  const { user } = await getRequestAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "Missing confirmation" }, { status: 400 });
  }

  const svc = createServiceRoleSupabase();
  const { data: profile } = await svc
    .from("profiles")
    .select("role, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  // Never let the app delete a staff account by accident.
  if (profile?.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts can't be deleted from the app." },
      { status: 403 },
    );
  }

  const subscriptionId = (profile?.stripe_subscription_id as string | null | undefined) ?? null;
  if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (sub.status !== "canceled" && sub.status !== "incomplete_expired") {
        await stripe.subscriptions.cancel(subscriptionId);
      }
    } catch (e) {
      console.error("[account/delete] stripe cancel failed", e);
      return NextResponse.json(
        {
          error:
            "ยกเลิกการสมัครสมาชิกไม่สำเร็จ กรุณาติดต่อ English Plan ก่อนลบบัญชี / Could not cancel your subscription — please contact us before deleting.",
        },
        { status: 502 },
      );
    }
  }

  await svc.from("admin_actions").update({ target_user_id: null }).eq("target_user_id", user.id);

  const hard = await svc.auth.admin.deleteUser(user.id);
  if (!hard.error) {
    return NextResponse.json({ ok: true, mode: "deleted" });
  }

  console.warn("[account/delete] hard delete blocked, anonymising instead:", hard.error.message);
  const { error: anonError } = await svc
    .from("profiles")
    .update({
      email: `deleted+${user.id}@deleted.invalid`,
      full_name: null,
      avatar_url: null,
      tier: "free",
      tier_expires_at: null,
      stripe_subscription_id: null,
    })
    .eq("id", user.id);
  if (anonError) console.error("[account/delete] anonymise profile failed", anonError.message);

  const soft = await svc.auth.admin.deleteUser(user.id, true);
  if (soft.error) {
    console.error("[account/delete] soft delete failed", soft.error.message);
    return NextResponse.json(
      {
        error:
          "ลบบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง หรือติดต่อ English Plan / Could not delete the account — please try again or contact us.",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, mode: "anonymised" });
}
