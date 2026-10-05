import "server-only";

import { getAdminAccess } from "@/lib/admin-auth";
import { readAuthoritativeProfile } from "@/lib/authoritative-profile";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { createRequestSupabase } from "@/lib/supabase-request-client";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

/** Mini Study is available to VIP members and admins/admin-code previewers. */
export async function canUseMiniStudy(request?: Request): Promise<boolean> {
  const admin = await getAdminAccess(request);
  if (admin.ok) return true;

  try {
    const supabase = request
      ? await createRequestSupabase(request)
      : await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const profile = await readAuthoritativeProfile(user.id, supabase);
    if (profile?.role === "admin") return true;

    return resolveEffectiveTierFromProfile({
      tier: profile?.tier,
      tier_expires_at: (profile?.tier_expires_at as string | null | undefined) ?? null,
      vip_granted_by_course: profile?.vip_granted_by_course === true,
    }) === "vip";
  } catch {
    return false;
  }
}
