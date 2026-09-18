/**
 * Token-hash email verification (password recovery, email confirmation).
 *
 * Robust cross-device alternative to the PKCE `code` exchange in
 * ./callback: verifyOtp({ token_hash }) needs no per-browser code_verifier,
 * so a reset link requested on one device works when opened on another
 * (e.g. requested in Chrome, opened from the Gmail app's in-app browser).
 *
 * Supabase dashboard → Authentication → Email Templates → "Reset Password":
 *   <a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
 *     Reset your password
 *   </a>
 */
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";

function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/")) return "/practice";
  if (raw.startsWith("//") || raw.includes("://")) return "/practice";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNextPath(
    url.searchParams.get("next") ??
      (type === "recovery" ? "/reset-password" : "/practice"),
  );

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url),
    );
  }

  const supabase = await createRouteHandlerSupabase();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=link_invalid", request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
