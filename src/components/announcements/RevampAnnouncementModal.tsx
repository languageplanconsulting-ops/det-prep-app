"use client";

import { useEffect, useState } from "react";

/**
 * RevampAnnouncementModal — Thai launch announcement for the platform revamp.
 *
 * NOT shown to users yet. Currently rendered only inside the admin-gated
 * PracticeHubV2 so the team can review it in context. When the revamp is
 * approved for everyone, render this at a global level (e.g. app layout) and it
 * will show once per user (localStorage-dismissed).
 *
 * Voice = ENGLISH PLAN TEAM (not the พี่ดอย coach persona) because it references
 * Premium/VIP — per the rule that sales-adjacent copy uses the team voice.
 */

const DISMISS_KEY = "revamp-announcement-dismissed-v1";

export function RevampAnnouncementModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative bg-[#004AAD] px-6 py-5">
          <button
            type="button"
            onClick={dismiss}
            aria-label="ปิด"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm text-white hover:bg-white/25"
          >
            ✕
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFCC00] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#004AAD]">
            ✨ อัปเดตใหม่
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-snug text-white">
            เราปรับโฉมแพลตฟอร์มใหม่
            <br />
            ใช้ง่ายขึ้นกว่าเดิม
          </h1>
          <p className="mt-1.5 text-sm text-white/80">
            จัดเมนูใหม่ให้หาง่าย เห็นความคืบหน้าชัด พร้อมของใหม่ 2 อย่าง 🎁
          </p>
        </div>

        {/* body */}
        <div className="space-y-3 px-6 py-5">
          <div className="flex gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl">
              🗂️
            </div>
            <div>
              <p className="text-sm font-bold">หน้าใหม่ ใช้ง่ายขึ้น</p>
              <p className="text-[13px] leading-6 text-slate-600">
                จัดข้อสอบเป็นหมวด{" "}
                <strong>Production · Comprehension · Conversation · Literacy</strong> ·
                เห็นคะแนนและเป้าหมายด้านบน เริ่มจากตรงไหนก็รู้ทันที
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl bg-[#fff7d1] p-3.5 ring-1 ring-[#FFCC00]/60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFCC00] text-xl">
              🎁
            </div>
            <div>
              <p className="text-sm font-bold">บทเรียนสั้นฟรี (Mini-Lessons)</p>
              <p className="text-[13px] leading-6 text-slate-700">
                สำหรับ <strong>นักเรียนในคอร์ส</strong> — เทคนิคสั้นๆ ไว้ทบทวนก่อนสอบ ฟรี!
              </p>
              <p className="mt-1 text-[12px] font-semibold text-[#004AAD]">
                📍 หาได้ที่: หน้า &ldquo;ฝึก&rdquo; → การ์ดสีเหลือง &ldquo;บทเรียนสั้นจากพี่ดอย&rdquo;
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl">
              ⭐
            </div>
            <div>
              <p className="text-sm font-bold">
                เคล็ดลับทำคะแนนแต่ละข้อสอบ{" "}
                <span className="align-middle rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                  Premium / VIP
                </span>
              </p>
              <p className="text-[13px] leading-6 text-slate-600">
                ผู้ใช้ <strong>Premium และ VIP</strong> จะเห็นเคล็ดลับทำคะแนนให้สูงขึ้นในข้อสอบแต่ละแบบ
              </p>
              <p className="mt-1 text-[12px] font-semibold text-[#004AAD]">
                📍 ดูได้ในแต่ละข้อสอบ ก่อนกดเริ่มทำ
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 p-3.5">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              เริ่มยังไง?
            </p>
            <p className="text-[13px] leading-6 text-slate-700">
              1) ทำ <strong>Mock Test</strong> 1 ครั้งเพื่อรู้คะแนนเริ่มต้น · 2) ดูว่าทักษะไหนต้องเก็บ ·
              3) ฝึกในหมวดนั้น + ดูบทเรียนสั้น
            </p>
          </div>
        </div>

        {/* footer */}
        <div className="px-6 pb-5">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] hover:opacity-90"
            >
              เริ่มใช้เลย →
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              ไว้ก่อน
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            จาก <strong className="text-slate-500">ENGLISH PLAN TEAM</strong> · ขอบคุณที่อยู่กับเรา 💙
          </p>
        </div>
      </div>
    </div>
  );
}
