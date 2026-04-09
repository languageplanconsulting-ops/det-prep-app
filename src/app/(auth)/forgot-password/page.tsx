"use client";

import Link from "next/link";
import { useState } from "react";

import {
  authButtonPrimary,
  authCard,
  authErrorBox,
  authInput,
  authLabel,
} from "@/lib/auth-ui";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk(false);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setErr(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, or ask an admin to save keys under Admin → Supabase.",
      );
      return;
    }
    if (!appUrl) {
      setErr("Set NEXT_PUBLIC_APP_URL in .env.local");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/api/auth/callback?type=recovery`,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOk(true);
  };

  return (
    <div className={authCard}>
      <h1
        className="mb-6 text-center text-2xl font-black text-[#004AAD]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Forgot password / ลืมรหัสผ่าน
      </h1>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {err ? <p className={authErrorBox}>{err}</p> : null}
        {ok ? (
          <p className="border-4 border-black bg-[#FFCC00]/30 px-3 py-2 text-sm text-neutral-900">
            Check your email for a reset link / ตรวจสอบอีเมลของคุณสำหรับลิงก์รีเซ็ต
          </p>
        ) : null}
        <label className="block">
          <span className={authLabel}>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${authInput} font-sans`}
          />
        </label>
        <button type="submit" disabled={busy} className={authButtonPrimary}>
          {busy ? "…" : "Send Reset Link / ส่งลิงก์รีเซ็ต"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-bold text-[#004AAD] underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
