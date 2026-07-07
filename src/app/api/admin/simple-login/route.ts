import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_PREVIEW_COOKIE } from "@/lib/admin-preview";
import {
  getAdminLoginCode,
  isValidAdminLoginCode,
  makeSimpleAdminToken,
  SIMPLE_ADMIN_COOKIE,
} from "@/lib/simple-admin";

const cookieOpts = {
  httpOnly: false as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code =
    typeof body === "object" && body && "code" in body
      ? String((body as { code: unknown }).code ?? "").trim()
      : "";

  if (!isValidAdminLoginCode(code)) {
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
  // VIP preview for all practice surfaces (same as a paying VIP learner).
  cookieStore.set(ADMIN_PREVIEW_COOKIE, "vip", cookieOpts);

  return NextResponse.json({
    ok: true,
    token,
    previewTier: "vip",
    /** Hint for clients — actual validation is server-side only. */
    codeConfigured: !!getAdminLoginCode(),
  });
}
