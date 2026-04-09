import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

const MIN_PASSWORD_LEN = 8;
const MAX_LIST_PAGES = 40;

async function findAuthUserIdByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const norm = normEmail(email);
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.error("[vip-auth-provision] listUsers", error.message);
      return null;
    }
    const hit = data.users.find((u) => normEmail(u.email ?? "") === norm);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Creates an email/password auth user or sets password on an existing account.
 * Email is confirmed so the student can sign in immediately (project settings permitting).
 */
export async function provisionCourseStudentAuth(
  email: string,
  password: string,
): Promise<
  { ok: true; userId: string; createdNew: boolean } | { ok: false; error: string }
> {
  const norm = normEmail(email);
  const trimmed = password.trim();
  if (trimmed.length < MIN_PASSWORD_LEN) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LEN} characters.`,
    };
  }

  const supabase = createServiceRoleSupabase();

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: norm,
    password: trimmed,
    email_confirm: true,
  });

  if (!createErr && created.user) {
    return { ok: true, userId: created.user.id, createdNew: true };
  }

  const code = (createErr as { code?: string } | null)?.code;
  const msg = createErr?.message ?? "";
  const duplicate =
    code === "email_exists" ||
    /already\s+been\s+registered|already\s+exists|duplicate/i.test(msg);

  if (!duplicate) {
    return { ok: false, error: msg || "Could not create auth user." };
  }

  const userId = await findAuthUserIdByEmail(supabase, norm);
  if (!userId) {
    return {
      ok: false,
      error: "Account exists but could not be loaded to set password.",
    };
  }

  const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
    password: trimmed,
    email_confirm: true,
  });

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  return { ok: true, userId, createdNew: false };
}
