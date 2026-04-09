import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { grantVIPOnSignup } from "@/lib/vip-access";

export async function POST() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await grantVIPOnSignup(user.id, user.email);

  return NextResponse.json({ ok: true });
}
