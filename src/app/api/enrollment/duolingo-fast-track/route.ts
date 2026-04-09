import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  grantDuolingoFastTrackVIP,
  normalizeEmail,
} from "@/lib/vip-access";

function sha256utf8(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

function safeEqualString(a: string, b: string): boolean {
  const ba = sha256utf8(a);
  const bb = sha256utf8(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function parseAllowedEmails(): string[] {
  const multi = process.env.DUOLINGO_FAST_TRACK_ALLOWED_EMAILS?.trim();
  if (multi) {
    return multi
      .split(",")
      .map((s) => normalizeEmail(s))
      .filter((e) => e.includes("@"));
  }
  const single = process.env.DUOLINGO_FAST_TRACK_ALLOWED_EMAIL?.trim();
  if (single) return [normalizeEmail(single)];
  return [];
}

export async function POST(request: Request) {
  const secret = process.env.DUOLINGO_FAST_TRACK_PASSCODE?.trim() ?? "";
  const open =
    process.env.DUOLINGO_FAST_TRACK_OPEN_ENROLLMENT === "true" ||
    process.env.DUOLINGO_FAST_TRACK_OPEN_ENROLLMENT === "1";
  const allowed = parseAllowedEmails();

  if (!secret) {
    return NextResponse.json(
      { error: "Enrollment is not available." },
      { status: 503 },
    );
  }

  if (!open && allowed.length === 0) {
    return NextResponse.json(
      { error: "Enrollment is not available." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim() || null : null;
  const passcode = String(body.passcode ?? "");

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!open && !allowed.includes(email)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!safeEqualString(passcode, secret)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await grantDuolingoFastTrackVIP(email, fullName, 6);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Could not complete enrollment. Try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    email,
    expiresAt: result.expiresAt,
    message:
      "You're set as VIP on this email. No separate email is sent — sign in with Google below and the app will show VIP access.",
  });
}
