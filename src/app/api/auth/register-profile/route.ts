import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  COOKIE_SB_URL,
  decodeCookiePart,
} from "@/lib/supabase-public-config";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
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

  const cookieStore = await cookies();
  const urlFromCookie = decodeCookiePart(cookieStore.get(COOKIE_SB_URL)?.value);
  const admin = createServiceRoleSupabase(
    urlFromCookie ? { supabaseUrl: urlFromCookie } : undefined,
  );
  const norm = normalizeEmail(user.email);
  const eligible = await checkVIPEligibility(user.email);

  const { error: upsertError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: norm,
      full_name: fullName,
      tier: eligible ? "vip" : "free",
      vip_granted_by_course: eligible,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    console.error("[register-profile]", upsertError.message);
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 },
    );
  }

  await grantVIPOnSignup(user.id, user.email);

  return NextResponse.json({ ok: true });
}
