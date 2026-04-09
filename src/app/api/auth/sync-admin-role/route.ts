import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isBootstrapAdminEmail } from "@/lib/admin-emails";
import {
  COOKIE_SB_URL,
  decodeCookiePart,
} from "@/lib/supabase-public-config";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/vip-access";

/**
 * Ensures the bootstrap admin email has profiles.role = 'admin' (password login
 * does not go through /api/auth/callback). Safe to call on every session load.
 */
export async function POST() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBootstrapAdminEmail(user.email)) {
    return NextResponse.json({ ok: true, promoted: false });
  }

  const cookieStore = await cookies();
  const urlFromCookie = decodeCookiePart(cookieStore.get(COOKIE_SB_URL)?.value);
  const admin = createServiceRoleSupabase(
    urlFromCookie ? { supabaseUrl: urlFromCookie } : undefined,
  );
  const norm = normalizeEmail(user.email);

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("profiles").insert({
      id: user.id,
      email: norm,
      full_name:
        (user.user_metadata?.full_name as string | undefined) ?? null,
      role: "admin",
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, promoted: true, created: true });
  }

  const { error } = await admin
    .from("profiles")
    .update({
      role: "admin",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, promoted: true });
}
