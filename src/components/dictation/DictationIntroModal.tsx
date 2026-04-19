"use client";

import { useEffect } from "react";

export function DictationIntroModal({
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, 'Anuphan', sans-serif",
        backgroundImage: "radial-gradient(#111 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        backgroundColor: "#f3f4f6",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dictation-intro-title"
      onClick={dismiss}
    >
      <div
        className="max-h-[min(92vh,900px)] w-full max-w-2xl overflow-y-auto border-4 border-[#111] bg-white p-6 shadow-[8px_8px_0_0_#111] md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b-4 border-black pb-4">
          <div>
            <h1
              id="dictation-intro-title"
              className="text-2xl font-black uppercase italic leading-none tracking-tighter sm:text-3xl"
            >
              การเขียนตามคำบอก <br />
              <span className="font-mono text-xl font-bold not-italic normal-case text-cyan-500">
                Dictation Practice
              </span>
            </h1>
          </div>
          <div className="border-2 border-black bg-cyan-500 px-1 py-0.5 font-mono text-[10px] font-bold text-white">
            GUIDE 04
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-4 border-2 border-black bg-cyan-50 p-4">
            <div className="text-3xl font-black" aria-hidden>
              🎧
            </div>
            <div>
              <p className="text-lg font-black leading-tight">เป้าหมายคะแนน (Target Score)</p>
              <p className="mt-1 text-sm font-bold text-gray-700">
                ช่วยเพิ่มคะแนนในหมวด{" "}
                <span className="text-black underline underline-offset-4">Literacy &amp; Comprehension</span> เน้นทักษะการเขียนและฟัง
              </p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase text-cyan-500">
                Focus: Literacy, Comprehension (Writing, Reading).
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <p className="text-center font-mono text-[11px] font-black uppercase tracking-widest text-gray-500">
              หัวใจสำคัญของการทำคะแนน / The Key Logic
            </p>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-cyan-500 p-2 text-white">✍️</div>
              <div>
                <p className="text-base font-black italic underline">ไม่ใช่แค่เรื่องการฟัง!</p>
                <p className="font-mono text-[10px] font-bold uppercase text-gray-400">
                  It&apos;s not just about listening skills
                </p>
                <p className="mt-1 text-sm font-bold">
                  การจะได้ 100% อยู่ที่การ{" "}
                  <span className="text-[#FF5C00]">&quot;ตรวจทานไวยากรณ์&quot;</span> หลังจากฟังจบแล้ว ทั้งการผันกริยา
                  (Conjugation) และเครื่องหมายวรรคตอน (Punctuation)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-[#FFD600] p-2">🔄</div>
              <div>
                <span className="inline-block bg-black px-2.5 py-0.5 text-[0.8rem] font-extrabold uppercase text-white">
                  ฟังได้ไม่จำกัด (Unlimited Listens)
                </span>
                <p className="mt-1 text-sm font-bold italic">ในข้อสอบจริงฟังได้แค่ 3 รอบเท่านั้น!</p>
                <p className="mt-1 text-xs text-gray-700">
                  แต่ที่นี่คือพื้นที่ฝึกฝน เราให้คุณฟังได้กี่ครั้งก็ได้เพื่อให้คุณ{" "}
                  <span className="font-black">พัฒนาทักษะ</span> ได้อย่างเต็มที่
                </p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase text-gray-400">
                  Real test: 3 times. Here: Unlimited for skill growth.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 border-2 border-black bg-gray-100 p-2">⚙️</div>
              <div>
                <p className="text-sm font-bold italic">ความรู้เดียวกับ Fill in the Blank</p>
                <p className="text-xs text-gray-500">
                  ต้องใช้ความรู้ทั้งคำศัพท์ 70% และไวยากรณ์อีก 30% เพื่อให้ประโยคสมบูรณ์ที่สุด
                </p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase text-gray-400">
                  Same core: Vocab (70%) + Grammar (30%).
                </p>
              </div>
            </div>
          </div>

          <div className="border-l-8 border-[#FF5C00] bg-orange-50 p-4 italic">
            <p className="text-base font-black leading-snug text-[#FF5C00]">
              &quot;หลายคนไม่รู้ว่าการจะได้ 100% ไม่ใช่แค่เรื่องการฟัง แต่คือการ &apos;ซ่อมประโยค&apos; ให้ถูกไวยากรณ์หลังจากได้ยินเสียงแล้ว&quot;
            </p>
            <p className="mt-2 font-mono text-xs font-bold text-gray-500">
              &quot;Getting 100% isn&apos;t really about listening; it&apos;s about correcting your grammar
              (conjugation, punctuation) after you hear the audio.&quot;
            </p>
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={enter}
            className="w-full border-[3px] border-black bg-cyan-500 py-4 text-lg font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
        </div>
      </div>
    </div>
  );
}
