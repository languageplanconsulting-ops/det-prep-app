import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { isValidAdminLoginCode, makeSimpleAdminToken } from "@/lib/simple-admin";

/**
 * DEV ONLY: type the admin code in the mobile app and get a real Supabase
 * session for the admin account, so local testing doesn't need email + password.
 *
 * Disabled in production (404). Signs in as ADMIN_CODE_LOGIN_EMAIL when set,
 * otherwise the oldest profile with role = 'admin'. No email is sent: the magic
 * link is generated and verified server-side.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!isValidAdminLoginCode(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  try {
    const admin = createServiceRoleSupabase();

    let email = process.env.ADMIN_CODE_LOGIN_EMAIL?.trim() || "";
    if (!email) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!profile?.id) {
        return NextResponse.json({ error: "No admin account found" }, { status: 404 });
      }
      const { data: userRes } = await admin.auth.admin.getUserById(profile.id as string);
      email = userRes.user?.email ?? "";
    }
    if (!email) {
      return NextResponse.json({ error: "Admin account has no email" }, { status: 404 });
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      return NextResponse.json(
        { error: linkError?.message ?? "Could not create session" },
        { status: 500 },
      );
    }

    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: verified, error: verifyError } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    const session = verified?.session;
    if (verifyError || !session) {
      return NextResponse.json(
        { error: verifyError?.message ?? "Could not create session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      adminToken: await makeSimpleAdminToken(),
    });
  } catch (e) {
    console.error("[admin/dev-code-session]", e);
    return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  }
}
