import "server-only";

import { cookies } from "next/headers";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createRequestSupabase } from "@/lib/supabase-request-client";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import {
  SIMPLE_ADMIN_COOKIE,
  SIMPLE_ADMIN_HEADER,
  verifySimpleAdminToken,
} from "@/lib/simple-admin";

export type AdminAccessResult =
  | { ok: true; adminUserId: string; simple: false }
  | { ok: true; adminUserId: null; simple: true }
  | { ok: false };

async function verifySimpleAdminFromRequest(request?: Request): Promise<boolean> {
  if (request) {
    const headerToken = request.headers.get(SIMPLE_ADMIN_HEADER)?.trim();
    if (headerToken && (await verifySimpleAdminToken(headerToken))) {
      return true;
    }
  }
  const cookieStore = await cookies();
  const raw = cookieStore.get(SIMPLE_ADMIN_COOKIE)?.value;
  return verifySimpleAdminToken(raw);
}

/** Profile-based admin (Supabase user + role) or simple code cookie/header — both can call admin APIs. */
export async function getAdminAccess(request?: Request): Promise<AdminAccessResult> {
  if (await verifySimpleAdminFromRequest(request)) {
    return { ok: true, adminUserId: null, simple: true };
  }

  // Accepts a mobile Bearer JWT when present, same as other cross-app routes; falls back
  // to the web cookie session otherwise (unchanged behavior for existing callers).
  const supabase = request ? await createRequestSupabase(request) : await createRouteHandlerSupabase();
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
