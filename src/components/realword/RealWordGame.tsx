"use client";

import { StickyExamCTA } from "@/components/practice/StickyExamCTA";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { sfxSubmit } from "@/lib/exam-sfx";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import type { RealWordSet } from "@/types/realword";

export function RealWordGame({
  wordSet,
  selected,
  onToggle,
  onSubmit,
}: {
  wordSet: RealWordSet;
  selected: Set<number>;
  onToggle: (index: number) => void;
  onSubmit: () => void;
}) {
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;

  const toggle = (i: number) => {
    playBlinkBeep();
    onToggle(i);
  };

  const submit = () => {
    sfxSubmit();
    onSubmit();
  };

  if (soft) {
    // ── Soft-modern admin rebuild — same toggle/submit handlers ──
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-xl text-white">
                🔤
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Real word · {wordSet.setId}
                </p>
                <h1 className="text-lg font-bold">แตะคำจริง · เลี่ยงคำลวง</h1>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
              เลือกแล้ว {selected.size}
            </span>
          </div>

          <div key={wordSet.setId} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {wordSet.words.map((w, i) => {
              const on = selected.has(i);
              return (
                <button
                  key={`${w.word}-${i}`}
                  type="button"
                  onClick={() => toggle(i)}
                  style={{ animation: `realword-tile-in 0.34s ease-out ${Math.min(i * 0.03, 0.5)}s both` }}
                  className={`rounded-xl border px-4 py-3.5 text-center text-[15px] font-bold transition-colors ${
                    on
                      ? "border-[#FFCC00] bg-[#FFCC00] text-[#004AAD]"
                      : "border-slate-200 bg-white hover:border-[#004AAD]"
                  }`}
                >
                  {w.word}
                </button>
              );
            })}
          </div>
          <style>{`@keyframes realword-tile-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

          <StickyExamCTA hint={`เลือกแล้ว ${selected.size} คำ`}>
            <button
              type="button"
              onClick={submit}
              className="w-full rounded-xl bg-[#004AAD] py-3.5 text-center text-base font-bold text-[#FFCC00] hover:opacity-90"
            >
              ส่งคำตอบ →
            </button>
          </StickyExamCTA>

          <div className="mt-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
              D
            </div>
            <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
              <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
                <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
              </span>
              <p className="text-[13px] leading-6 text-slate-800">
                แตะเฉพาะคำที่ <strong>มั่นใจว่ามีจริง</strong> · คำลวงมักหน้าตาคล้ายภาษาอังกฤษแต่ออกเสียงแปลกๆ ·
                เดาผิด=โดนหักคะแนน
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">{wordSet.setId}</p>
        <p className="mt-1 text-lg font-black text-neutral-900">Tap the real English words</p>
        <p className="mt-1 text-xs text-neutral-600">
          Select every word you believe is authentic. Fake “trap” words are mixed in.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {wordSet.words.map((w, i) => {
          const on = selected.has(i);
          return (
            <li key={`${w.word}-${i}`}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`ep-brutal w-full rounded-sm border-4 border-black px-4 py-6 text-center text-base font-black shadow-[4px_4px_0_0_#000] transition-colors ${
                  on ? "bg-ep-yellow" : "bg-white hover:bg-neutral-50"
                }`}
              >
                {w.word}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={submit}
        className="w-full border-4 border-black bg-ep-blue py-4 text-center text-sm font-black uppercase tracking-[0.2em] text-white shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
      >
        Submit
      </button>
    </div>
  );
}
