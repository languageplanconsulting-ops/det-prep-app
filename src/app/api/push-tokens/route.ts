import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";

/** POST /api/push-tokens — register/refresh this device's Expo push token. */
export async function POST(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const o = (body ?? {}) as Record<string, unknown>;
  const expoPushToken = o.expoPushToken;
  const platform = typeof o.platform === "string" ? o.platform : "unknown";
  if (typeof expoPushToken !== "string" || !expoPushToken.startsWith("ExponentPushToken")) {
    return NextResponse.json({ error: "expoPushToken invalid" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { user_id: user.id, expo_push_token: expoPushToken, platform, updated_at: new Date().toISOString() },
      { onConflict: "expo_push_token" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
