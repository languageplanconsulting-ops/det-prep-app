import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

import {
  COOKIE_SB_ANON,
  COOKIE_SB_URL,
  mergePublicSupabaseConfig,
} from "@/lib/supabase-public-config";
import { hasActivePaidPlan } from "@/lib/plan-status";
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

function isPracticePath(pathname: string): boolean {
  return pathname === "/practice" || pathname.startsWith("/practice/");
}

type ProfileGate = {
  role: string | null;
  tier: string | null;
  vip_granted_by_course: boolean | null;
  tier_expires_at: string | null;
  stripe_subscription_id: string | null;
};

function isPayingMember(p: ProfileGate | null | undefined): boolean {
  if (!p) return false;
  return hasActivePaidPlan(p);
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
    pathname.startsWith("/mock-test") ||
    pathname.startsWith("/practice");
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
    if (isPracticePath(pathname) || pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
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

  const practicePath = isPracticePath(pathname);

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

  // Practice hub: subscribers, DB admins, or code-admin (with optional preview tier).
  if (practicePath && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const needsProfileGate =
    !!user && (practicePath || pathname.startsWith("/admin"));

  let profile: ProfileGate | null = null;
  if (needsProfileGate) {
    const { data } = await supabase
      .from("profiles")
      .select("role, tier, vip_granted_by_course, tier_expires_at, stripe_subscription_id")
      .eq("id", user!.id)
      .maybeSingle();
    profile = data as ProfileGate | null;
  }

  if (practicePath && user) {
    if (profile?.role === "admin" || isPayingMember(profile)) {
      // ok
    } else {
      const raw = request.cookies.get(SIMPLE_ADMIN_COOKIE)?.value;
      const codeOk = await verifySimpleAdminToken(raw);
      if (codeOk && previewActive) {
        // Logged-in user using admin code + preview-as-tier
      } else {
        return NextResponse.redirect(new URL("/pricing?expired=1", request.url));
      }
    }
  }

  if (pathname.startsWith("/admin") && user) {
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
