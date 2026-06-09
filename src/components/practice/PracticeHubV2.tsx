"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * PracticeHubV2 — soft-modern redesign of the practice hub (Cagan + Krug).
 *
 * PHASE 1 (this file): pure presentation. It is rendered ONLY for admins from
 * practice/page.tsx, so live users are unaffected. Every interactive element
 * reuses the SAME handlers / gating that the brutalist hub uses — passed in as
 * props — so no flow logic is duplicated or changed.
 *
 * The outcome hero + sidebar stats render STATIC demo values for now, clearly
 * badged "ตัวอย่าง". Phase 2 swaps these for real mock_fixed_results / pulse-stats
 * data; Phase 3 adds the exam-date field. Nothing here writes data.
 */

type SkillGate = { allowed: boolean } | null;

export type PracticeHubV2Props = {
  effectiveTier: string;
  isVip: boolean;
  isAdmin: boolean;
  showMiniStudy: boolean;
  /** mirror of canAccessSkill(effectiveTier, "conversation") from the page */
  conversationGate: SkillGate;
  onReadingIntro: () => void;
  onDictationIntro: () => void;
  onFitbIntro: () => void;
  onInteractiveSpeakingIntro: () => void;
  onReadWriteIntro: () => void;
};

/* ── small building blocks ───────────────────────────────────────────── */

function DiffPill({
  level,
  children,
}: {
  level: "easy" | "medium" | "hard";
  children: ReactNode;
}) {
  const bg = {
    easy: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-800",
    hard: "bg-rose-100 text-rose-800",
  }[level];
  const dot = {
    easy: "bg-emerald-600",
    medium: "bg-amber-500",
    hard: "bg-rose-600",
  }[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

function ToolRow({
  title,
  sub,
  href,
  onClick,
  locked,
  className = "",
}: {
  title: string;
  sub: string;
  href?: string;
  onClick?: () => void;
  locked?: boolean;
  className?: string;
}) {
  const base =
    "group flex items-center justify-between gap-2 rounded-[10px] border border-black/[0.04] bg-white/70 px-3 py-2.5 text-left transition hover:border-[#004AAD] hover:bg-white hover:translate-x-0.5";
  const inner = (
    <>
      <span className="min-w-0">
        <strong className="block text-sm text-slate-900">{title}</strong>
        <span className="block truncate text-xs text-slate-600">{sub}</span>
      </span>
      {locked ? (
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-rose-600">
          ล็อก
        </span>
      ) : (
        <span className="shrink-0 text-base text-slate-300 transition group-hover:text-[#004AAD]">
          →
        </span>
      )}
    </>
  );
  if (locked) {
    return (
      <div className={`${base} cursor-not-allowed opacity-70 ${className}`}>{inner}</div>
    );
  }
  if (href) {
    return (
      <Link href={href} className={`${base} ${className}`}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} w-full ${className}`}>
      {inner}
    </button>
  );
}

function CoachTip({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00] shadow-[0_3px_8px_rgba(0,74,173,0.18)]">
        D
      </div>
      <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
        {/* speech-tail triangle pointing left toward the avatar */}
        <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
        </span>
        <p className="text-[13px] leading-[1.7] text-slate-800">{children}</p>
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────── */

export function PracticeHubV2({
  showMiniStudy,
  conversationGate,
  onReadingIntro,
  onDictationIntro,
  onFitbIntro,
  onInteractiveSpeakingIntro,
  onReadWriteIntro,
}: PracticeHubV2Props) {
  const conversationLocked = !!conversationGate && !conversationGate.allowed;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Admin / phase banner so it's never mistaken for the live page */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-[#fff7d1] px-3 py-2 text-xs ring-1 ring-[#FFCC00]">
        <span className="rounded bg-[#004AAD] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FFCC00]">
          Admin preview
        </span>
        <span className="font-semibold text-slate-700">
          Practice hub V2 · ผู้ใช้จริงยังเห็นหน้าเดิม · ข้อมูลในแผงคะแนนยังเป็นตัวอย่าง (ต่อข้อมูลจริงใน Phase 2)
        </span>
      </div>

      {/* ── OUTCOME HERO (Cagan: outcome-first) — STATIC demo for Phase 1 ── */}
      <div className="relative mb-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
        <span className="absolute right-3 top-3 rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
          ตัวอย่าง
        </span>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              เส้นทางของคุณ
            </p>
            <div className="mt-2 flex items-end gap-3">
              <div>
                <p className="text-[11px] text-slate-500">คะแนน Mock ล่าสุด</p>
                <p className="text-4xl font-bold leading-none text-[#004AAD]">105</p>
              </div>
              <span className="mb-1 text-2xl text-slate-300">→</span>
              <div>
                <p className="text-[11px] text-slate-500">เป้าหมาย</p>
                <p className="text-4xl font-bold leading-none text-emerald-600">120</p>
              </div>
              <span className="mb-1.5 ml-1 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                อีก 15 คะแนน
              </span>
            </div>
            <div className="relative mt-4 h-2.5 max-w-md rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#004AAD]"
                style={{ width: "65.6%" }}
              />
              <div
                className="absolute -top-1 h-[18px] w-[3px] rounded bg-emerald-600"
                style={{ left: "75%" }}
              />
            </div>
            <div className="mt-1 flex max-w-md justify-between text-[10px] text-slate-400">
              <span>0</span>
              <span className="font-bold text-emerald-600">▲ เป้า 120</span>
              <span>160</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-emerald-600">
              +12 จาก Mock ครั้งก่อน · มาถูกทางแล้ว 📈
            </p>
          </div>
          <div className="rounded-xl bg-[#004AAD] px-6 py-4 text-center text-white sm:min-w-[150px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFCC00]">
              เหลือถึงวันสอบ
            </p>
            <p className="mt-1 text-4xl font-bold leading-none text-[#FFCC00]">23</p>
            <p className="mt-1 text-xs text-white/80">วัน · 3 ก.ค. 2026</p>
          </div>
        </div>
      </div>

      {/* ── Strategy strip (shown once at top) ── */}
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-600">
          เริ่มฝึกจากซ้ายไปขวา · ได้คะแนนเพิ่มเร็วสุด:
        </span>
        <DiffPill level="easy">✍️ Production</DiffPill>
        <span className="text-slate-400">→</span>
        <DiffPill level="easy">📝 Literacy</DiffPill>
        <span className="text-slate-400">→</span>
        <DiffPill level="medium">🎧 Conversation</DiffPill>
        <span className="text-slate-400">→</span>
        <DiffPill level="medium">📖 Reading</DiffPill>
        <span className="text-slate-400">→</span>
        <DiffPill level="hard">📚 Vocabulary</DiffPill>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        {/* ═══════════ LEFT: category sections ═══════════ */}
        <section className="order-2 space-y-5 lg:order-1">
          {/* PRODUCTION */}
          <div className="rounded-2xl bg-violet-50 p-5 ring-1 ring-violet-200">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-violet-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl text-white shadow-sm">
                  ✍️
                </div>
                <div>
                  <h3 className="text-base font-bold text-violet-900">Production</h3>
                  <p className="text-[11px] text-violet-700">
                    การสื่อสาร — เขียน + พูด · ตรวจให้ทันที
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DiffPill level="easy">ง่ายสุด</DiffPill>
                <span className="text-xs font-semibold text-violet-700">
                  5 รูปแบบข้อสอบ
                </span>
              </div>
            </header>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToolRow
                title="📸 Write about photo"
                sub="เขียนบรรยายภาพ · 50 คำ"
                href="/practice/production/write-about-photo"
              />
              <ToolRow
                title="📄 Read, then write"
                sub="อ่านแล้วเขียนสรุป"
                onClick={onReadWriteIntro}
              />
              <ToolRow
                title="🎤 Speak about photo"
                sub="พูดบรรยายภาพ · 30 วินาที"
                href="/practice/production/speak-about-photo"
              />
              <ToolRow
                title="📑 Read, then speak"
                sub="อ่านแล้วพูดด้วยคำของคุณ"
                href="/practice/production/read-and-speak"
              />
              <ToolRow
                title="🗨️ Interactive speaking"
                sub="การสนทนาแบบโต้ตอบ · 6 turn"
                onClick={onInteractiveSpeakingIntro}
                className="sm:col-span-2"
              />
            </div>
            <CoachTip>
              <strong className="text-violet-900">เตรียม script ล่วงหน้าได้</strong> —
              แก้จุดอ่อนได้ตอนนี้เลย จึงเป็นทักษะที่{" "}
              <strong>เพิ่มคะแนนเร็วที่สุด</strong>
            </CoachTip>
          </div>

          {/* LITERACY */}
          <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-amber-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-xl text-white shadow-sm">
                  📝
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-900">Literacy</h3>
                  <p className="text-[11px] text-amber-700">
                    พื้นฐานการเข้าใจและคำศัพท์ · ทำซ้ำได้
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DiffPill level="easy">ง่าย</DiffPill>
                <span className="text-xs font-semibold text-amber-700">
                  3 รูปแบบข้อสอบ
                </span>
              </div>
            </header>
            <div className="grid gap-2 sm:grid-cols-3">
              <ToolRow
                title="🎧 Dictation"
                sub="ฟังแล้วพิมพ์ตาม"
                onClick={onDictationIntro}
              />
              <ToolRow
                title="✏️ Fill in the blank"
                sub="เติมคำที่หาย"
                onClick={onFitbIntro}
              />
              <ToolRow
                title="🔤 Real word"
                sub="แยกคำจริง/ปลอม"
                href="/practice/literacy/real-word"
              />
            </div>
            <CoachTip>
              โดยเฉพาะ <strong>Dictation</strong> — ระวังแค่{" "}
              <strong>-ed, -es, comma</strong> ก็ได้คะแนนเพิ่ม
              {showMiniStudy ? (
                <Link href="/practice/mini-study" className="font-bold text-[#004AAD]">
                  {" "}
                  → มีบทเรียนสั้นแล้ว
                </Link>
              ) : null}
            </CoachTip>
          </div>

          {/* CONVERSATION */}
          <div className="rounded-2xl bg-sky-50 p-5 ring-1 ring-sky-200">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-sky-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-xl text-white shadow-sm">
                  🎧
                </div>
                <div>
                  <h3 className="text-base font-bold text-sky-900">Conversation</h3>
                  <p className="text-[11px] text-sky-700">การฟัง — บทสนทนา + สรุป</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DiffPill level="medium">ปานกลาง</DiffPill>
                <span className="text-xs font-semibold text-sky-700">
                  2 รูปแบบข้อสอบ
                </span>
              </div>
            </header>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToolRow
                title="🎧 Interactive conversation"
                sub="ฟังบทสนทนา · 5 ฉาก"
                href="/practice/listening/interactive"
                locked={conversationLocked}
              />
              <ToolRow
                title="💬 Dialogue → summary"
                sub="ฟังแล้วเขียนสรุป · ตรวจให้ทันที"
                href="/practice/listening/dialogue-summary"
              />
            </div>
            <CoachTip>
              คำศัพท์พื้นฐาน — เน้น{" "}
              <strong>จำ scenario + คำศัพท์ชีวิตในมหาวิทยาลัย</strong>
            </CoachTip>
          </div>

          {/* COMPREHENSION */}
          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-emerald-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white shadow-sm">
                  📖
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">Comprehension</h3>
                  <p className="text-[11px] text-emerald-700">การเข้าใจ — อ่าน + คำศัพท์</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DiffPill level="medium">Reading · ปานกลาง</DiffPill>
                <DiffPill level="hard">Vocab · ยากสุด</DiffPill>
              </div>
            </header>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToolRow
                title="📖 Reading"
                sub="บทอ่าน · 5 รอบ · หา title + MCQ"
                onClick={onReadingIntro}
              />
              <ToolRow
                title="📚 Vocabulary"
                sub="คำศัพท์ในบริบท · เลือกคำให้ตรง"
                href="/practice/comprehension/vocabulary"
              />
            </div>
            <CoachTip>
              <strong>Reading</strong> — เรียนแยก{" "}
              <strong>main idea ↔ specific idea</strong> ให้ได้ก่อน · ส่วน{" "}
              <strong className="text-rose-700">Vocabulary</strong> มี 100,000+ คำ
              ใช้เวลานานสุด แต่ส่งผลต่อทุกทักษะ — เก็บทีละนิดทุกวัน
            </CoachTip>
          </div>

          {/* MINI LESSONS (admin-only for now, mirrors current gating) */}
          {showMiniStudy ? (
            <Link
              href="/practice/mini-study"
              className="block rounded-2xl bg-[#fff7d1] p-5 ring-2 ring-[#FFCC00] transition hover:ring-[#004AAD]"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded bg-[#FFCC00] px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900">
                  ใหม่
                </span>
                <span className="text-[11px] text-slate-600">15 เทคนิค · 15 นาที/บท</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-2 ring-[#FFCC00]">
                  D
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">
                    🎯 บทเรียนสั้นจากพี่ดอย
                  </h3>
                  <p className="mt-1 text-xs text-slate-700">
                    เทคนิคทำคะแนน DET ให้สูงขึ้น · เลือกเทคนิคไหนก็ได้
                  </p>
                </div>
                <span className="rounded-lg bg-[#004AAD] px-4 py-2 text-sm font-bold text-[#FFCC00]">
                  เริ่ม →
                </span>
              </div>
            </Link>
          ) : null}

          {/* Starter + Mock */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/mini-diagnosis/start"
              className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-emerald-500"
            >
              <span className="text-2xl">🩺</span>
              <div>
                <p className="text-sm font-bold">Mini Diagnosis</p>
                <p className="text-xs text-slate-500">เช็คระดับ · 15 นาที · ฟรี</p>
              </div>
            </Link>
            <Link
              href="/mock-test/start"
              className="flex items-center gap-3 rounded-2xl bg-[#004AAD] p-4 text-white transition hover:opacity-90"
            >
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm font-bold">Full Mock Test</p>
                <p className="text-xs text-white/85">สนามจริง · ~45 นาที</p>
              </div>
            </Link>
          </div>
        </section>

        {/* ═══════════ RIGHT SIDEBAR ═══════════ */}
        <aside className="order-1 space-y-4 lg:order-2">
          {/* compact persistent status (demo) */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Mock → เป้า
                </p>
                <p className="text-lg font-bold text-[#004AAD]">
                  105 <span className="text-slate-300">→</span>{" "}
                  <span className="text-emerald-600">120</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  เหลือ
                </p>
                <p className="text-lg font-bold text-[#004AAD]">
                  23 <span className="text-xs font-normal text-slate-500">วัน</span>
                </p>
              </div>
            </div>
          </div>

          {/* streak (demo) */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">🔥 ต่อเนื่อง</span>
              <span className="text-sm font-bold text-amber-600">5 วัน</span>
            </div>
          </div>

          {/* time graph (demo) */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">⏱ เวลาฝึก</p>
              <div className="flex gap-1 text-[10px]">
                <span className="rounded bg-slate-100 px-1.5 py-0.5">วัน</span>
                <span className="rounded bg-[#004AAD] px-1.5 py-0.5 text-white">
                  สัปดาห์
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">เดือน</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">ปี</span>
              </div>
            </div>
            <p className="text-xl font-bold text-[#004AAD]">2 ชม 40 น</p>
            <p className="mb-2 text-[10px] text-slate-500">เฉลี่ย 30 น/วัน</p>
            <svg viewBox="0 0 280 80" className="h-auto w-full">
              <path
                d="M 15 60 L 55 30 L 95 50 L 135 20 L 175 40 L 215 15 L 255 25 L 255 75 L 15 75 Z"
                fill="#004AAD"
                fillOpacity="0.10"
              />
              <path
                d="M 15 60 L 55 30 L 95 50 L 135 20 L 175 40 L 215 15 L 255 25"
                fill="none"
                stroke="#004AAD"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle cx="255" cy="25" r="4" fill="#FFCC00" stroke="#004AAD" strokeWidth="2" />
            </svg>
          </div>

          {/* how-to (3 steps) */}
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <header className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-3">
              <span className="text-xl">📘</span>
              <div>
                <h3 className="text-sm font-bold text-[#004AAD]">
                  วิธีใช้แอปนี้ให้ได้ผลสุด
                </h3>
                <p className="text-[10px] text-slate-500">อ่านครั้งเดียวพอ</p>
              </div>
            </header>
            {[
              {
                t: "🏆 ทำ Mock Test ก่อน",
                d: "ใช้เวลา ~1 ชั่วโมง · ครั้งแรกอาจรู้สึกงง ไม่ต้องห่วง — นี่คือวิธีรู้จุดอ่อนของตัวเอง",
              },
              {
                t: "📊 อ่านรายงานคะแนน",
                d: "ดูว่าจุดแข็ง / จุดอ่อน อยู่ที่ทักษะไหน",
              },
              {
                t: "🎯 ฝึกตามจุดอ่อน",
                d: 'ในแต่ละหมวดพี่ดอยจะบอกว่าควรเน้นอะไร · เริ่มจากหมวดที่ "ง่ายสุด" ก่อน',
              },
            ].map((s, i) => (
              <div key={s.t} className={`flex gap-3 ${i < 2 ? "mb-3" : ""}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-sm font-extrabold text-[#FFCC00]">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{s.t}</p>
                  <p className="mt-1 text-xs leading-6 text-slate-600">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
