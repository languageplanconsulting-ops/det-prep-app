import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { saveVideoScript } from "@/lib/admin-course-production-data";
import type { ProductionStatus } from "@/lib/course-production";

const VALID_STATUS: ProductionStatus[] = [
  "missing",
  "scripted",
  "recorded",
  "uploaded",
  "live",
  "draft",
  "dead",
];

export async function POST(req: Request) {
  const auth = await getAdminAccess(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const videoKey = typeof b.videoKey === "string" ? b.videoKey.trim() : "";
  if (!videoKey) {
    return NextResponse.json({ error: "videoKey is required" }, { status: 400 });
  }

  const status = b.status;
  if (status !== undefined && status !== null && !VALID_STATUS.includes(status as ProductionStatus)) {
    return NextResponse.json({ error: `Invalid status: ${String(status)}` }, { status: 400 });
  }

  const result = await saveVideoScript({
    videoKey,
    scriptMd: b.scriptMd === undefined ? undefined : b.scriptMd === null ? null : String(b.scriptMd),
    status: status === undefined ? undefined : (status as ProductionStatus | null),
    notes: b.notes === undefined ? undefined : b.notes === null ? null : String(b.notes),
    bunnyVideoGuid:
      b.bunnyVideoGuid === undefined
        ? undefined
        : b.bunnyVideoGuid === null
          ? null
          : String(b.bunnyVideoGuid),
    userId: auth.adminUserId ?? null,
  });

  if (!result.ok) {
    const status = result.reason === "not_deployed" ? 503 : result.reason === "unknown_key" ? 400 : 500;
    return NextResponse.json({ error: result.message, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true });
}
