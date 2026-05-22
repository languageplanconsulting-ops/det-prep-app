"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  authButtonPrimary,
  authCard,
  authErrorBox,
  authInput,
  authLabel,
} from "@/lib/auth-ui";
import { claimBootstrapAdminClient } from "@/lib/claim-bootstrap-admin";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function SignupForm({ redirectTo = "/practice" }: { redirectTo?: string }) {
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
      setErr(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, or ask an admin to save keys under Admin → Supabase.",
      );
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
    <div className={authCard}>
      <h1
        className="mb-6 text-center text-2xl font-black text-[#004AAD]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Create account / สร้างบัญชี
      </h1>
      <p className="mb-5 text-center text-sm text-neutral-600">
        Sign up with your email and password, then start practicing right away. No confirmation email is required.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {err ? <p className={authErrorBox}>{err}</p> : null}
        <label className="block">
          <span className={authLabel}>Full name</span>
          <input
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={`${authInput} font-sans`}
          />
        </label>
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
          <span className={authLabel}>Password (min 8 characters)</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${authInput} font-sans`}
          />
        </label>
        <label className="block">
          <span className={authLabel}>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`${authInput} font-sans`}
          />
        </label>
        <button type="submit" disabled={busy} className={authButtonPrimary}>
          {busy ? "…" : "Create Account / สร้างบัญชี"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-bold text-[#004AAD] underline">
          Already have an account? Sign in
        </Link>
      </p>
    </div>
  );
}
