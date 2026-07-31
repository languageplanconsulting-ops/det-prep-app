import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRequestSupabase } from "@/lib/supabase-request-client";

/**
 * Who a study-plan request belongs to, and which client may touch their rows.
 *
 * The study plan is per-user data (every table keys on user_id → profiles.id),
 * but the admin CODE login carries no Supabase user — it is an HMAC cookie that
 * says "an admin", not "which account". Routes that only called
 * `supabase.auth.getUser()` therefore answered 401 to code-admins, which is how
 * "สร้างแผนการเรียน" ended up doing nothing on /practice (a route the middleware
 * lets admin codes into).
 *
 * A code-admin is resolved to the ADMIN's own profile so preview writes land on
 * the admin's account. Deliberately NOT the `profiles ... limit 1` pattern used
 * by the mini-diagnosis preview route: `study_plan_schedules` is keyed by
 * user_id and written with upsert, so borrowing an arbitrary profile would
 * silently overwrite a real student's exam date and calendar.
 */
export type PlanIdentity = {
  userId: string;
  /**
   * The client to read/write this user's rows with. A real session uses its own
   * RLS-scoped client; an admin-code preview has no session at all, so it must
   * use the service role (scoped by user_id in every query).
   */
  supabase: SupabaseClient;
  /** True when this is an admin-code preview rather than a real signed-in user. */
  isAdminPreview: boolean;
};

/** Resolves the caller, or null when nobody is signed in (routes answer 401). */
export async function resolvePlanIdentity(request?: Request): Promise<PlanIdentity | null> {
  const supabase = await createRequestSupabase(request ?? new Request("http://localhost"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return { userId: user.id, supabase, isAdminPreview: false };
  }

  const access = await getAdminAccess(request);
  if (!access.ok) return null;

  const service = createServiceRoleSupabase();

  // Profile-based admin without a usable request session: use their own id.
  if (access.simple === false && access.adminUserId) {
    return { userId: access.adminUserId, supabase: service, isAdminPreview: true };
  }

  // Code-admin: oldest admin profile, so repeat previews always land on the same
  // account instead of hopping between rows as profiles are added.
  const { data: admin } = await service
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!admin?.id) return null;

  return { userId: admin.id as string, supabase: service, isAdminPreview: true };
}
