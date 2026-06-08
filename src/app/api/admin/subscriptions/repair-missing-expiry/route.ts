import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { repairMissingTierExpiries } from "@/lib/repair-missing-expiry";

/**
 * Manual fallback. The same routine also runs automatically each time
 * an admin loads the subscription list (see /api/admin/subscriptions),
 * so this endpoint is rarely needed — kept as an escape valve.
 */
export async function POST() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await repairMissingTierExpiries({ adminId: auth.adminUserId });
  return NextResponse.json(result);
}
