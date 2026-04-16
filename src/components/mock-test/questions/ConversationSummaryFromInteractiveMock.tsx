"use client";

import { useMemo, useState } from "react";

import { mt } from "@/lib/mock-test/mock-test-styles";
import type { ConversationSummaryTurn } from "@/lib/mock-test/conversation-summary-mock";

export function ConversationSummaryFromInteractiveMock({
  content,
  onSubmit,
}: {
  content: Record<string, unknown>;
  onSubmit: (payload: { text: string }) => void;
}) {
  const turns = useMemo(
    () => (Array.isArray(content.turns) ? (content.turns as ConversationSummaryTurn[]) : []),
    [content.turns],
  );
  const userAnswers = useMemo(
    () => (Array.isArray(content.user_turn_answers) ? (content.user_turn_answers as string[]) : []),
    [content.user_turn_answers],
  );
  const [summary, setSummary] = useState("");

  if (!turns.length) {
    return <p className="text-sm font-bold text-red-800">No conversation data found from interactive step.</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-[#004AAD]">
          {String(content.summary_instruction_th ?? "เขียนสรุปบทสนทนา")}
        </p>
        <p className="text-xs text-neutral-600">
          {String(content.summary_instruction_en ?? "Write a concise summary from the conversation below.")}
        </p>
      </div>

      <section className={`${mt.border} ${mt.shadow} bg-white`}>
        <div className="border-b-4 border-black bg-[#FFCC00] px-4 py-2">
          <p className="text-xs font-black uppercase tracking-widest text-[#004AAD]">Conversation display</p>
        </div>
        <div className="max-h-[min(460px,55vh)] space-y-3 overflow-y-auto p-4">
          {turns.map((row, i) => (
            <div key={i} className="space-y-2 border-b-2 border-dashed border-neutral-200 pb-4 last:border-b-0">
              <div className="flex justify-end">
                <div className="max-w-[95%] rounded-[4px] border-4 border-black bg-[#004AAD] px-3 py-2 text-sm font-semibold text-[#FFCC00] shadow-[3px_3px_0_0_#000]">
                  <span className="block text-[10px] font-black uppercase">Examiner</span>
                  {row.question_en}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[95%] rounded-[4px] border-4 border-black bg-neutral-50 px-3 py-2 text-sm shadow-[3px_3px_0_0_#000]">
                  <span className="block text-[10px] font-black uppercase text-[#004AAD]">Your answer</span>
                  {userAnswers[i] ?? "-"}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[95%] rounded-[4px] border-4 border-black bg-emerald-50 px-3 py-2 text-sm shadow-[3px_3px_0_0_#000]">
                  <span className="block text-[10px] font-black uppercase text-emerald-800">
                    Reference answer
                  </span>
                  {row.reference_answer_en}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={8}
        className="w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm"
        placeholder="Write your conversation summary..."
      />
      <button
        type="button"
        onClick={() => onSubmit({ text: summary.trim() })}
        disabled={summary.trim().split(/\s+/).filter(Boolean).length < 5}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
      >
        Submit summary
      </button>
    </div>
  );
}
