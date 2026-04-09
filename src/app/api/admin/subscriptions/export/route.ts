import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { buildExportRows, rowsToCsv } from "@/lib/admin-subscription-data";

export async function GET(request: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "all") as
    | "all"
    | "paid"
    | "expiring7"
    | "expiring30"
    | "inactive"
    | "vip_course";

  const rows = await buildExportRows(type);
  const csv = rowsToCsv(
    rows.map((r) => ({
      name: r.name,
      email: r.email,
      tier: r.tier,
      status: String(r.status),
      start_date: r.start_date,
      expiry_date: r.expiry_date,
      total_paid_satang: r.total_paid_satang,
      last_active: String(r.last_active),
      sessions_completed: r.sessions_completed,
      mock_tests_taken: r.mock_tests_taken,
    })),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscriptions-${type}.csv"`,
    },
  });
}
