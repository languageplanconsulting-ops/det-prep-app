import { NextResponse } from "next/server";

import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

/**
 * Server-authoritative effective tier for the signed-in user.
 *
 * The browser Supabase client reads its session from localStorage, which Safari/iPad
 * can clear or partition (ITP) — making the client-side profile read come back empty and
 * wrongly resolve paid users to "free". This route reads the SAME session from first-party
 * cookies on the server (reliable on Safari) and resolves the tier the same way, so
 * useEffectiveTier can trust it.
 */
export async function GET() {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ authenticated: false });

    const { data } = await supabase
      .from("profiles")
      .select("tier, role, vip_granted_by_course, stripe_subscription_id, stripe_customer_id, tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    const effectiveTier = resolveEffectiveTierFromProfile({
      tier: data?.tier,
      tier_expires_at: (data?.tier_expires_at as string | null | undefined) ?? null,
      vip_granted_by_course: data?.vip_granted_by_course === true,
    });

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      effectiveTier,
      isAdmin: data?.role === "admin",
      vipGrantedByCourse: data?.vip_granted_by_course === true,
      planExpiresAt: (data?.tier_expires_at as string | null | undefined) ?? null,
      hasStripeSubscription:
        !!data?.stripe_subscription_id ||
        (!!data?.stripe_customer_id && effectiveTier !== "free" && data?.vip_granted_by_course !== true),
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
