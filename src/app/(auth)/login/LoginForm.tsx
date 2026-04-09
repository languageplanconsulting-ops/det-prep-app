"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  authButtonPrimary,
  authCard,
  authErrorBox,
  authInput,
  authLabel,
} from "@/lib/auth-ui";
import { claimBootstrapAdminClient } from "@/lib/claim-bootstrap-admin";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
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
      setErr(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, or ask an admin to save keys under Admin → Supabase.",
      );
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setErr("Invalid email or password / อีเมลหรือรหัสผ่านไม่ถูกต้อง");
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
    <div className={authCard}>
      <h1
        className="mb-6 text-center text-2xl font-black text-[#004AAD]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Sign in / เข้าสู่ระบบ
      </h1>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {err ? <p className={authErrorBox}>{err}</p> : null}
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
        <label className="block">
          <span className={authLabel}>Password</span>
          <div className="relative mt-1">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInput} pr-24 font-sans`}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 border-2 border-black bg-neutral-100 px-2 py-1 text-xs font-bold"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <button type="submit" disabled={busy} className={authButtonPrimary}>
          {busy ? "…" : "Sign In / เข้าสู่ระบบ"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-bold text-[#004AAD] underline"
        >
          Forgot password? / ลืมรหัสผ่าน?
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-neutral-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-[#004AAD] underline">
          Sign up / ยังไม่มีบัญชี? สมัครสมาชิก
        </Link>
      </p>

      <div
        id="admin-login"
        className="scroll-mt-24 mt-10 border-t-2 border-neutral-200 pt-8"
      >
        <h2 className="text-center text-sm font-black uppercase tracking-wide text-neutral-500">
          Admin login (code only)
        </h2>
        <p className="mt-2 text-center text-xs text-neutral-500">
          No email or password — enter your admin code to open /admin (subscriptions, uploads, VIP,
          etc.).
        </p>
        <form onSubmit={(e) => void onAdminSubmit(e)} className="mt-4 space-y-3">
          {adminErr ? <p className={authErrorBox}>{adminErr}</p> : null}
          <label className="block">
            <span className={authLabel}>Admin code</span>
            <input
              type="password"
              autoComplete="off"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="Enter code"
              className={`${authInput} mt-1 font-sans`}
            />
          </label>
          <button
            type="submit"
            disabled={adminBusy || !adminCode.trim()}
            className={`${authButtonPrimary} w-full bg-neutral-900`}
          >
            {adminBusy ? "…" : "Open admin / เข้าแอดมิน"}
          </button>
        </form>
      </div>
    </div>
  );
}
