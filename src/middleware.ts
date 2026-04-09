import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

import {
  COOKIE_SB_ANON,
  COOKIE_SB_URL,
  mergePublicSupabaseConfig,
} from "@/lib/supabase-public-config";
import { verifySimpleAdminToken, SIMPLE_ADMIN_COOKIE } from "@/lib/simple-admin";
import { ADMIN_PREVIEW_COOKIE } from "@/lib/admin-preview";

/** Require login for these prefixes (see auth spec) */
function requiresProtectedSession(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mock-test") ||
    pathname.startsWith("/notebook") ||
    pathname.startsWith("/profile")
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const previewTier = request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value;
  const previewActive =
    previewTier === "free" ||
    previewTier === "basic" ||
    previewTier === "premium" ||
    previewTier === "vip";

  const simpleAdminBypass =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/notebook") ||
    pathname.startsWith("/mock-test");
  let hasSimpleAdminToken = false;
  if (simpleAdminBypass) {
    const raw = request.cookies.get(SIMPLE_ADMIN_COOKIE)?.value;
    hasSimpleAdminToken = await verifySimpleAdminToken(raw);
    if (hasSimpleAdminToken) {
      return NextResponse.next();
    }
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const cfg = mergePublicSupabaseConfig(
    request.cookies.get(COOKIE_SB_URL)?.value,
    request.cookies.get(COOKIE_SB_ANON)?.value,
  );
  if (!cfg) {
    console.error(
      "[middleware] Missing Supabase URL/anon (set NEXT_PUBLIC_* in .env or Admin → Supabase)",
    );
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(cfg.url, cfg.anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow code-admin previewing to enter normal protected subscriber routes.
  if (!user && requiresProtectedSession(pathname)) {
    if (!hasSimpleAdminToken) {
      const raw = request.cookies.get(SIMPLE_ADMIN_COOKIE)?.value;
      hasSimpleAdminToken = await verifySimpleAdminToken(raw);
    }
    if (hasSimpleAdminToken && previewActive) {
      return response;
    }
  }

  if (!user && requiresProtectedSession(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/admin") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/practice", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
