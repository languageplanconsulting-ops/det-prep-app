import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchSubscriptionList } from "@/lib/admin-subscription-data";
import {
  repairDowngradedPaidUsers,
  repairMissingTierExpiries,
} from "@/lib/repair-missing-expiry";

export async function GET(request: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Silently back-fill any paid users with NULL tier_expires_at so the
  // list the admin sees reflects reality. Idempotent and cheap when
  // nothing is broken. Failures are logged but never block the read.
  try {
    await repairMissingTierExpiries({ adminId: auth.adminUserId });
    // Mirror case: restore Stripe payers wrongly knocked to free while a paid
    // window is still open (old login-downgrade casualties). Idempotent.
    await repairDowngradedPaidUsers({ adminId: auth.adminUserId });
  } catch (e) {
    console.error("[admin/subscriptions] auto-repair failed", e);
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "25");
  const search = searchParams.get("search") ?? undefined;
  const tier = searchParams.get("tier") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const payment = searchParams.get("payment") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;

  const data = await fetchSubscriptionList({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 25,
    search,
    tier,
    status,
    payment,
    sort,
  });

  return NextResponse.json(data);
}
