import { NextResponse } from "next/server";

import { COOKIE_SB_ANON, COOKIE_SB_URL } from "@/lib/supabase-public-config";

const MAX_AGE = 60 * 60 * 24 * 365;

const cookieOpts = {
  path: "/",
  maxAge: MAX_AGE,
  sameSite: "lax" as const,
  httpOnly: false,
};

/** Save Supabase public URL + anon key in cookies (readable by browser + middleware). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    url?: unknown;
    anon?: unknown;
  };
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const anon = typeof body.anon === "string" ? body.anon.trim() : "";
  if (!url || !anon) {
    return NextResponse.json(
      { error: "Both url and anon are required." },
      { status: 400 },
    );
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid project URL." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SB_URL, encodeURIComponent(url), cookieOpts);
  res.cookies.set(COOKIE_SB_ANON, encodeURIComponent(anon), cookieOpts);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SB_URL, "", { path: "/", maxAge: 0 });
  res.cookies.set(COOKIE_SB_ANON, "", { path: "/", maxAge: 0 });
  return res;
}
