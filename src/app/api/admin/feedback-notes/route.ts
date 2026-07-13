import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { listRecentProductFeedback } from "@/lib/product-feedback";

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await listRecentProductFeedback();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load feedback notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
