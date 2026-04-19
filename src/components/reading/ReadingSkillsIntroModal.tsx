"use client";

import { useEffect } from "react";
import { IntroModalShell } from "@/components/practice/IntroModalShell";

/**
 * Full-screen intro when entering Reading skills from the practice hub.
 * Thai-first copy + English sublabels (GUIDE 02).
 */
export function ReadingSkillsIntroModal({
  open,
  onOpenChange,
  onEnter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnter: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const dismiss = () => onOpenChange(false);

  const enter = () => {
    onEnter();
    onOpenChange(false);
  };

  return (
    <IntroModalShell
      open={open}
      onDismiss={dismiss}
      labelledBy="reading-intro-title"
      title={
        <>
          ทักษะการอ่านวิเคราะห์ <br />
          <span className="font-mono text-xl font-bold not-italic normal-case text-[#FF5C00]">
            Reading Skills
          </span>
        </>
      }
      badge={
        <div className="border-2 border-black bg-[#FF5C00] px-1 py-0.5 font-mono text-[10px] font-bold text-white">
          GUIDE 02
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={enter}
            className="w-full border-[3px] border-black bg-[#FF5C00] py-4 text-lg font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            เริ่มแบบฝึกหัด / Enter Exercise
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full border-2 border-transparent py-2 text-center text-xs font-bold text-neutral-500 underline"
          >
            Close
          </button>
        </>
      }
    >
      <div className="space-y-6">
          <div className="flex items-center gap-4 border-2 border-black bg-blue-50 p-4">
            <div className="font-mono text-3xl font-black text-[#0055FF]">01</div>
            <div>
              <p className="text-lg font-black leading-tight">เป้าหมายคะแนน (Target Score)</p>
              <p className="mt-1 text-sm font-bold text-gray-700">
                ส่วนนี้ช่วยเพิ่มคะแนนในหมวด{" "}
                <span className="text-black underline underline-offset-4">Comprehension, Literacy</span> และการอ่านโดยรวม
              </p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase text-[#0055FF]">
                Focus: Comprehension, Literacy & Reading scores.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-mono text-[11px] font-black uppercase tracking-widest text-gray-500">
              เจาะลึกตรรกะการอ่าน / Mastering the Logic
            </p>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-gray-200 p-2">🚫</div>
              <div>
                <p className="text-base font-black">ไม่ใช่การทดสอบคำศัพท์โดยตรง</p>
                <p className="font-mono text-[10px] font-bold uppercase text-gray-400">Not a Vocabulary Test</p>
                <p className="mt-1 text-sm font-medium">
                  เราไม่ได้มองหาแค่คำศัพท์ แต่เรามองหา <span className="font-bold">ความหมายและตรรกะ</span> ของเนื้อหา
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-[#FFD600] p-2">🧩</div>
              <div>
                <span className="inline-block bg-black px-2.5 py-0.5 text-[0.8rem] font-extrabold uppercase text-white">
                  ความเชื่อมโยง (Cohesion)
                </span>
                <p className="mt-1 text-sm font-bold">ฝึกดูว่าแต่ละย่อหน้าเชื่อมต่อกันอย่างไร</p>
                <p className="font-mono text-[10px] font-bold uppercase text-gray-400">Paragraph Connection</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-[#22c55e] p-2">📌</div>
              <div>
                <span className="inline-block bg-black px-2.5 py-0.5 text-[0.8rem] font-extrabold uppercase text-white">
                  ใจความสำคัญ (Main Idea)
                </span>
                <p className="mt-1 text-sm font-bold">การเลือกชื่อเรื่องที่เหมาะสมที่สุด และแก่นของเรื่อง</p>
                <p className="font-mono text-[10px] font-bold uppercase text-gray-400">Best Title & Core Concept</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-[#0055FF] p-2 text-white">🔍</div>
              <div>
                <span className="inline-block bg-black px-2.5 py-0.5 text-[0.8rem] font-extrabold uppercase text-white">
                  การหาข้อมูลเฉพาะ (Scanning)
                </span>
                <p className="mt-1 text-sm font-bold">กวาดสายตาเพื่อค้นหาข้อมูลที่โจทย์ต้องการโดยเฉพาะ</p>
                <p className="font-mono text-[10px] font-bold uppercase text-gray-400">Finding Specific Information</p>
              </div>
            </div>
          </div>

          <div className="border-l-8 border-black bg-gray-50 p-4 italic">
            <p className="text-base font-black leading-snug">
              &quot;คิดเหมือนสถาปนิก: มองที่โครงสร้างของบ้าน ไม่ใช่แค่อิฐทีละก้อน&quot;
            </p>
            <p className="mt-2 font-mono text-xs font-bold text-gray-500">
              &quot;Think like an architect: Look at the structure of the house, not just the individual bricks.&quot;
            </p>
          </div>
      </div>
    </IntroModalShell>
  );
}
