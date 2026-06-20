import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import {
  hasReadySampleForTarget,
  listReadySamplesForTargetIfVIP,
} from "@/lib/speaking-samples";
import { getUserTier } from "@/lib/subscription";
import { isSampleTargetKind } from "@/lib/speaking-samples-types";

/**
 * User-facing: return READY teacher samples for a target, with signed playback URLs.
 * VIP-gated server-side — non-VIP / signed-out callers get an empty list.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetKind = url.searchParams.get("target_kind");
  const targetRef = url.searchParams.get("target_ref");

  if (!isSampleTargetKind(targetKind) || !targetRef) {
    return NextResponse.json({ samples: [] });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const target = { kind: targetKind, ref: targetRef };
  const isVip = user ? (await getUserTier(user.id)) === "vip" : false;

  if (isVip) {
    const samples = await listReadySamplesForTargetIfVIP(user!.id, target);
    return NextResponse.json({ samples, locked: false });
  }

  // Non-VIP: never leak the video, but tell the UI whether a sample exists so it
  // can show the "🔒 VIP only" teaser.
  const locked = await hasReadySampleForTarget(target);
  return NextResponse.json({ samples: [], locked });
}
