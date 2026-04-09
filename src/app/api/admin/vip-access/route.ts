import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  bulkGrantVIP,
  getRecentVIPActivity,
  getVIPGrantList,
  getVIPGrantStats,
  grantVIPManually,
  previewBulkGrantEmails,
  revokeVIPAccess,
} from "@/lib/vip-access";

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [grants, stats, activity] = await Promise.all([
    getVIPGrantList(),
    getVIPGrantStats(),
    getRecentVIPActivity(10),
  ]);

  return NextResponse.json({ grants, stats, activity });
}

export async function POST(request: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const action = body?.action as string | undefined;

  try {
    if (action === "grant-single") {
      const email = String(body?.email ?? "");
      const notes = body?.notes != null ? String(body.notes) : null;
      const initialPasswordRaw = body?.initialPassword;
      const initialPassword =
        typeof initialPasswordRaw === "string" && initialPasswordRaw.trim()
          ? initialPasswordRaw.trim()
          : null;
      await grantVIPManually(email, adminId, notes, initialPassword);
      return NextResponse.json({ ok: true });
    }

    if (action === "bulk") {
      const emails = Array.isArray(body?.emails)
        ? (body.emails as unknown[]).map(String)
        : [];
      const notes = body?.notes != null ? String(body.notes) : null;
      const initialPasswordRaw = body?.initialPassword;
      const initialPassword =
        typeof initialPasswordRaw === "string" && initialPasswordRaw.trim()
          ? initialPasswordRaw.trim()
          : null;
      const result = await bulkGrantVIP(emails, adminId, notes, initialPassword);
      return NextResponse.json({ ok: true, result });
    }

    if (action === "preview-bulk") {
      const emails = Array.isArray(body?.emails)
        ? (body.emails as unknown[]).map(String)
        : [];
      const rows = await previewBulkGrantEmails(emails);
      return NextResponse.json({ ok: true, rows });
    }

    if (action === "revoke") {
      const email = String(body?.email ?? "");
      await revokeVIPAccess(email, adminId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
