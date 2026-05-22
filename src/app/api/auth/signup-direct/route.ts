import { NextResponse } from "next/server";

import { recordBusinessEvent } from "@/lib/business-events";
import { ensureProfileForAuthUser } from "@/lib/ensure-profile";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import {
  checkVIPEligibility,
  grantVIPOnSignup,
  normalizeEmail,
} from "@/lib/vip-access";

const MIN_PASSWORD_LEN = 8;
const MAX_LIST_PAGES = 40;

type AuthUserLite = {
  id: string;
  email: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: { full_name?: unknown; avatar_url?: unknown } | null;
};

async function findAuthUserByEmail(email: string): Promise<AuthUserLite | null> {
  const supabase = createServiceRoleSupabase();
  const norm = normalizeEmail(email);

  for (let page = 1; page <= MAX_LIST_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw new Error(error.message);
    }

    const hit = data.users.find((user) => normalizeEmail(user.email ?? "") === norm);
    if (hit) {
      return {
        id: hit.id,
        email: hit.email ?? null,
        email_confirmed_at: hit.email_confirmed_at ?? null,
        last_sign_in_at: hit.last_sign_in_at ?? null,
        user_metadata:
          (hit.user_metadata as { full_name?: unknown; avatar_url?: unknown } | null | undefined) ??
          null,
      };
    }

    if (data.users.length < 200) break;
  }

  return null;
}

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

  const supabase = createServiceRoleSupabase();

  let userId: string | null = null;
  let createdNew = false;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (!createError && created.user) {
    userId = created.user.id;
    createdNew = true;
  } else {
    const code = (createError as { code?: string } | null)?.code;
    const msg = createError?.message ?? "";
    const duplicate =
      code === "email_exists" ||
      /already\s+been\s+registered|already\s+exists|duplicate/i.test(msg);

    if (!duplicate) {
      return NextResponse.json(
        { error: msg || "Could not create account." },
        { status: 500 },
      );
    }

    const existing = await findAuthUserByEmail(email);
    if (!existing?.id) {
      return NextResponse.json(
        { error: "This email is already registered. Please sign in instead." },
        { status: 409 },
      );
    }

    const repairable =
      !existing.email_confirmed_at &&
      !existing.last_sign_in_at;

    if (!repairable) {
      return NextResponse.json(
        { error: "This email is already registered. Please sign in or reset your password." },
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      password,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        ...(fullName ? { full_name: fullName } : {}),
      },
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    userId = existing.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Could not provision account." }, { status: 500 });
  }

  const eligible = await checkVIPEligibility(email);

  try {
    await ensureProfileForAuthUser({
      userId,
      email,
      fullName,
      tier: eligible ? "vip" : "free",
      vipGrantedByCourse: eligible,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile upsert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await grantVIPOnSignup(userId, email);

  if (createdNew) {
    await recordBusinessEvent({
      userId,
      email,
      eventType: "account_created",
      eventSource: "signup_direct",
      eventLabel: eligible ? "vip" : "free",
      dedupeKey: `account_created:${userId}`,
      metadata: {
        provider: "email",
        tier: eligible ? "vip" : "free",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    createdNew,
    repairedPendingAccount: !createdNew,
  });
}
