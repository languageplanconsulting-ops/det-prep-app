import { NextResponse } from "next/server";

import { ensureProfileForAuthUser } from "@/lib/ensure-profile";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import {
  checkVIPEligibility,
  grantVIPOnSignup,
  normalizeEmail,
} from "@/lib/vip-access";

/**
 * After email/password signUp while session exists (e.g. email confirmation off),
 * creates/updates profiles row with tier + VIP course grant rules.
 */
export async function POST(request: Request) {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fullName: string | null = null;
  try {
    const body = (await request.json()) as { fullName?: string };
    fullName =
      typeof body.fullName === "string" ? body.fullName.trim() || null : null;
  } catch {
    fullName = (user.user_metadata?.full_name as string | undefined) ?? null;
  }

  const norm = normalizeEmail(user.email);
  const eligible = await checkVIPEligibility(user.email);

  try {
    await ensureProfileForAuthUser({
      userId: user.id,
      email: norm,
      fullName,
      avatarUrl:
        (user.user_metadata?.avatar_url as string | undefined) ?? null,
      tier: eligible ? "vip" : "free",
      vipGrantedByCourse: eligible,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile upsert failed";
    console.error("[register-profile]", message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }

  await grantVIPOnSignup(user.id, user.email);

  return NextResponse.json({ ok: true });
}
