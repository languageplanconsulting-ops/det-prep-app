"use client";

import { useState } from "react";

type Props = {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (payload: { user_turn_answers: string[]; turns: Array<{ question_en: string; question_th?: string }> }) => void;
};

type Turn = { question_en: string; question_th?: string; transcript: string };

const TURN_COUNT = 5;

export function MockInteractiveSpeakingTurns({ content, onSubmit, submitting = false }: Props) {
  const [turn, setTurn] = useState(1);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(() => ({
    en: String(content.prompt_en ?? content.instruction ?? "Let's start the conversation."),
    th: String(content.prompt_th ?? content.instruction_th ?? ""),
  }));
  const [answer, setAnswer] = useState("");
  const [loadingNext, setLoadingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveCurrent = () => {
    const t: Turn = {
      question_en: currentQuestion.en,
      question_th: currentQuestion.th || undefined,
      transcript: answer.trim(),
    };
    const next = [...turns, t];
    setTurns(next);
    return next;
  };

  const nextTurn = async () => {
    if (!answer.trim()) {
      setError("Please answer before continuing.");
      return;
    }
    if (submitting) return;
    setError(null);
    const completed = saveCurrent();
    setAnswer("");

    if (completed.length >= TURN_COUNT) {
      onSubmit({
        user_turn_answers: completed.map((x) => x.transcript),
        turns: completed.map((x) => ({ question_en: x.question_en, question_th: x.question_th })),
      });
      return;
    }

    setLoadingNext(true);
    try {
      const res = await fetch("/api/interactive-speaking-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioTitleEn: String(content.scenario_title_en ?? content.prompt_en ?? "Mock interactive speaking"),
          scenarioTitleTh: String(content.scenario_title_th ?? ""),
          starterQuestionEn: String(content.prompt_en ?? content.instruction ?? "Let's begin."),
          starterQuestionTh: String(content.prompt_th ?? content.instruction_th ?? ""),
          nextTurnNumber: completed.length + 1,
          history: completed.map((x) => ({
            questionEn: x.question_en,
            answerTranscript: x.transcript,
          })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { questionEn?: string; questionTh?: string; error?: string };
      if (!res.ok || !json.questionEn) {
        setError(json.error ?? "Could not load next follow-up question.");
        setLoadingNext(false);
        return;
      }
      setCurrentQuestion({
        en: json.questionEn,
        th: String(json.questionTh ?? ""),
      });
      setTurn(completed.length + 1);
      setLoadingNext(false);
    } catch {
      setError("Could not load next follow-up question.");
      setLoadingNext(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#004AAD]">
        Interactive speaking turn {turn}/{TURN_COUNT}
      </p>
      <div className="rounded-[4px] border-4 border-black bg-neutral-50 p-4">
        <p className="text-sm font-bold text-neutral-900">{currentQuestion.en}</p>
        {currentQuestion.th ? <p className="mt-1 text-xs text-neutral-600">{currentQuestion.th}</p> : null}
      </div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        className="w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm"
        placeholder="Speak then type transcript / answer..."
      />
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={loadingNext || submitting}
        onClick={() => void nextTurn()}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-60"
      >
        {submitting ? "Sending... / กำลังส่ง" : loadingNext ? "Loading next question..." : turn >= TURN_COUNT ? "Submit interactive speaking" : "Next turn"}
      </button>
    </div>
  );
}

