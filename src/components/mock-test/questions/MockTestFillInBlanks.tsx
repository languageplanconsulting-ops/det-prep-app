"use client";

import { useState } from "react";

import { fitbMaxGapLetters, parseFitbBlankPrefix } from "@/lib/mock-test/fitb-content";

type Props = {
  content: Record<string, unknown>;
  onSubmit: (answer: string) => void;
};

/**
 * MC fill-in-the-blank: legacy full `sentence`, or prefix mode
 * (`blank_prefix` 1–6 chars + optional `sentence_before` / `sentence_after` / `blank_hint`).
 */
export function MockTestFillInBlanks({ content, onSubmit }: Props) {
  const [pick, setPick] = useState<string | null>(null);
  const opts = (content.options as string[]) ?? [];
  const prefix = parseFitbBlankPrefix(content);
  const prefixMode = prefix != null;

  const before = String(content.sentence_before ?? "");
  const after = String(content.sentence_after ?? "");
  const hint = content.blank_hint != null ? String(content.blank_hint) : "";
  const legacySentence = String(content.sentence ?? "");

  const gapLetters = prefixMode && prefix ? fitbMaxGapLetters(opts, prefix) : 0;
  const underscoreRun = prefixMode && prefix ? "_".repeat(gapLetters) : "";

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
      {prefixMode && prefix ? (
        <p className="rounded-[4px] border-4 border-black bg-white p-4 text-base font-medium leading-relaxed">
          <span>{before}</span>
          <span className="font-black tracking-tight text-[#004AAD]">{prefix}</span>
          <span className="font-mono tracking-widest">{underscoreRun}</span>
          <span>{after}</span>
          {hint ? (
            <span className="ml-1 text-sm font-normal text-neutral-600"> {hint}</span>
          ) : null}
        </p>
      ) : (
        <p className="rounded-[4px] border-4 border-black bg-white p-4 text-base font-medium">
          {legacySentence}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setPick(o)}
            className={`rounded-[4px] border-4 border-black px-3 py-2 text-left text-sm font-bold shadow-[4px_4px_0_0_#000] ${
              pick === o ? "bg-[#FFCC00]" : "bg-white"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!pick}
        onClick={() => pick && onSubmit(pick)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}
