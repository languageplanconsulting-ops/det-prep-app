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
import { ensureProfileForAuthUser } from "@/lib/ensure-profile";
import { sendWelcomeEmail } from "@/lib/notifications";
import {
  COOKIE_AUTH_NEXT,
  COOKIE_SB_URL,
  decodeCookiePart,
} from "@/lib/supabase-public-config";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
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

  const norm = normalizeEmail(user.email);
  const bootstrapAdmin = isBootstrapAdminEmail(user.email);

  try {
    await ensureProfileForAuthUser({
      userId: user.id,
      email: norm,
      fullName:
        (user.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl:
        (user.user_metadata?.avatar_url as string | undefined) ?? null,
      role: bootstrapAdmin ? "admin" : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile upsert failed";
    console.error("[auth/callback] profile upsert", message);
  }

  await grantVIPOnSignup(user.id, user.email);

  const urlFromCookie = decodeCookiePart(cookieStore.get(COOKIE_SB_URL)?.value);
  const admin = createServiceRoleSupabase(
    urlFromCookie ? { supabaseUrl: urlFromCookie } : undefined,
  );
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
