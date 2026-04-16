import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { parseFixedMockUploadJson } from "@/lib/mock-test/fixed-upload";

async function ensureAdmin() {
  const access = await getAdminAccess();
  if (!access.ok) {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const grouped = body.grouped_items ?? body.by_task ?? body;
  const parsed = parseFixedMockUploadJson(JSON.stringify({ grouped_items: grouped }));
  if (parsed.error) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  return NextResponse.json({ ok: true, rowCount: parsed.rows.length });
}
