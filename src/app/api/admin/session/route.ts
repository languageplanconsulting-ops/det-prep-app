import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";

/** Tells the client whether admin preview mode is allowed (profile admin or simple code cookie). */
export async function GET() {
  const auth = await getAdminAccess();
  return NextResponse.json({ previewEligible: auth.ok });
}
