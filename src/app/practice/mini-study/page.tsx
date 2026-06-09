"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  MINI_STUDY_CATEGORY_ICON,
  MINI_STUDY_CATEGORY_LABEL_TH,
  MINI_STUDY_CATEGORY_ORDER,
  MINI_STUDY_SESSIONS,
  type MiniStudyCategory,
  type MiniStudySession,
} from "@/lib/mini-study/content";
import { checkMiniStudyAccess } from "@/lib/mini-study/upgrade-copy";

const CATEGORY_PALETTE: Record<
  MiniStudyCategory,
  { headBg: string; headBorder: string; tagText: string; tagRing: string }
> = {
  dictation: {
    headBg: "bg-amber-50",
    headBorder: "border-amber-200",
    tagText: "text-amber-700",
    tagRing: "ring-amber-200",
  },
  speaking: {
    headBg: "bg-rose-50",
    headBorder: "border-rose-200",
    tagText: "text-rose-700",
    tagRing: "ring-rose-200",
  },
  listening: {
    headBg: "bg-sky-50",
    headBorder: "border-sky-200",
    tagText: "text-sky-700",
    tagRing: "ring-sky-200",
  },
  writing: {
    headBg: "bg-violet-50",
    headBorder: "border-violet-200",
    tagText: "text-violet-700",
    tagRing: "ring-violet-200",
  },
  reading: {
    headBg: "bg-emerald-50",
    headBorder: "border-emerald-200",
    tagText: "text-emerald-700",
    tagRing: "ring-emerald-200",
  },
};

export default function MiniStudyHubPage() {
  const { effectiveTier, isAdmin, previewEligible, loading } = useEffectiveTier();

  const grouped = useMemo(() => {
    const map = new Map<MiniStudyCategory, MiniStudySession[]>();
    for (const s of MINI_STUDY_SESSIONS) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.index - b.index);
    return map;
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-slate-500">
        Loading…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Intro */}
      <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#004AAD]">
          Mini Study
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          บทเรียนสั้น · เรียนเทคนิคทำข้อสอบ DET ทีละนิด
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          แต่ละบทเป็นบทเรียนสั้นๆ ที่สอน <strong>เทคนิคทำข้อสอบ DET</strong> ในเวลาแค่
          15 นาที เหมาะกับวันที่ไม่มีเวลาเยอะ แบ่งเป็น 5 หมวดทักษะหลัก — ฟัง · พูด · เขียน · อ่าน
          · Dictation เลือกหมวดที่อยากเก่งขึ้นก่อนได้เลย
        </p>
      </header>

      {/* Tier notice */}
      <div className="flex items-start gap-3 rounded-2xl bg-[#fff7d1] p-5 ring-1 ring-[#FFCC00]/50">
        <div className="shrink-0 text-2xl">🔑</div>
        <div className="text-sm leading-7 text-slate-800">
          <p>
            <strong>Mini Study เปิดให้เฉพาะสมาชิก Premium และ VIP เท่านั้น</strong>
          </p>
          <p className="mt-1 text-xs">
            <span className="mr-1 inline-block rounded-full bg-[#eef4ff] px-2 py-0.5 font-semibold text-[#004AAD]">
              Premium
            </span>
            ใช้ได้ทุกบทยกเว้นกลุ่ม <strong>Writing Essay</strong>
            <span className="mx-2 text-slate-400">·</span>
            <span className="mr-1 inline-block rounded-full bg-gradient-to-r from-[#FFCC00] to-amber-500 px-2 py-0.5 font-semibold text-slate-900">
              VIP
            </span>
            ใช้ได้ครบทุกบทรวม <strong>Writing Essay</strong> และฟีเจอร์ที่ AI
            ตรวจอย่างละเอียดเป็นภาษาไทย
          </p>
        </div>
      </div>

      {/* Admin preview banner */}
      {isAdmin || previewEligible ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-red-200 text-xs text-red-700">
          <strong>Admin preview:</strong> ฟีเจอร์นี้ยังเป็น preview มองเห็นเฉพาะแอดมิน
          ผู้ใช้ทั่วไปจะไม่เห็นทางเข้านี้ใน Practice hub
        </div>
      ) : null}

      {/* Kanban */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {MINI_STUDY_CATEGORY_ORDER.map((cat) => {
          const sessions = grouped.get(cat) ?? [];
          if (sessions.length === 0) return null;
          const palette = CATEGORY_PALETTE[cat];
          return (
            <section
              key={cat}
              className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"
            >
              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${palette.headBg} ${palette.headBorder}`}
              >
                <span className="text-sm font-bold text-slate-800">
                  {MINI_STUDY_CATEGORY_ICON[cat]} {MINI_STUDY_CATEGORY_LABEL_TH[cat]}
                </span>
                <span
                  className={`rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold ring-1 ${palette.tagRing} ${palette.tagText}`}
                >
                  {sessions.length} บท
                </span>
              </div>
              <div className="space-y-2 p-3">
                {sessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    currentTier={effectiveTier}
                    isAdmin={isAdmin}
                    previewEligible={previewEligible}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function SessionCard({
  session,
  currentTier,
  isAdmin,
  previewEligible,
}: {
  session: MiniStudySession;
  currentTier: ReturnType<typeof useEffectiveTier>["effectiveTier"];
  isAdmin: boolean;
  previewEligible: boolean;
}) {
  const access = checkMiniStudyAccess(currentTier, session.tierRequired, {
    isAdmin,
    previewEligible,
  });

  const tierBadge =
    session.tierRequired === "vip" ? (
      <span className="rounded-full bg-gradient-to-r from-[#FFCC00] to-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-900">
        {access.allowed ? "VIP" : "🔒 VIP"}
      </span>
    ) : (
      <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-semibold text-[#004AAD]">
        Premium
      </span>
    );

  const meta = sessionMetaLabel(session);

  if (!access.allowed) {
    return (
      <Link
        href={access.href}
        className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-[#FFCC00] hover:bg-white"
        title={`${access.headlineTh} · ${access.ctaTh}`}
      >
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-bold text-slate-500">บทที่ {session.index}</p>
          <span className="ml-auto">{tierBadge}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-700">{session.title}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{session.shortHookTh}</p>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
          <span>⏱ {session.durationLabel}</span>
          {meta ? (
            <>
              <span>·</span>
              <span>{meta}</span>
            </>
          ) : null}
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-[#FFCC00] bg-[#fff7d1] px-2 py-1.5 text-center text-[11px] font-semibold text-slate-800">
          🔒 {access.headlineTh}
          <br />
          <span className="text-[#004AAD] underline-offset-2 hover:underline">
            {access.ctaTh} →
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/practice/mini-study/${session.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:-translate-y-px hover:border-[#FFCC00] hover:shadow-md"
    >
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-bold text-slate-500">บทที่ {session.index}</p>
        <span className="ml-auto">{tierBadge}</span>
      </div>
      <p className="mt-1 text-sm font-semibold">{session.title}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-600">{session.shortHookTh}</p>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
        <span>⏱ {session.durationLabel}</span>
        {meta ? (
          <>
            <span>·</span>
            <span>{meta}</span>
          </>
        ) : null}
      </div>
    </Link>
  );
}

function sessionMetaLabel(s: MiniStudySession): string {
  switch (s.kind) {
    case "dictation":
      return `${s.items.length} ข้อฝึก`;
    case "interactive-listening-mc":
      return `${s.scenarios.length} Scenario`;
    case "listen-respond":
      return `${s.exercises.length} ข้อฝึก`;
    case "essay-pick":
      return `${s.exercises.length} ตัวเลือก`;
    case "essay-cloze":
      return `${s.exercises.length} Essay · ตรวจไวยากรณ์`;
    case "passage-mc":
      return `${s.exercises.length} ข้อฝึก`;
    case "write-about-photo":
    case "speak-about-photo":
      return "AI ตรวจ";
    case "conversation-summary":
      return "Gemini ตรวจ";
    default:
      return "";
  }
}
