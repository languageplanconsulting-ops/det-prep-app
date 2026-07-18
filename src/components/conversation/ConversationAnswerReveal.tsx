"use client";

import { conversationExplanationThai } from "@/lib/conversation-report-helpers";

type Props = {
  options: string[];
  picked: number;
  correctIndex: number;
  explanation: string;
  /** Rendered under the reason — used for the "next line" CTA in the main dialogue. */
  footer?: React.ReactNode;
};

/**
 * Immediate correct/wrong reveal shown the moment a learner answers.
 * Mirrors the treatment det-mobile already uses so both apps read the same.
 */
export default function ConversationAnswerReveal({
  options,
  picked,
  correctIndex,
  explanation,
  footer,
}: Props) {
  const isCorrect = picked === correctIndex;

  return (
    <div
      className={`ep-luxury-option-in mt-4 border-4 border-black p-4 shadow-[4px_4px_0_0_#000] ${
        isCorrect ? "bg-emerald-50" : "bg-rose-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center border-4 border-black text-lg font-black shadow-[2px_2px_0_0_#000] ${
            isCorrect ? "bg-emerald-400 text-black" : "bg-rose-400 text-black"
          }`}
          aria-hidden
        >
          {isCorrect ? "✓" : "✕"}
        </span>
        <p
          className={`ep-stat text-sm font-black uppercase tracking-wide ${
            isCorrect ? "text-emerald-900" : "text-rose-900"
          }`}
        >
          {isCorrect ? "ถูกต้อง" : "ยังไม่ถูก"}
        </p>
      </div>

      {!isCorrect ? (
        <div className="mt-4 grid gap-2">
          <div className="border-4 border-black bg-white/70 px-3 py-2 shadow-[2px_2px_0_0_#000]">
            <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">
              คำตอบของคุณ
            </p>
            <p className="mt-1 text-sm font-bold text-neutral-900">
              <span className="ep-stat text-neutral-500">{picked + 1}.</span> {options[picked]}
            </p>
          </div>
          <div className="border-4 border-black bg-white px-3 py-2 shadow-[2px_2px_0_0_#000]">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
              คำตอบที่ถูก
            </p>
            <p className="mt-1 text-sm font-bold text-neutral-900">
              <span className="ep-stat text-neutral-500">{correctIndex + 1}.</span>{" "}
              {options[correctIndex]}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 border-t-4 border-dashed border-black/25 pt-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-neutral-500">ทำไม</p>
        <p className="mt-1 text-sm leading-relaxed text-neutral-800">
          {conversationExplanationThai(explanation)}
        </p>
      </div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
