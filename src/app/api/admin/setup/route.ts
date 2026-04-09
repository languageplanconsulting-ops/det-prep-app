import { NextResponse } from "next/server";

import { BOOTSTRAP_ADMIN_EMAIL } from "@/lib/admin-emails";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/vip-access";

/**
 * One-time admin bootstrap: set role = admin for the fixed email if the auth user exists.
 * Requires header x-setup-secret matching ADMIN_SETUP_SECRET in .env
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-setup-secret");
  if (!process.env.ADMIN_SETUP_SECRET || secret !== process.env.ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleSupabase();
  const norm = normalizeEmail(BOOTSTRAP_ADMIN_EMAIL);

  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listErr) {
    return NextResponse.json(
      { error: listErr.message },
      { status: 500 },
    );
  }

  const authUser = list.users.find(
    (u) => u.email && normalizeEmail(u.email) === norm,
  );

  if (!authUser) {
    return NextResponse.json(
      {
        error:
          "No Supabase Auth user with this email yet. Sign up first, then call again.",
      },
      { status: 400 },
    );
  }

  const { error: upsertErr } = await admin.from("profiles").upsert(
    {
      id: authUser.id,
      email: norm,
      full_name:
        (authUser.user_metadata?.full_name as string | undefined) ?? null,
      role: "admin",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: authUser.id });
}
