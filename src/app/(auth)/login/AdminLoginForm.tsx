"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { claimBootstrapAdminClient } from "@/lib/claim-bootstrap-admin";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// ── helpers (same logic as LoginForm) ────────────────────────────────────────

function formatLoginError(message: string): string {
  const raw = message.trim();
  const lower = raw.toLowerCase();
  if (lower.includes("email not confirmed")) {
    return "This account is stuck in an old confirmation state. Please try signing up again or contact support. / บัญชีนี้ค้างอยู่ในสถานะยืนยันอีเมลแบบเก่า กรุณาลองสมัครใหม่อีกครั้งหรือติดต่อทีมงาน";
  }
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password / อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (lower.includes("too many requests")) {
    return "Too many attempts. Please wait and try again. / ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  return raw;
}

// ── component ─────────────────────────────────────────────────────────────────

export function AdminLoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminErr, setAdminErr] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const go = () => {
      if (window.location.hash !== "#admin-login") return;
      document.getElementById("admin-login")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setErr("ระบบขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setBusy(false);
      setErr(formatLoginError(error.message));
      return;
    }
    const registerRes = await fetch("/api/auth/register-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({}),
    });
    if (!registerRes.ok) {
      const j = (await registerRes.json().catch(() => ({}))) as { error?: string };
      setBusy(false);
      setErr(j.error ?? "Could not create your profile after login.");
      return;
    }
    await claimBootstrapAdminClient(supabase);
    await fetch("/api/auth/sync-admin-role", {
      method: "POST",
      credentials: "same-origin",
    });
    setBusy(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("ep-show-login-welcome", "1");
    }
    const next = redirectTo.startsWith("/") ? redirectTo : "/practice";
    router.push(next);
    router.refresh();
  };

  const onAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErr("");
    setAdminBusy(true);
    try {
      const res = await fetch("/api/admin/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminCode.trim() }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setAdminErr(data.error || "Wrong code");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setAdminBusy(false);
    }
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
          Sign in / เข้าสู่ระบบ
        </h1>
        <p className="mb-7 text-center text-sm text-neutral-500">
          ใช้อีเมลและรหัสผ่านเดิมที่สมัครไว้ · No confirmation step needed
        </p>

        {/* Main login form */}
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {err}
            </div>
          ) : null}

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
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-gray-50 px-4 py-3 pr-20 text-sm text-neutral-900 outline-none transition focus:border-[#004AAD] focus:bg-white focus:ring-2 focus:ring-[#004AAD]/20 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500 hover:text-[#004AAD] transition"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#003a8a] disabled:opacity-50 font-sans"
          >
            {busy ? "กำลังเข้าสู่ระบบ…" : "Sign In / เข้าสู่ระบบ"}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 space-y-3 text-center text-sm">
          <p>
            <Link
              href="/forgot-password"
              className="font-semibold text-[#004AAD] hover:underline"
            >
              Forgot password? / ลืมรหัสผ่าน?
            </Link>
          </p>
          <p className="text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#004AAD] hover:underline">
              Sign up / สมัครสมาชิก
            </Link>
          </p>
        </div>

        {/* Admin code section */}
        <div
          id="admin-login"
          className="scroll-mt-24 mt-10 rounded-2xl border border-neutral-100 bg-gray-50 px-6 py-6"
        >
          <h2 className="mb-1 text-center text-xs font-black uppercase tracking-widest text-neutral-400">
            Admin login (code only)
          </h2>
          <p className="mb-4 text-center text-xs text-neutral-400">
            No email or password — enter your admin code to open /admin (subscriptions, uploads, VIP, etc.).
          </p>

          <form onSubmit={(e) => void onAdminSubmit(e)} className="space-y-4">
            {adminErr ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {adminErr}
              </div>
            ) : null}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 font-sans">
                Admin code
              </label>
              <input
                type="password"
                autoComplete="off"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter code"
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20 font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={adminBusy || !adminCode.trim()}
              className="w-full rounded-xl bg-neutral-800 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-neutral-900 disabled:opacity-40 font-sans"
            >
              {adminBusy ? "…" : "Open admin / เข้าแอดมิน"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
