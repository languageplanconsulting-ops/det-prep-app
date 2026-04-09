import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ userId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as {
    reason?: string;
  } | null;

  const supabase = createServiceRoleSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const subId = profile.stripe_subscription_id as string | null;
  if (!subId) {
    return NextResponse.json({ error: "No Stripe subscription" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
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
    action: "stripe_subscription_cancelled",
    previousValue: profile,
    newValue: { stripe_subscription_id: null, tier: "free" },
    reason: body?.reason ?? null,
  });

  return NextResponse.json({ ok: true });
}
