"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";

const DISMISS_KEY = "ep-vip-pretest-nudge-dismissed";
const WELCOME_KEY = "ep-show-login-welcome";
const EP_BLUE = "#004AAD";

/**
 * Pops once per browser session for signed-in VIP members who have never finished the
 * mini diagnosis (pretest), nudging them to take it so their study plan is personalised.
 */
export function VipPretestNudgeModal() {
  const pathname = usePathname();
  const { effectiveTier, isAuthenticated, isAdmin, isPreviewMode, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);

  const eligible =
    !loading && isAuthenticated && effectiveTier === "vip" && !isAdmin && !isPreviewMode;
  const hidden =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mini-diagnosis") ||
    pathname.startsWith("/mock-test");

  useEffect(() => {
    if (!eligible || hidden || open) return;
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") return;
      // Let the login welcome modal go first; we show on a later navigation.
      if (window.sessionStorage.getItem(WELCOME_KEY) === "1") return;
    } catch {
      /* storage blocked: still show once per mount */
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/mini-diagnosis/status", { credentials: "same-origin" });
        const data = (await res.json()) as { completed?: boolean | null };
        if (!cancelled && data.completed === false) setOpen(true);
      } catch {
        /* never block the app on this */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, hidden, open, pathname]);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-pretest-title"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#FFF3D6] px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            สมาชิก VIP · VIP member
          </p>
          <h2 id="vip-pretest-title" className="mt-1 text-2xl font-bold leading-snug text-slate-900">
            คุณยังไม่ได้ทำ Pretest
          </h2>
          <p className="text-sm font-semibold text-slate-700">You haven&apos;t taken your pretest yet</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-7 text-slate-600">
            ทำ Mini Diagnosis ประมาณ 15–17 นาที เพื่อให้เรารู้ระดับและจุดอ่อนของคุณ แล้วจัดแผนเตรียมสอบที่เหมาะกับคุณ
            <span className="block text-slate-500">
              Take the ~15–17 min diagnosis so we can find your level and weak spots and build a plan that fits you.
            </span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/mini-diagnosis/start"
              onClick={dismiss}
              className="flex-1 rounded-2xl px-4 py-3 text-center text-sm font-bold text-white"
              style={{ background: EP_BLUE }}
            >
              เริ่มทำ Pretest เลย / Start my pretest
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              ไว้ก่อน / Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
