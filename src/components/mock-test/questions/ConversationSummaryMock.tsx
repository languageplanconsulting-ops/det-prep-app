"use client";

import { useState } from "react";

import { mt } from "@/lib/mock-test/mock-test-styles";
import type { ConversationSummaryTurn } from "@/lib/mock-test/conversation-summary-mock";

type Props = {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (payload: {
    text: string;
    user_turn_answers: string[];
  }) => void;
};

export function ConversationSummaryMock({ content, onSubmit, submitting = false }: Props) {
  const turns = (Array.isArray(content.turns)
    ? content.turns
    : []) as ConversationSummaryTurn[];

  const [stage, setStage] = useState<"chat" | "recap">("chat");
  const [turnIdx, setTurnIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [reply, setReply] = useState("");
  const [summary, setSummary] = useState("");

  const total = turns.length;
  const current = turns[turnIdx];

  const submitTurn = () => {
    const trimmed = reply.trim();
    if (trimmed.length < 2) return;
    const next = [...userAnswers, trimmed];
    setUserAnswers(next);
    setReply("");
    if (next.length >= total) {
      setStage("recap");
      return;
    }
    setTurnIdx((i) => i + 1);
  };

  if (total === 0 || !current) {
    return (
      <p className="text-sm font-bold text-red-800">
        Missing or invalid <code className="font-mono">content.turns</code> for interactive
        conversation + summary.
      </p>
    );
  }

  if (stage === "chat") {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
          <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
        </div>
        <p className="text-xs font-mono font-bold text-[#004AAD]">
          Turn {turnIdx + 1} of {total} · ตอบเป็นประโยคภาษาอังกฤษ
        </p>
        <div className={`${mt.border} bg-[#004AAD]/5 p-4`}>
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Examiner / ผู้สอบถาม
          </p>
          <p className="mt-2 text-base font-bold text-neutral-900">{current.question_en}</p>
          {current.question_th ? (
            <p className="mt-1 text-sm text-neutral-600">{current.question_th}</p>
          ) : null}
        </div>
        <label className="block text-xs font-bold text-neutral-700">
          Your reply / คำตอบของคุณ
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={submitting}
            rows={5}
            className="mt-2 w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm"
            placeholder="Type your spoken reply (English)…"
          />
        </label>
        <button
          type="button"
          onClick={submitTurn}
          disabled={submitting || reply.trim().length < 2}
          className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
        >
          {submitting ? "Submitting..." : turnIdx + 1 >= total ? "Finish conversation / จบบทสนทนา" : "Next turn / ข้อถัดไป"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-[#004AAD]">
          {String(content.summary_instruction_th ?? "สรุปบทสนทนาด้านล่าง")}
        </p>
        <p className="text-xs text-neutral-600">
          {String(
            content.summary_instruction_en ??
              "Read the dialogue (questions + model answers), then write your summary.",
          )}
        </p>
      </div>

      <section className={`${mt.border} ${mt.shadow} bg-white`}>
        <div className="border-b-4 border-black bg-[#FFCC00] px-4 py-2">
          <p className="text-xs font-black uppercase tracking-widest text-[#004AAD]">
            Conversation transcript / บทสนทนา (question + reference answer)
          </p>
        </div>
        <div className="max-h-[min(420px,55vh)] space-y-3 overflow-y-auto p-4">
          {turns.map((row, i) => (
            <div
              key={i}
              className="space-y-2 border-b-2 border-dashed border-neutral-200 pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex justify-end">
                <div className="max-w-[95%] rounded-[4px] border-4 border-black bg-[#004AAD] px-3 py-2 text-left text-sm font-semibold text-[#FFCC00] shadow-[3px_3px_0_0_#000]">
                  <span className="block text-[10px] font-black uppercase opacity-90">
                    Examiner
                  </span>
                  {row.question_en}
                  {row.question_th ? (
                    <span className="mt-1 block text-xs font-normal text-[#FFCC00]/90">
                      {row.question_th}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[95%] rounded-[4px] border-4 border-black bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900 shadow-[3px_3px_0_0_#000]">
                  <span className="block text-[10px] font-black uppercase text-[#004AAD]">
                    Model answer / คำตอบตัวอย่าง
                  </span>
                  {row.reference_answer_en}
                  {row.reference_answer_th ? (
                    <p className="mt-1 text-xs text-neutral-600">{row.reference_answer_th}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-neutral-500">
        Your replies were recorded for scoring. / คำตอบของคุณถูกบันทึกแล้ว
      </p>

      <label className="block">
        <span className="text-sm font-bold text-neutral-900">
          Write your summary / เขียนสรุป
        </span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={submitting}
          rows={8}
          className="mt-2 w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm"
          placeholder="Summarize the main points and outcome of the conversation…"
        />
      </label>

      <button
        type="button"
        onClick={() =>
          onSubmit({
            text: summary.trim(),
            user_turn_answers: userAnswers,
          })
        }
        disabled={submitting || summary.trim().split(/\s+/).filter(Boolean).length < 5}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit summary / ส่งคำสรุป"}
      </button>
    </div>
  );
}
