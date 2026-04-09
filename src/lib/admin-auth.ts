import "server-only";

import { cookies } from "next/headers";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { SIMPLE_ADMIN_COOKIE, verifySimpleAdminToken } from "@/lib/simple-admin";

export type AdminAccessResult =
  | { ok: true; adminUserId: string; simple: false }
  | { ok: true; adminUserId: null; simple: true }
  | { ok: false };

/** Profile-based admin (Supabase user + role) or simple code cookie — both can call admin APIs. */
export async function getAdminAccess(): Promise<AdminAccessResult> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SIMPLE_ADMIN_COOKIE)?.value;
  if (await verifySimpleAdminToken(raw)) {
    return { ok: true, adminUserId: null, simple: true };
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return { ok: false };
  return { ok: true, adminUserId: user.id, simple: false };
}

export async function logAdminAction(params: {
  adminId: string | null;
  targetUserId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  const { error } = await supabase.from("admin_actions").insert({
    admin_id: params.adminId,
    target_user_id: params.targetUserId,
    action: params.action,
    previous_value: params.previousValue ?? null,
    new_value: params.newValue ?? null,
    reason: params.reason ?? null,
  });
  if (error) {
    console.error("[admin_actions] insert failed", error.message);
  }
}
