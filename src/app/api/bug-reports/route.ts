import { NextResponse } from "next/server";

import { submitBugReport } from "@/lib/bug-reports";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

type Body = {
  email?: string;
  line?: string;
  name?: string;
  pageUrl?: string;
  subject?: string;
  details?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const result = await submitBugReport({
    userId,
    reporterEmail: body.email ?? "",
    reporterLine: body.line ?? "",
    reporterName: body.name ?? null,
    pageUrl: body.pageUrl ?? null,
    subject: body.subject ?? "",
    details: body.details ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
