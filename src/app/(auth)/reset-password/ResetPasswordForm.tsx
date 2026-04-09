"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
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
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setErr("Supabase is not configured.");
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setReady(true);
        }
      },
    );
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
    })();
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

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
      setErr("Supabase is not configured.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={authCard}>
      <h1
        className="mb-6 text-center text-2xl font-black text-[#004AAD]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Reset password / รีเซ็ตรหัสผ่าน
      </h1>
      {!ready ? (
        <p className="text-sm text-neutral-600">
          Open the link from your email on this device. If you already did, wait a moment…
        </p>
      ) : null}
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {err ? <p className={authErrorBox}>{err}</p> : null}
        <label className="block">
          <span className={authLabel}>New password</span>
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
          <span className={authLabel}>Confirm new password</span>
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
        <button
          type="submit"
          disabled={busy || !ready}
          className={authButtonPrimary}
        >
          {busy ? "…" : "Reset Password / รีเซ็ตรหัสผ่าน"}
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
