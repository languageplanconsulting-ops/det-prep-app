"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { AI_MONTHLY_LIMIT } from "@/lib/access-control";

/**
 * JulyAnnouncementModal — Thai "what's new this month" popup, shown once per user on login.
 * Same "Teacher's Note" design as RevampAnnouncementModal (kept on disk, unmounted, for
 * rollback) plus a one-shot confetti burst. Bump DISMISS_KEY's version suffix to re-show this
 * (or a future month's) announcement to users who already dismissed an earlier one.
 */
const DISMISS_KEY = "july-announcement-dismissed-v1";

/** Don't pop on public landing / auth screens. */
const HIDDEN_PATHS = new Set(["/", "/login", "/signup", "/reset-password", "/forgot-password"]);

const EP_BLUE = "#004AAD";
const CONFETTI_COLORS = ["#FFCC00", "#004AAD", "#22c55e", "#f97316", "#ec4899"];

function HL({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        background: "#FFE173",
        borderRadius: 2,
        padding: "0 .12em",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${Math.round((i / 18) * 100 + (i % 3) * 2 - 2)}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${(i % 6) * 0.05}s`,
        drift: `${((i % 5) - 2) * 14}px`,
        rotate: i % 2 === 0 ? "2px" : "9999px",
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-2 h-0 overflow-visible" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="ep-confetti-piece"
          style={{
            left: p.left,
            background: p.color,
            animationDelay: p.delay,
            borderRadius: p.rotate,
            ["--ep-confetti-drift" as string]: p.drift,
          }}
        />
      ))}
    </div>
  );
}

export function JulyAnnouncementModal() {
  const pathname = usePathname();
  const { effectiveTier, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (HIDDEN_PATHS.has(pathname)) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [loading, pathname]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const feedbackLimit =
    effectiveTier === "basic" || effectiveTier === "premium" || effectiveTier === "vip"
      ? AI_MONTHLY_LIMIT[effectiveTier]
      : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* washi tape */}
        <div
          className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 rounded-[2px]"
          style={{ background: "rgba(255,204,0,.55)", boxShadow: "0 1px 2px rgba(0,0,0,.08)" }}
          aria-hidden
        />

        <ConfettiBurst />

        {/* note paper — capped + internally scrollable so the close/CTA controls never fall
            off-screen on short viewports (this announcement has more content than the last). */}
        <div
          className="ep-announce-pop-in relative flex max-h-[85vh] flex-col overflow-hidden rounded-[10px] shadow-[0_18px_40px_rgba(15,23,42,.28)] ring-1 ring-black/5"
          style={{
            backgroundColor: "#fdfcf6",
            backgroundImage: "repeating-linear-gradient(#fdfcf6 0 30px, #ece7d7 30px 31px)",
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="ปิด"
            className="absolute right-3 top-3 z-10 text-lg text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>

          <div className="overflow-y-auto px-7 pt-8 pb-7">
            {/* header */}
            <p className="text-[13px] font-semibold" style={{ color: EP_BLUE }}>
              ✦ อัปเดตเดือนกรกฎาคม
            </p>
            <h1 className="mt-1 text-[25px] font-bold leading-snug text-slate-800">
              ของขวัญเดือนนี้จาก{" "}
              <span
                style={{
                  textDecoration: "underline wavy #FFCC00",
                  textUnderlineOffset: 5,
                  textDecorationThickness: 2,
                }}
              >
                English&nbsp;Plan
              </span>{" "}
              🎉
            </h1>
            <p className="mt-2 text-[13.5px] leading-7 text-slate-600">
              อัปเดตใหม่หลายอย่างเพื่อให้ทุกคน <HL>ฝึกได้ตรงจุดขึ้น</HL> ตั้งแต่พื้นฐานจนถึงวันสอบจริง
            </p>

            {/* lessons — circled note, the headline feature */}
            <div
              className="relative mt-5 rounded-[10px] border-[2.5px] bg-white/70 p-4 -rotate-[0.5deg]"
              style={{ borderColor: "rgba(0,74,173,.7)" }}
            >
              <span
                className="absolute -top-3 left-4 bg-[#fdfcf6] px-2 text-[12px] font-semibold"
                style={{ color: EP_BLUE }}
              >
                ★ ใหม่!
              </span>
              <p className="text-[15.5px] font-bold text-slate-800">
                บทเรียนสำหรับคนพื้นฐานน้อย{" "}
                <span className="text-[12.5px] font-normal text-slate-400">(ก่อนลงสนามจริง)</span>
              </p>
              <p className="mt-1 text-[13.5px] leading-7 text-slate-700">
                ยังไม่มั่นใจพื้นฐาน? ลองบทเรียนสั้น ๆ 6 หมวดก่อนไปลุยข้อสอบจริง —{" "}
                <HL>ตามคำบอก, ทักษะการอ่าน, การเขียน, การพูด, คำจริง, คำศัพท์มหาวิทยาลัย</HL>
              </p>
              <Link
                href="/study-plan"
                onClick={dismiss}
                className="mt-1.5 inline-block text-[12.5px] font-semibold underline"
                style={{ color: EP_BLUE }}
              >
                📍 กดดูบทเรียนทั้งหมด →
              </Link>
            </div>

            {/* other features as ticked notes */}
            <ul className="mt-5 space-y-3.5">
              <li className="flex gap-2.5">
                <span className="text-base font-bold leading-6" style={{ color: EP_BLUE }}>
                  ✓
                </span>
                <p className="text-[13.5px] leading-7 text-slate-700">
                  <b>แผนการเรียนอัจฉริยะ</b> — บอกเราว่าวันนี้มีเวลากี่นาที ระบบจะ{" "}
                  <HL>เลือกข้อสอบหรือบทเรียนให้เหมาะกับเวลาที่มี</HL> ทันที
                </p>
              </li>
              <li className="flex gap-2.5">
                <span className="text-base font-bold leading-6" style={{ color: EP_BLUE }}>
                  ✓
                </span>
                <p className="text-[13.5px] leading-7 text-slate-700">
                  <b>ฝึก &ldquo;คำจริง&rdquo; แบบใหม่</b> — ดูคำแล้วตัดสินว่าสะกดถูกไหม ถ้าตอบผิด{" "}
                  <HL>ฝึกแก้คำนั้นให้ถูกทันที</HL> จำได้แม่นกว่าเดิม
                </p>
              </li>
              {feedbackLimit ? (
                <li className="flex gap-2.5">
                  <span className="text-base font-bold leading-6" style={{ color: EP_BLUE }}>
                    ✓
                  </span>
                  <p className="text-[13.5px] leading-7 text-slate-700">
                    <b>ฟีดแบ็กเพิ่มขึ้นเป็น {feedbackLimit} ครั้ง/เดือน</b> —{" "}
                    <HL>ไม่มีลิมิตรายสัปดาห์แล้ว</HL> ใช้เมื่อไหร่ก็ได้ตลอดทั้งเดือนตามแพ็กเกจของคุณ
                  </p>
                </li>
              ) : null}
              <li className="flex gap-2.5">
                <span className="text-base font-bold leading-6" style={{ color: EP_BLUE }}>
                  ✓
                </span>
                <p className="text-[13.5px] leading-7 text-slate-700">
                  <b>ไม่ต้องเลือกรอบเองก็ได้</b> — หน้า Dictation และ Fill in the blank กดปุ่ม{" "}
                  <HL>&ldquo;ทำข้อสอบที่เราเลือกให้เลย&rdquo;</HL> ได้เลย ฝึกไวขึ้น ไม่ต้องเสียเวลาเลือก
                </p>
              </li>
              <li className="flex gap-2.5">
                <span className="text-base font-bold leading-6" style={{ color: EP_BLUE }}>
                  ✓
                </span>
                <p className="text-[13.5px] leading-7 text-slate-700">
                  <b>เกมจับคู่คำศัพท์</b> — ในสมุดคำศัพท์ตอนนี้มีโหมด{" "}
                  <HL>&ldquo;🧩 เกมจับคู่&rdquo;</HL> ช่วยให้จำคำศัพท์ที่บันทึกไว้ได้แม่นขึ้น
                </p>
              </li>
            </ul>

            {/* sign off */}
            <div className="mt-6 flex items-end justify-between gap-3">
              <Link
                href="/study-plan"
                onClick={dismiss}
                className="rounded-[10px] px-6 py-3 text-sm font-bold text-[#FFCC00] shadow-[0_3px_0_rgba(0,40,110,.35)] hover:opacity-95"
                style={{ background: EP_BLUE }}
              >
                ไปดูเลย →
              </Link>
              <div className="text-right">
                <p className="text-[13.5px] font-semibold text-slate-700">— ENGLISH PLAN TEAM</p>
                <p className="text-[11px] text-slate-400">ขอบคุณที่อยู่กับเรา 💙</p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 text-[12.5px] text-slate-400 hover:text-slate-600"
            >
              ไว้ก่อน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
