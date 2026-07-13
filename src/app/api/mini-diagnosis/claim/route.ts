import { NextResponse } from "next/server";

import { recordBusinessEvent } from "@/lib/business-events";
import { ensureProfileForAuthUser } from "@/lib/ensure-profile";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { checkVIPEligibility, grantVIPOnSignup, normalizeEmail } from "@/lib/vip-access";

const MIN_PASSWORD_LEN = 8;

/**
 * Converts the caller's ANONYMOUS session (see /api/mini-diagnosis/session) into a permanent
 * email+password account, in place. Uses the service-role admin API to set the email directly
 * with `email_confirm: true` — same instant-confirm pattern as /api/auth/signup-direct — so no
 * confirmation email is required, matching this app's existing signup flow.
 *
 * Critically, this keeps the SAME auth user id, so every mini_diagnosis_sessions/results row
 * already written under the anonymous id stays attached with zero data migration.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const rawEmail = typeof input.email === "string" ? input.email : "";
  const rawPassword = typeof input.password === "string" ? input.password : "";
  const rawFullName = typeof input.fullName === "string" ? input.fullName : "";

  const email = normalizeEmail(rawEmail);
  const password = rawPassword.trim();
  const fullName = rawFullName.trim() || null;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` },
      { status: 400 },
    );
  }

  const routeSupabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await routeSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.is_anonymous !== true) {
    // Already a real account — nothing to claim. Treat as a no-op success so a stale UI
    // (double submit, back-button) doesn't show a scary error.
    return NextResponse.json({ ok: true, alreadyClaimed: true });
  }

  const admin = createServiceRoleSupabase();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email,
    password,
    email_confirm: true,
    user_metadata: {
      ...(user.user_metadata ?? {}),
      ...(fullName ? { full_name: fullName } : {}),
    },
  });

  if (updateError) {
    const code = (updateError as { code?: string } | null)?.code;
    const msg = updateError.message ?? "";
    const duplicate =
      code === "email_exists" || /already\s+been\s+registered|already\s+exists|duplicate/i.test(msg);
    if (duplicate) {
      return NextResponse.json(
        { error: "This email is already registered. Please sign in on that account instead." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg || "Could not save your account." }, { status: 500 });
  }

  const eligible = await checkVIPEligibility(email);

  try {
    await ensureProfileForAuthUser({
      userId: user.id,
      email,
      fullName,
      tier: eligible ? "vip" : "free",
      vipGrantedByCourse: eligible,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile upsert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await grantVIPOnSignup(user.id, email);

  await recordBusinessEvent({
    userId: user.id,
    email,
    eventType: "account_created",
    eventSource: "mini_diagnosis_claim",
    eventLabel: eligible ? "vip" : "free",
    dedupeKey: `account_created:${user.id}`,
    metadata: {
      provider: "anonymous_conversion",
      tier: eligible ? "vip" : "free",
    },
  });

  return NextResponse.json({ ok: true });
}
