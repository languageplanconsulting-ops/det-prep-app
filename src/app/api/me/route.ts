import { NextResponse } from "next/server";

import { readAuthoritativeProfile } from "@/lib/authoritative-profile";
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

    // Read the profile authoritatively (service role, RLS-immune) now that we know who the
    // user is — a stale user-scoped token can otherwise return null and collapse a payer to
    // "free", which this authoritative route would then broadcast.
    const data = await readAuthoritativeProfile(user.id, supabase);

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
