"use client";

import { useEffect } from "react";
import { IntroModalShell } from "@/components/practice/IntroModalShell";

/**
 * GUIDE 03 — shown from Practice hub before entering Fill in the blank.
 */
export function FillInBlankIntroModal({
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
      labelledBy="fitb-intro-title"
      title={
        <>
          เติมคำในช่องว่าง <br />
          <span className="font-mono text-xl font-bold not-italic normal-case text-violet-600">
            Fill in the Blank
          </span>
        </>
      }
      badge={
        <div className="border-2 border-black bg-violet-600 px-1 py-0.5 font-mono text-[10px] font-bold text-white">
          GUIDE 03
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={enter}
            className="w-full border-[3px] border-black bg-violet-600 py-4 text-lg font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
          <div className="flex items-center gap-4 border-2 border-black bg-purple-50 p-4">
            <div className="text-3xl font-black" aria-hidden>
              🎯
            </div>
            <div>
              <p className="text-lg font-black leading-tight">เป้าหมายคะแนน (Target Score)</p>
              <p className="mt-1 text-sm font-bold text-gray-700">
                คะแนนส่วนนี้จะถูกนำไปคิดในหมวด{" "}
                <span className="text-black underline underline-offset-4">Literacy & Comprehension</span> (ทั้ง Reading
                และ Writing)
              </p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase text-violet-600">
                Focus: Literacy, Comprehension (Reading, Writing).
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <p className="text-center font-mono text-[11px] font-black uppercase tracking-widest text-gray-500">
              ต้องรู้อะไรบ้าง? / What&apos;s inside?
            </p>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-[#FFD600] p-2 text-xl font-black">70%</div>
              <div>
                <p className="text-base font-black italic underline">คำศัพท์คือหัวใจหลัก</p>
                <p className="font-mono text-[10px] font-bold uppercase text-gray-400">Vocabulary is 70% of the test</p>
                <p className="mt-1 text-sm font-medium italic">
                  เน้นความเข้าใจความหมายของคำในบริบทที่ต่างกัน
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-[#0055FF] p-2 text-white">⚙️</div>
              <div>
                <span className="inline-block bg-black px-2.5 py-0.5 text-[0.8rem] font-extrabold uppercase text-white">
                  ไวยากรณ์ (Grammar)
                </span>
                <p className="mt-1 text-sm font-bold italic">
                  ไม่ได้มีแค่ศัพท์! ต้องดูโครงสร้างประโยคด้วย:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs font-bold text-gray-700">
                  <li>การผันกริยา (Conjugation)</li>
                  <li>กาลเวลา (Tense) ให้สอดคล้องกับเนื้อเรื่อง</li>
                  <li>การใช้ Adverb ขยาย Verb ให้ถูกตำแหน่ง</li>
                </ul>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase text-gray-400">
                  Focus: Conjugation, Tenses, and Adverbs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-[#FF5C00] p-2 text-white">🔗</div>
              <div>
                <span className="inline-block bg-black px-2.5 py-0.5 text-[0.8rem] font-extrabold uppercase text-white">
                  คำเชื่อม (Transitions)
                </span>
                <p className="mt-1 text-sm font-bold italic">ระวังคำเชื่อมที่บอกทิศทางของประโยค</p>
                <p className="text-xs text-gray-500">
                  บางครั้งโจทย์จะถามหาคำเชื่อมที่หายไปเพื่อให้เนื้อความต่อเนื่องกัน
                </p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase text-gray-400">
                  Focus: Transitional words and flow.
                </p>
              </div>
            </div>
          </div>

          <div className="border-l-8 border-black bg-gray-50 p-4 italic">
            <p className="text-base font-black leading-snug">
              &quot;เหมือนการต่อจิ๊กซอว์: ต้องหาชิ้นส่วนที่เข้ากันได้ทั้งรูปร่าง (Grammar) และลวดลาย (Vocab)&quot;
            </p>
            <p className="mt-2 font-mono text-xs font-bold text-gray-500">
              &quot;Like a jigsaw puzzle: Match both the shape (Grammar) and the pattern (Vocab).&quot;
            </p>
          </div>
      </div>
    </IntroModalShell>
  );
}
