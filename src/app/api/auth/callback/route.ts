/**
 * Email confirmation + PKCE code exchange + password recovery (type=recovery).
 *
 * In Supabase dashboard → Authentication → URL Configuration:
 * - Site URL: http://localhost:3000 (or your production URL)
 * - Redirect URLs: http://localhost:3000/api/auth/callback (and production callback URL)
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isBootstrapAdminEmail } from "@/lib/admin-emails";
import { sendWelcomeEmail } from "@/lib/notifications";
import {
  COOKIE_AUTH_NEXT,
  COOKIE_SB_URL,
  decodeCookiePart,
} from "@/lib/supabase-public-config";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { grantVIPOnSignup, normalizeEmail } from "@/lib/vip-access";

function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/")) return "/practice";
  if (raw.startsWith("//") || raw.includes("://")) return "/practice";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const cookieStore = await cookies();
  const nextFromCookie = decodeCookiePart(
    cookieStore.get(COOKIE_AUTH_NEXT)?.value,
  );
  const next = sanitizeNextPath(
    url.searchParams.get("next") ?? nextFromCookie ?? "/practice",
  );

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createRouteHandlerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url),
    );
  }

  const user = data.user;
  if (!user?.email) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url),
    );
  }

  if (type === "recovery") {
    const res = NextResponse.redirect(new URL("/reset-password", request.url));
    res.cookies.set(COOKIE_AUTH_NEXT, "", { path: "/", maxAge: 0 });
    return res;
  }

  const urlFromCookie = decodeCookiePart(cookieStore.get(COOKIE_SB_URL)?.value);
  const admin = createServiceRoleSupabase(
    urlFromCookie ? { supabaseUrl: urlFromCookie } : undefined,
  );
  const norm = normalizeEmail(user.email);

  const { error: upsertError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: norm,
      full_name:
        (user.user_metadata?.full_name as string | undefined) ?? null,
      avatar_url:
        (user.user_metadata?.avatar_url as string | undefined) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    console.error("[auth/callback] profile upsert", upsertError.message);
  }

  if (isBootstrapAdminEmail(user.email)) {
    const { error: adminErr } = await admin
      .from("profiles")
      .update({
        role: "admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (adminErr) {
      console.error("[auth/callback] admin role", adminErr.message);
    }
  }

  await grantVIPOnSignup(user.id, user.email);

  const { data: profile } = await admin
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  await sendWelcomeEmail(
    norm,
    (user.user_metadata?.full_name as string | undefined) ?? undefined,
    profile?.tier as string | undefined,
  );

  const res = NextResponse.redirect(new URL(next, request.url));
  res.cookies.set(COOKIE_AUTH_NEXT, "", { path: "/", maxAge: 0 });
  return res;
}
