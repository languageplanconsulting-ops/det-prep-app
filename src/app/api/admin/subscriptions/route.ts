import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { fetchSubscriptionList } from "@/lib/admin-subscription-data";

export async function GET(request: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
