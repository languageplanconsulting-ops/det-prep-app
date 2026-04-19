"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { IntroModalShell } from "@/components/practice/IntroModalShell";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

const STORAGE_KEY = "ep-vocab-master-intro-dismissed-v1";

/**
 * Full-screen intro shown before the round hub on `/practice/comprehension/vocabulary`.
 * Dismiss persists in localStorage so returning learners skip it.
 */
export function VocabExamIntroModal() {
  const [open, setOpen] = useState(true);
  const { isAdmin, previewEligible, loading } = useEffectiveTier();
  const forceShowEveryVisit = isAdmin || previewEligible;

  useLayoutEffect(() => {
    if (loading) return;
    if (forceShowEveryVisit) {
      setOpen(true);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setOpen(false);
    } catch {
      /* keep open */
    }
  }, [forceShowEveryVisit, loading]);

  const dismiss = useCallback(() => {
    if (forceShowEveryVisit) {
      setOpen(false);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, [forceShowEveryVisit]);

  if (!open) return null;

  return (
    <IntroModalShell
      open={open}
      onDismiss={dismiss}
      labelledBy="vocab-intro-title"
      title={
        <>
          Master Vocab <br />
          <span className="text-[#0055FF]">เก่งศัพท์ ไม่ต้องท่อง</span>
        </>
      }
      badge={<div className="border-2 border-black bg-[#FFD600] px-1 py-0.5 font-mono text-[10px] font-bold">GUIDE 01</div>}
      backgroundColor="#e5e7eb"
      footer={
        <div className="flex gap-4">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 border-[3px] border-black bg-[#0055FF] py-4 text-lg font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Get Started / เริ่มเลย
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="flex w-16 items-center justify-center border-[3px] border-black bg-white font-black shadow-[4px_4px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            aria-label="Dismiss guide"
          >
            ?
          </button>
        </div>
      }
    >
      <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-black text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">Reading Section Strategy</p>
              <p className="mb-2 text-sm text-gray-600">
                Missing vocabulary determines your Comprehension & Literary scores.
              </p>
              <p className="text-sm font-bold italic text-[#FF5C00]">
                พาร์ทการอ่าน: การเติมศัพท์ในช่องว่าง คือตัวช่วยเพิ่มคะแนน Comprehension & Literary ของคุณ
              </p>
            </div>
          </div>

          <div className="border-2 border-black bg-gray-100 p-4">
            <p className="mb-3 text-center font-mono text-xs font-black uppercase tracking-widest">
              Select Your Challenge / เลือกความท้าทาย
            </p>
            <div className="flex justify-around gap-2">
              <div className="flex flex-col items-center">
                <div className="mb-1 border-2 border-black bg-green-400 px-2 py-0.5 text-[0.75rem] font-extrabold uppercase">
                  Easy
                </div>
                <span className="text-[10px] font-bold opacity-60">พื้นฐาน</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-1 border-2 border-black bg-[#FFD600] px-2 py-0.5 text-[0.75rem] font-extrabold uppercase">
                  Medium
                </div>
                <span className="text-[10px] font-bold opacity-60">ปานกลาง</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-1 border-2 border-black bg-[#FF5C00] px-2 py-0.5 text-[0.75rem] font-extrabold uppercase text-white">
                  Hard
                </div>
                <span className="text-[10px] font-bold opacity-60">ท้าทาย</span>
              </div>
            </div>
          </div>

          <div className="border-l-4 border-[#0055FF] pl-4">
            <h3 className="mb-1 text-xl font-black uppercase italic">Forget &quot;Rote Memorization&quot;</h3>
            <p className="text-sm font-bold leading-tight text-gray-700">
              Instead of <i>Thong-Sub</i>, just click{" "}
              <span className="bg-[#0055FF] px-1 text-white">&quot;Add to Notebook&quot;</span> for words you miss.
              Review them anytime.
            </p>
            <p className="mt-2 text-sm font-bold italic leading-tight text-[#0055FF]">
              ลืมการ &quot;ท่องศัพท์&quot; แบบเดิมๆ ไปได้เลย! แค่กด &quot;Add to Notebook&quot; สำหรับคำที่ตอบผิด
              เพื่อเอาไว้ทบทวนภายหลัง
            </p>
          </div>

          <div className="flex items-center justify-between border-2 border-dashed border-gray-400 px-4 py-2 font-mono text-[10px] font-bold text-gray-500">
            <span>1. TAKE EXAM</span>
            <span>➔</span>
            <span className="text-red-500">2. WRONG WORD?</span>
            <span>➔</span>
            <span className="bg-[#FFD600] px-1 text-black">3. ADD TO NOTEBOOK</span>
          </div>
      </div>
    </IntroModalShell>
  );
}
