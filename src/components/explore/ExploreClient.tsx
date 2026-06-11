"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function cx(...p: (string | false | undefined)[]) {
  return p.filter(Boolean).join(" ");
}

type Group = {
  title: string;
  th: string;
  icon: string;
  cardBg: string;
  tileTint: string;
  lanes: { icon: string; name: string }[];
};

const GROUPS: Group[] = [
  {
    title: "Production",
    th: "เขียน–พูด",
    icon: "✍️",
    cardBg: "bg-[#f4f8ff]",
    tileTint: "hover:border-ep-blue/40",
    lanes: [
      { icon: "🖼️", name: "เขียนจากภาพ" },
      { icon: "📝", name: "อ่านแล้วเขียน" },
      { icon: "🗣️", name: "พูดจากภาพ" },
      { icon: "🎙️", name: "อ่านแล้วพูด" },
      { icon: "💬", name: "พูดแบบโต้ตอบ" },
    ],
  },
  {
    title: "Comprehension",
    th: "การอ่าน",
    icon: "📖",
    cardBg: "bg-[#fffbf0]",
    tileTint: "hover:border-amber-400/40",
    lanes: [
      { icon: "🔤", name: "ศัพท์ (Vocabulary)" },
      { icon: "📚", name: "การอ่าน (Reading)" },
    ],
  },
  {
    title: "Literacy",
    th: "สะกด–ฟังจับคำ",
    icon: "🔡",
    cardBg: "bg-[#f0fbf5]",
    tileTint: "hover:border-emerald-500/40",
    lanes: [
      { icon: "⌨️", name: "ฟังแล้วพิมพ์ (Dictation)" },
      { icon: "✏️", name: "เติมคำในช่องว่าง" },
      { icon: "✅", name: "คำจริง (Real word)" },
    ],
  },
  {
    title: "Conversation",
    th: "ฟังสนทนา",
    icon: "🎧",
    cardBg: "bg-[#f7f5ff]",
    tileTint: "hover:border-violet-500/40",
    lanes: [
      { icon: "🎧", name: "การสนทนาแบบโต้ตอบ" },
      { icon: "📋", name: "สรุปการสนทนา" },
    ],
  },
];

export function ExploreClient() {
  const [open, setOpen] = useState(false);

  // Let them glimpse the catalog first, then invite them to unlock (not a hard wall).
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 1600);
    return () => clearTimeout(t);
  }, []);

  function LockedTile({ icon, name }: { icon: string; name: string }) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white/70 px-3 py-2.5 text-left transition-colors hover:border-ep-blue/40"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm grayscale-[35%]">
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-gray-700">{name}</span>
        <span className="shrink-0 text-gray-300 transition-colors group-hover:text-ep-blue">🔒</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ep-blue">
              <span className="font-mono text-xs font-bold text-white">EP</span>
            </div>
            <span className="hidden text-sm font-semibold text-ep-blue sm:block">ENGLISH PLAN</span>
          </Link>
          <Link href="/login?next=%2Fpractice" className="text-sm text-gray-500 transition-colors hover:text-ep-blue">
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-28 pt-10">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-ep-blue">
            <span>👀</span> นี่คือทุกอย่างที่คุณจะได้ฝึก
          </div>
          <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
            ดูคลังข้อสอบทั้งหมดก่อน — แล้ว<span className="text-ep-blue">สมัครฟรี</span>เพื่อปลดล็อก
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
            ฝึกได้ครบทุกแบบที่ DET ออกจริง พร้อมฟีดแบ็กภาษาไทย · สมัครฟรี ไม่ต้องใช้บัตรเครดิต
          </p>
        </div>

        {/* Featured locked cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative overflow-hidden rounded-2xl border border-ep-blue/20 bg-gradient-to-br from-ep-blue to-blue-700 p-5 text-left text-white shadow-sm"
          >
            <span className="absolute right-4 top-4 text-white/70">🔒</span>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ep-yellow">แนะนำให้เริ่มที่นี่</p>
            <p className="mt-1.5 text-lg font-bold">เช็กระดับฟรี (Mini Diagnosis)</p>
            <p className="mt-1 text-sm text-blue-100">รู้คะแนนโดยรวม + จุดอ่อน 4 ทักษะ ภายในไม่กี่นาที</p>
            <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">🔓 สมัครฟรีเพื่อเริ่ม</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm"
          >
            <span className="absolute right-4 top-4 text-gray-300">🔒</span>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-400">ข้อสอบเต็มรูปแบบ</p>
            <p className="mt-1.5 text-lg font-bold text-gray-900">Mock Test</p>
            <p className="mt-1 text-sm text-gray-500">สอบเสมือนจริง ~1 ชม. เห็น 2 ทักษะที่ฉุดคะแนน</p>
            <span className="mt-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-ep-blue">ปลดล็อกในแพ็กเกจ</span>
          </button>
        </div>

        {/* All lanes by skill — locked */}
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title} className={cx("rounded-2xl border border-gray-100 p-5", g.cardBg)}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">{g.icon}</span>
                <h2 className="font-bold text-gray-900">{g.title}</h2>
                <span className="text-xs font-semibold text-gray-400">· {g.th}</span>
              </div>
              <div className="space-y-2">
                {g.lanes.map((l) => (
                  <LockedTile key={l.name} icon={l.icon} name={l.name} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Sticky unlock bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className="hidden text-sm font-semibold text-gray-700 sm:block">ปลดล็อกการฝึกทั้งหมด — ฟรี</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 rounded-xl bg-ep-blue px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 sm:flex-initial sm:px-8"
          >
            🔓 สมัครฟรีเพื่อปลดล็อก
          </button>
        </div>
      </div>

      {/* Register modal */}
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="explore-unlock-title"
        >
          <div className="ep-explore-in w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <style>{`@keyframes epExploreIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}.ep-explore-in{animation:epExploreIn .3s ease both}@media(prefers-reduced-motion:reduce){.ep-explore-in{animation:none}}`}</style>
            <div className="bg-gradient-to-br from-ep-blue to-blue-700 px-6 py-6 text-white">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl">🔓</div>
              <h2 id="explore-unlock-title" className="text-xl font-bold leading-tight">
                สมัครฟรี เพื่อปลดล็อกการฝึกทั้งหมด
              </h2>
              <p className="mt-1 text-sm text-blue-100">ไม่ต้องใช้บัตรเครดิต · เริ่มได้ทันที</p>
            </div>
            <div className="px-6 py-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">สมัครฟรีแล้วได้:</p>
              <ul className="space-y-2.5 text-sm text-gray-700">
                {[
                  "ลองข้อสอบจริงได้ทุกหมวด อย่างละ 1 ครั้ง",
                  "เช็กระดับฟรี (Mini Diagnosis) เห็นจุดอ่อน 4 ทักษะ",
                  "ฟีดแบ็กรายข้อเป็นภาษาไทย 1 เครดิต",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?next=%2Fpractice"
                className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-ep-blue px-6 py-4 text-center text-base font-bold text-white shadow-md transition-opacity hover:opacity-90"
              >
                สมัครฟรี — เริ่มเลย
              </Link>
              <Link
                href="/login?next=%2Fpractice"
                className="mt-2 block text-center text-sm font-semibold text-gray-500 transition-colors hover:text-ep-blue"
              >
                มีบัญชีแล้ว? เข้าสู่ระบบ
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 block w-full text-center text-xs text-gray-400 transition-colors hover:text-gray-600"
              >
                ขอดูคลังข้อสอบต่อก่อน
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
