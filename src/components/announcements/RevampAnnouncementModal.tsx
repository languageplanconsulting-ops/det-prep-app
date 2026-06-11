"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * RevampAnnouncementModal — Thai launch announcement for the platform revamp.
 * "Teacher's Note" design: ruled-paper card, highlighter marks, washi tape.
 * Uses the site font (Inter + Thai fallback) — no display font — for consistency.
 *
 * Voice = ENGLISH PLAN TEAM (not the พี่ดอย coach persona) because it references
 * the course / Premium-VIP-adjacent features — per the team-voice rule.
 *
 * ── HOW TO LAUNCH TO EVERYONE (later) ─────────────────────────────────────
 * Flip `SHOW_TO_ALL_USERS` to `true`. Until then it shows only to admins /
 * preview-eligible accounts (so the team can review it live), and real users
 * see nothing. It shows once per user (localStorage-dismissed), and never on
 * the landing / auth pages.
 */
const SHOW_TO_ALL_USERS = false;

const DISMISS_KEY = "revamp-announcement-dismissed-v2";

/** Don't pop on public landing / auth screens. */
const HIDDEN_PATHS = new Set(["/", "/login", "/signup", "/reset-password", "/forgot-password"]);

const EP_BLUE = "#004AAD";

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

export function RevampAnnouncementModal() {
  const pathname = usePathname();
  const { isAdmin, previewEligible, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);

  const eligible = SHOW_TO_ALL_USERS || isAdmin || previewEligible;

  useEffect(() => {
    if (loading) return;
    if (!eligible) return;
    if (HIDDEN_PATHS.has(pathname)) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [loading, eligible, pathname]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

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

        {/* note paper (ruled-paper texture = sanctioned lined-paper exception) */}
        <div
          className="relative overflow-hidden rounded-[10px] shadow-[0_18px_40px_rgba(15,23,42,.28)] ring-1 ring-black/5"
          style={{
            backgroundColor: "#fdfcf6",
            backgroundImage: "repeating-linear-gradient(#fdfcf6 0 30px, #ece7d7 30px 31px)",
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="ปิด"
            className="absolute right-3 top-3 text-lg text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>

          <div className="px-7 pt-8 pb-7">
            {/* header */}
            <p className="text-[13px] font-semibold" style={{ color: EP_BLUE }}>
              ✦ อัปเดตใหม่
            </p>
            <h1 className="mt-1 text-[25px] font-bold leading-snug text-slate-800">
              โฉมใหม่ของ{" "}
              <span
                style={{
                  textDecoration: "underline wavy #FFCC00",
                  textUnderlineOffset: 5,
                  textDecorationThickness: 2,
                }}
              >
                English&nbsp;Plan
              </span>
              <br />
              ใช้ง่ายขึ้นกว่าเดิม
            </h1>
            <p className="mt-2 text-[13.5px] leading-7 text-slate-600">
              จัดเมนูใหม่ให้หาง่าย เห็นความคืบหน้าชัด พร้อม
              <HL>ของใหม่ที่อยากให้ลอง</HL> 🎁
            </p>

            {/* mini-lessons — circled note */}
            <div
              className="relative mt-5 rounded-[10px] border-[2.5px] bg-white/70 p-4 -rotate-[0.5deg]"
              style={{ borderColor: "rgba(0,74,173,.7)" }}
            >
              <span
                className="absolute -top-3 left-4 bg-[#fdfcf6] px-2 text-[12px] font-semibold"
                style={{ color: EP_BLUE }}
              >
                ★ ของใหม่!
              </span>
              <p className="text-[15.5px] font-bold text-slate-800">
                บทเรียนสั้นจากพี่ดอย{" "}
                <span className="text-[12.5px] font-normal text-slate-400">(Mini-Lessons)</span>
              </p>
              <p className="mt-1 text-[13.5px] leading-7 text-slate-700">
                สำหรับ <HL>นักเรียนคอร์ส (Fast Track)</HL> — เทคนิคสั้น ๆ เช่น การใช้ comma, -ed/-s
                ไว้ <b>ทบทวนก่อนสอบ</b>{" "}
                <span className="font-semibold" style={{ color: EP_BLUE }}>
                  ฟรี!
                </span>
              </p>
              <p className="mt-1.5 text-[12.5px] font-medium" style={{ color: EP_BLUE }}>
                📍 หน้า “ฝึก” → การ์ดสีเหลือง “บทเรียนสั้นจากพี่ดอย”
              </p>
            </div>

            {/* other features as ticked notes */}
            <ul className="mt-5 space-y-3.5">
              <li className="flex gap-2.5">
                <span className="text-base font-bold leading-6" style={{ color: EP_BLUE }}>
                  ✓
                </span>
                <p className="text-[13.5px] leading-7 text-slate-700">
                  <b>หน้าใหม่ จัดหมวดชัด</b> — แยกเป็น{" "}
                  <HL>การพูด · การฟัง · การสนทนา · การอ่าน-เขียน</HL>{" "}
                  เห็นคะแนนและเป้าหมายด้านบน เริ่มจากตรงไหนก็รู้ทันที
                </p>
              </li>
              <li className="flex gap-2.5">
                <span className="text-base font-bold leading-6" style={{ color: EP_BLUE }}>
                  ✓
                </span>
                <p className="text-[13.5px] leading-7 text-slate-700">
                  <b>ตรวจให้ทันทีทุกข้อ</b> — ทุกคำตอบได้ฟีดแบ็กทันที: ไวยากรณ์ · คำศัพท์ ·
                  ความลื่นไหล · ตรงโจทย์ พร้อมโน้ตภาษาไทยที่เข้าใจง่าย
                </p>
              </li>
              <li className="flex gap-2.5">
                <span className="text-base font-bold leading-6" style={{ color: EP_BLUE }}>
                  ✓
                </span>
                <p className="text-[13.5px] leading-7 text-slate-700">
                  <b>Mock Test บอกจุดที่ต้องเก็บ</b> — จำลองสอบเต็มรูปแบบ ได้คะแนน 0–160 และ{" "}
                  <HL>บอก 2 ทักษะที่อ่อนสุด</HL> ให้รู้ว่าควรฝึกอะไรต่อ
                </p>
              </li>
            </ul>

            {/* sign off */}
            <div className="mt-6 flex items-end justify-between gap-3">
              <Link
                href="/practice"
                onClick={dismiss}
                className="rounded-[10px] px-6 py-3 text-sm font-bold text-[#FFCC00] shadow-[0_3px_0_rgba(0,40,110,.35)] hover:opacity-95"
                style={{ background: EP_BLUE }}
              >
                เริ่มใช้เลย →
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
