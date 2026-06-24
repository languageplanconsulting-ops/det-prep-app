"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  getNonApiReminderSnapshot,
  type NonApiReminderExam,
} from "@/lib/non-api-practice-usage";

// Admin-only redesign: calm "Clarity Pro / Show the value" style.
// Lock logic is IDENTICAL to FreeQuotaLockedLink — only the modal visual differs.

const VALUE_BULLETS: { th: string; en: string }[] = [
  { th: "ฝึกไม่จำกัดจำนวนครั้ง", en: "Unlimited practice sets" },
  { th: "ฟีดแบ็กละเอียดทุกคำตอบ", en: "Detailed per-answer feedback" },
  { th: "Mock Test เต็มรูปแบบ", en: "Full-length mock tests" },
];

// Real student testimonial (matches the landing page social proof).
const REVIEW = {
  quote:
    "ตอนแรกกังวลเรื่อง Writing กับ Speaking มาก ไม่รู้จะแก้ตรงไหน พอได้ฟีดแบ็กที่บอกตรง ๆ ว่าต้องปรับอะไร ก็มั่นใจขึ้นเยอะ",
  name: "พิมพ์",
  initial: "พ",
  delta: "95 → 115",
};

// Blurred "locked preview" set thumbnails — purely decorative
const PREVIEW_LABELS = [
  "Practice Set 4",
  "Practice Set 5",
  "Practice Set 6",
  "Practice Set 7",
];

export function AdminFreeQuotaLockedLink({
  href,
  exam,
  className,
  children,
}: {
  href: string;
  exam: NonApiReminderExam;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { effectiveTier, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);

  // ── IDENTICAL lock logic ──────────────────────────────────────────────────
  const snapshot = useMemo(() => {
    if (loading || effectiveTier !== "free") return null;
    return getNonApiReminderSnapshot(exam, effectiveTier);
  }, [effectiveTier, exam, loading]);

  const isLocked = snapshot != null && snapshot.remaining <= 0;

  const onOpen = () => {
    if (loading) return;
    if (isLocked) {
      setOpen(true);
      return;
    }
    router.push(href);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const examLabel = snapshot?.examLabel ?? "แบบฝึกนี้";

  return (
    <>
      {/* Trigger button — IDENTICAL to FreeQuotaLockedLink */}
      <button
        type="button"
        onClick={onOpen}
        disabled={loading}
        className={className}
      >
        {children}
      </button>

      {open ? (
        /* ── Calm Clarity Pro modal overlay ─────────────────────────────── */
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 px-4 pb-6 pt-8 sm:items-center sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-free-lock-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">

            {/* ── Header band ─────────────────────────────────────────── */}
            <div className="bg-[#004AAD] px-6 pb-5 pt-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFCC00]/80">
                สิทธิ์ทดลองใช้ฟรี
              </p>
              <h2
                id="admin-free-lock-title"
                className="mt-1 text-xl font-bold leading-snug text-white"
              >
                คุณใช้สิทธิ์ลองฟรีของ{" "}
                <span className="text-[#FFCC00]">{examLabel}</span> ครบแล้ว
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Free quota reached for {examLabel}
              </p>
            </div>

            {/* ── Body ────────────────────────────────────────────────── */}
            <div className="space-y-5 px-6 py-5">

              {/* Value unlock list */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#004AAD]">
                  สิ่งที่คุณจะปลดล็อก
                </p>
                <ul className="mt-3 space-y-2">
                  {VALUE_BULLETS.map((b) => (
                    <li key={b.en} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFCC00] text-[10px] font-black text-[#004AAD]"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span className="text-sm leading-snug text-neutral-800">
                        {b.th}
                        <span className="ml-1 text-xs text-neutral-400">
                          {b.en}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Blurred locked peek */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  เซ็ตที่รอคุณอยู่
                </p>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {PREVIEW_LABELS.map((label) => (
                    <div
                      key={label}
                      className="relative flex h-14 items-center justify-center overflow-hidden rounded-xl bg-[#eef5ff]"
                      aria-hidden="true"
                    >
                      {/* blurred fake content */}
                      <span className="select-none text-[10px] font-bold text-[#004AAD]/40 blur-[3px]">
                        {label}
                      </span>
                      {/* lock icon overlay */}
                      <span className="absolute inset-0 flex items-center justify-center text-base">
                        🔒
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real student testimonial */}
              <blockquote className="rounded-2xl bg-[#fffbe6] px-4 py-3">
                <div className="mb-1.5 text-sm tracking-wide text-[#FFCC00]">
                  ★★★★★
                </div>
                <p className="text-sm font-medium leading-relaxed text-neutral-800">
                  &ldquo;{REVIEW.quote}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#004AAD]/10 text-xs font-bold text-[#004AAD]">
                    {REVIEW.initial}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-neutral-800">
                      {REVIEW.name}
                    </div>
                    <div className="font-mono text-xs text-neutral-400">
                      {REVIEW.delta}
                    </div>
                  </div>
                </div>
              </blockquote>
            </div>

            {/* ── CTAs ─────────────────────────────────────────────────── */}
            <div className="border-t border-neutral-100 px-6 pb-6 pt-4">
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="w-full rounded-2xl bg-[#004AAD] px-5 py-3.5 text-sm font-bold tracking-wide text-white shadow-md transition-opacity hover:opacity-90 active:opacity-80"
              >
                ดูแพ็กเกจ
                <span className="ml-1.5 text-xs font-normal text-white/70">
                  Explore packages
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
              >
                ไว้ก่อน
                <span className="ml-1.5 text-xs">Not now</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
