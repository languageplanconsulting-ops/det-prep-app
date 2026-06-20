import { NextResponse } from "next/server";

import {
  deviceFromUserAgent,
  recordActivityEvents,
  type ActivityEventInput,
} from "@/lib/activity-events";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const runtime = "nodejs";

type TrackBody = {
  anonId?: string;
  sessionId?: string;
  referrer?: string;
  events?: ActivityEventInput[];
};

/**
 * Public, fire-and-forget ingest for behavioural telemetry. Designed for `navigator.sendBeacon`.
 *
 * Identity + tier are resolved SERVER-SIDE from the auth cookie — the client cannot spoof who it is
 * or claim to be free. PAID users are dropped here so the table only ever holds non-converted traffic.
 */
export async function POST(req: Request) {
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

  // Resolve the signed-in learner (if any) without throwing when Supabase isn't configured.
  let userId: string | null = null;
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  // Resolve tier. Anonymous visitors are "anonymous"; signed-in users get their effective tier.
  let tier = "anonymous";
  if (userId) {
    try {
      const admin = createServiceRoleSupabase();
      const { data: profile } = await admin
        .from("profiles")
        .select("tier, tier_expires_at, vip_granted_by_course")
        .eq("id", userId)
        .maybeSingle();
      tier = profile
        ? resolveEffectiveTierFromProfile({
            tier: profile.tier,
            tier_expires_at: profile.tier_expires_at,
            vip_granted_by_course: profile.vip_granted_by_course,
          })
        : "free";
    } catch {
      tier = "free";
    }
  }

  // Hard gate: only track NON-CONVERTED users. Paid tiers are silently ignored.
  if (tier !== "free" && tier !== "anonymous") {
    return NextResponse.json({ ok: true, inserted: 0, skipped: "paid" });
  }

  const result = await recordActivityEvents(events, {
    userId,
    anonId: typeof body.anonId === "string" ? body.anonId : null,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
    tier,
    referrer: typeof body.referrer === "string" ? body.referrer : null,
    device: deviceFromUserAgent(req.headers.get("user-agent")),
  });

  // Never surface ingest errors to the client tracker — telemetry must fail silently.
  return NextResponse.json({ ok: true, inserted: result.inserted });
}
