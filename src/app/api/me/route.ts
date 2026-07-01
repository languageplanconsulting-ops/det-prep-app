import { NextResponse } from "next/server";

import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
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
 *
 * IMPORTANT: the profile row is read with the SERVICE-ROLE client (bypasses RLS) once we
 * know who the user is. The user-scoped (RLS) read can return null when the server client's
 * access token is stale/expired — which used to make `resolveEffectiveTierFromProfile`
 * collapse a paying customer to "free" and, because this route is authoritative, override a
 * correct client read. Reading the true row by id with the service role removes that failure
 * mode: as long as we can identify the user, we always see their real tier.
 */
export async function GET() {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ authenticated: false });

    // Read the profile authoritatively (service role, RLS-immune). Fall back to the
    // user-scoped client only if the service key isn't configured for this environment.
    let data:
      | {
          tier?: unknown;
          role?: unknown;
          vip_granted_by_course?: unknown;
          stripe_subscription_id?: unknown;
          stripe_customer_id?: unknown;
          tier_expires_at?: unknown;
        }
      | null = null;
    const columns =
      "tier, role, vip_granted_by_course, stripe_subscription_id, stripe_customer_id, tier_expires_at";
    try {
      const admin = createServiceRoleSupabase();
      ({ data } = await admin.from("profiles").select(columns).eq("id", user.id).maybeSingle());
    } catch {
      ({ data } = await supabase.from("profiles").select(columns).eq("id", user.id).maybeSingle());
    }

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
