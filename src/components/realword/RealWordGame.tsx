"use client";

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
  const toggle = (i: number) => {
    playBlinkBeep();
    onToggle(i);
  };

  const submit = () => {
    playBlinkBeep();
    onSubmit();
  };

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
