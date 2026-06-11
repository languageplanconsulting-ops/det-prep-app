"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { claimBootstrapAdminClient } from "@/lib/claim-bootstrap-admin";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// ── component ─────────────────────────────────────────────────────────────────

export function AdminSignupForm({ redirectTo = "/practice" }: { redirectTo?: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setErr("ระบบขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง");
      return;
    }
    setBusy(true);
    const normalizedEmail = email.trim().toLowerCase();
    const signupRes = await fetch("/api/auth/signup-direct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        fullName,
      }),
    });

    if (!signupRes.ok) {
      const payload = (await signupRes.json().catch(() => ({}))) as { error?: string };
      setBusy(false);
      setErr(payload.error ?? "Could not create account.");
      return;
    }

    const signInResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
      setBusy(false);
      setErr(
        signInResult.error?.message ??
          "Your account was created, but automatic sign-in failed. Please try signing in now.",
      );
      return;
    }

    await claimBootstrapAdminClient(supabase);
    await fetch("/api/auth/sync-admin-role", {
      method: "POST",
      credentials: "same-origin",
    });
    setBusy(false);
    const next = redirectTo.startsWith("/") ? redirectTo : "/practice";
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-md px-8 py-10">

        {/* Brand mark */}
        <div className="mb-2 flex justify-center">
          <span className="inline-block rounded-full bg-[#004AAD]/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-[#004AAD] uppercase">
            ExamPrepTH
          </span>
        </div>

        <h1 className="mb-2 text-center text-2xl font-black text-[#004AAD] font-sans">
          Create account / สร้างบัญชี
        </h1>
        <p className="mb-3 text-center text-sm text-neutral-500">
          Sign up with your email and password, then start practicing right away. No confirmation email is required.
        </p>

        {/* Value strip */}
        <div className="mb-7 flex items-center justify-center gap-1.5 rounded-xl bg-[#FFCC00]/20 px-4 py-2.5">
          <span className="text-xs font-semibold text-neutral-700">
            สมัครฟรี · ไม่ต้องใส่บัตร · เริ่มเช็กระดับได้ทันที
          </span>
        </div>

        {/* Signup form */}
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {err}
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-600 font-sans">
              Full name
            </label>
            <input
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-gray-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#004AAD] focus:bg-white focus:ring-2 focus:ring-[#004AAD]/20 font-sans"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-600 font-sans">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-gray-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#004AAD] focus:bg-white focus:ring-2 focus:ring-[#004AAD]/20 font-sans"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-600 font-sans">
              Password{" "}
              <span className="normal-case font-normal text-neutral-400">(min 8 characters)</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-gray-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#004AAD] focus:bg-white focus:ring-2 focus:ring-[#004AAD]/20 font-sans"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-600 font-sans">
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-gray-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#004AAD] focus:bg-white focus:ring-2 focus:ring-[#004AAD]/20 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#003a8a] disabled:opacity-50 font-sans"
          >
            {busy ? "กำลังสร้างบัญชี…" : "Create Account / สร้างบัญชี"}
          </button>
        </form>

        {/* Switch to login */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#004AAD] hover:underline">
            Sign in / เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
