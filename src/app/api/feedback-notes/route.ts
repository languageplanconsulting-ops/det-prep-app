import { NextResponse } from "next/server";

import { submitProductFeedback } from "@/lib/product-feedback";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

type Body = {
  promptKey?: string;
  response?: string;
  pagePath?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.response?.trim()) {
    return NextResponse.json({ error: "Response cannot be empty." }, { status: 400 });
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

  const result = await submitProductFeedback({
    userId,
    promptKey: body.promptKey ?? "",
    response: body.response ?? "",
    pagePath: body.pagePath ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
