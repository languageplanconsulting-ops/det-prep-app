"use client";

import { useMemo, useState } from "react";

import { mt } from "@/lib/mock-test/mock-test-styles";
import type { ConversationSummaryTurn } from "@/lib/mock-test/conversation-summary-mock";

export function InteractiveConversationMock({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (payload: { user_turn_answers: string[]; turns: ConversationSummaryTurn[] }) => void;
}) {
  const turns = useMemo(
    () => (Array.isArray(content.turns) ? (content.turns as ConversationSummaryTurn[]) : []),
    [content.turns],
  );
  const [turnIdx, setTurnIdx] = useState(0);
  const [reply, setReply] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);

  const current = turns[turnIdx];
  if (!turns.length || !current) {
    return <p className="text-sm font-bold text-red-800">Missing turns for interactive conversation mock.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-[#004AAD]">{String(content.scenario_title_en ?? "Interactive conversation")}</p>
      <p className="text-xs font-mono font-bold text-neutral-500">
        Turn {turnIdx + 1} / {turns.length}
      </p>

      <div className={`${mt.border} bg-[#004AAD]/5 p-4`}>
        <p className="text-xs font-black uppercase text-neutral-500">Examiner</p>
        {current.question_audio_url ? (
          <audio key={String(current.question_audio_url)} controls autoPlay className="mt-2 w-full" src={String(current.question_audio_url)}>
            <track kind="captions" />
          </audio>
        ) : null}
        <p className="mt-2 text-base font-bold text-neutral-900">{current.question_en}</p>
        {current.question_th ? <p className="mt-1 text-sm text-neutral-600">{current.question_th}</p> : null}
      </div>

      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={6}
        className="w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm"
        placeholder="Type your answer for this turn..."
        disabled={submitting}
      />
      <button
        type="button"
        disabled={submitting || reply.trim().length < 2}
        onClick={() => {
          if (submitting) return;
          const nextAnswers = [...answers, reply.trim()];
          setAnswers(nextAnswers);
          setReply("");
          if (turnIdx + 1 >= turns.length) {
            onSubmit({ user_turn_answers: nextAnswers, turns });
            return;
          }
          setTurnIdx((x) => x + 1);
        }}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
      >
        {submitting ? "Sending... / กำลังส่ง" : turnIdx + 1 >= turns.length ? "Finish interactive conversation" : "Next turn"}
      </button>
    </div>
  );
}
