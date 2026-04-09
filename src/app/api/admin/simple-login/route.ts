import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminLoginCode, makeSimpleAdminToken, SIMPLE_ADMIN_COOKIE } from "@/lib/simple-admin";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code = typeof body === "object" && body && "code" in body ? String((body as { code: unknown }).code ?? "").trim() : "";

  if (!code || code !== getAdminLoginCode()) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const token = await makeSimpleAdminToken();
  const cookieStore = await cookies();
  cookieStore.set(SIMPLE_ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
