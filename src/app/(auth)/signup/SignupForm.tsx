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

function appOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function SignupForm({ redirectTo = "/practice" }: { redirectTo?: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setInfo("");
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
    const origin = appOrigin();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: origin
          ? `${origin}/api/auth/callback`
          : undefined,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    let hasSession = Boolean(data.session && data.user);

    if (!hasSession && data.user) {
      const signInFallback = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (!signInFallback.error && signInFallback.data.session && signInFallback.data.user) {
        hasSession = true;
      }
    }

    if (hasSession) {
      const res = await fetch("/api/auth/register-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fullName }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setBusy(false);
        setErr(j.error ?? "Could not create profile.");
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
      return;
    }
    setBusy(false);
    setInfo(
      "Your account was created, but this workspace did not start your session automatically. Try signing in now. If the next screen says your email is not confirmed, Supabase email confirmation is still turned on.",
    );
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
        Sign up with your email and password, then start practicing right away.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {err ? <p className={authErrorBox}>{err}</p> : null}
        {info ? (
          <p className="border-4 border-black bg-[#FFCC00]/30 px-3 py-2 text-sm text-neutral-900">
            {info}
          </p>
        ) : null}
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
