"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type McqTurn = {
  question_en: string;
  question_audio_url?: string;
  options: string[];
  correct_answer: string;
};

export function InteractiveConversationMcqMock({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (payload: {
    user_turn_answers: string[];
    turns: Array<{ question_en: string; reference_answer_en: string }>;
    averageScore0To100: number;
  }) => void;
}) {
  const turns = useMemo(
    () => (Array.isArray(content.turns) ? (content.turns as McqTurn[]) : []),
    [content.turns],
  );
  const scenarioText = String(
    content.scenario_en ??
      content.scenario ??
      content.scenario_text ??
      content.scenario_description ??
      "",
  ).trim();
  const scenarioAudioUrl = String(content.scenario_audio_url ?? content.scenarioAudioUrl ?? "").trim();
  const partA = useMemo(
    () =>
      (Array.isArray(content.part_a_questions)
        ? (content.part_a_questions as McqTurn[])
        : Array.isArray(content.phase_a_turns)
          ? (content.phase_a_turns as McqTurn[])
          : turns.slice(0, 3)),
    [content.part_a_questions, content.phase_a_turns, turns],
  );
  const partB = useMemo(
    () =>
      (Array.isArray(content.part_b_questions)
        ? (content.part_b_questions as McqTurn[])
        : Array.isArray(content.phase_b_turns)
          ? (content.phase_b_turns as McqTurn[])
          : turns.slice(3)),
    [content.part_b_questions, content.phase_b_turns, turns],
  );
  const allTurns = useMemo(() => [...partA, ...partB], [partA, partB]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [scenarioUnlocked, setScenarioUnlocked] = useState(partA.length === 0);
  const [scenarioTtsLoading, setScenarioTtsLoading] = useState(false);
  const [scenarioTtsError, setScenarioTtsError] = useState<string | null>(null);
  const [generatedScenarioAudioUrl, setGeneratedScenarioAudioUrl] = useState<string | null>(null);
  const [hasListened, setHasListened] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scenarioAudioRef = useRef<HTMLAudioElement | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const current = allTurns[idx];
  if (!current || !allTurns.length) {
    return <p className="text-sm font-bold text-red-800">Missing turns for interactive conversation MCQ.</p>;
  }

  const audioSrc = String(current.question_audio_url ?? generatedAudioUrl ?? "");
  const canAnswer = hasListened || Boolean(ttsError);
  const isPhaseA = idx < partA.length;
  const phase = isPhaseA ? "A" : "B";
  const phaseIdx = phase === "A" ? idx + 1 : idx - partA.length + 1;
  const phaseTotal = phase === "A" ? partA.length : partB.length;

  useEffect(() => {
    setPick(null);
    setHasListened(false);
    setGeneratedAudioUrl(null);
    setTtsLoading(false);
    setTtsError(null);
    // Reset audio position for the next turn.
    try {
      if (audioRef.current) audioRef.current.currentTime = 0;
    } catch {
      /* ignore */
    }
  }, [idx, current.question_audio_url]);

  useEffect(() => {
    setScenarioUnlocked(partA.length === 0);
    setScenarioTtsLoading(false);
    setScenarioTtsError(null);
    setGeneratedScenarioAudioUrl(null);
  }, [partA.length, scenarioAudioUrl, scenarioText]);

  const playScenarioAudio = async () => {
    setScenarioTtsError(null);
    const existingScenarioAudio = scenarioAudioUrl || generatedScenarioAudioUrl;
    try {
      if (existingScenarioAudio) {
        if (!scenarioAudioRef.current) return;
        scenarioAudioRef.current.currentTime = 0;
        await scenarioAudioRef.current.play();
        return;
      }
      if (!scenarioText) {
        setScenarioUnlocked(true);
        return;
      }
      setScenarioTtsLoading(true);
      const res = await fetch("/api/speech-synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: scenarioText }),
      });
      const j = (await res.json().catch(() => ({}))) as { audioBase64?: string; mimeType?: string };
      if (j.audioBase64 && j.mimeType) {
        const url = `data:${j.mimeType};base64,${j.audioBase64}`;
        setGeneratedScenarioAudioUrl(url);
        window.setTimeout(() => {
          try {
            if (!scenarioAudioRef.current) return;
            scenarioAudioRef.current.currentTime = 0;
            void scenarioAudioRef.current.play();
          } catch {
            /* ignore */
          }
        }, 50);
        return;
      }
      setScenarioTtsError("Could not generate scenario audio.");
    } catch {
      setScenarioTtsError("Could not generate scenario audio.");
    } finally {
      setScenarioTtsLoading(false);
    }
  };

  const submitPick = () => {
    if (submitting) return;
    if (!pick) return;
    const nextAnswers = [...answers, pick];
    if (idx + 1 >= allTurns.length) {
      let correct = 0;
      for (let i = 0; i < allTurns.length; i++) {
        if (String(nextAnswers[i] ?? "").trim() === String(allTurns[i]?.correct_answer ?? "").trim()) {
          correct += 1;
        }
      }
      onSubmit({
        user_turn_answers: nextAnswers,
        turns: allTurns.map((t) => ({
          question_en: t.question_en,
          reference_answer_en: t.correct_answer,
        })),
        averageScore0To100: allTurns.length ? (correct / allTurns.length) * 100 : 0,
      });
      return;
    }
    setAnswers(nextAnswers);
    setPick(null);
    setIdx((x) => x + 1);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-[#004AAD]">
        {String(content.scenario_title_en ?? "Interactive conversation (MCQ)")}
      </p>
      <p className="text-xs font-mono font-bold text-neutral-500">
        Phase {phase} · Question {phaseIdx} / {phaseTotal} (Total {idx + 1}/{allTurns.length})
      </p>
      {phase === "A" ? (
        <p className="text-xs font-bold text-neutral-600">
          Phase A: Listen first, then answer scenario-based MCQ.
        </p>
      ) : (
        <p className="text-xs font-bold text-neutral-600">
          Phase B: Continue conversation-response MCQ.
        </p>
      )}

      {isPhaseA && !scenarioUnlocked ? (
        <section className="rounded-[4px] border-4 border-black bg-white p-4">
          {scenarioAudioUrl || generatedScenarioAudioUrl ? (
            <audio
              ref={scenarioAudioRef}
              key={scenarioAudioUrl || generatedScenarioAudioUrl}
              src={scenarioAudioUrl || generatedScenarioAudioUrl || ""}
              preload="none"
              onEnded={() => setScenarioUnlocked(true)}
            />
          ) : null}
          <button
            type="button"
            disabled={submitting || scenarioTtsLoading}
            onClick={() => void playScenarioAudio()}
            className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
          >
            {scenarioTtsLoading ? "Generating scenario audio..." : "Listen to scenario first"}
          </button>
          <p className="mt-2 text-xs font-bold text-neutral-600">
            Scenario text/transcript is hidden. Complete listening first to unlock first 3 questions.
          </p>
          {scenarioTtsError ? <p className="mt-1 text-xs font-bold text-red-700">{scenarioTtsError}</p> : null}
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <section className="rounded-[4px] border-4 border-black bg-neutral-50 p-3">
            {audioSrc ? (
              <audio
                ref={audioRef}
                key={audioSrc}
                src={audioSrc}
                preload="none"
                onEnded={() => setHasListened(true)}
              />
            ) : null}
            {!canAnswer ? (
              <>
                <button
                  type="button"
                  disabled={submitting || ttsLoading}
                  onClick={async () => {
                    setHasListened(false);
                    setTtsError(null);
                    try {
                      if (audioSrc) {
                        if (!audioRef.current) return;
                        audioRef.current.currentTime = 0;
                        await audioRef.current.play();
                        return;
                      }
                      setTtsLoading(true);
                      const res = await fetch("/api/speech-synthesize", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: current.question_en }),
                      });
                      const j = (await res.json().catch(() => ({}))) as { audioBase64?: string; mimeType?: string };
                      if (j.audioBase64 && j.mimeType) {
                        const url = `data:${j.mimeType};base64,${j.audioBase64}`;
                        setGeneratedAudioUrl(url);
                        window.setTimeout(() => {
                          try {
                            if (!audioRef.current) return;
                            audioRef.current.currentTime = 0;
                            void audioRef.current.play();
                          } catch {
                            /* ignore */
                          }
                        }, 50);
                        return;
                      }
                      setTtsError("Could not generate audio for this question.");
                    } catch {
                      setTtsError("Could not generate audio for this question.");
                    } finally {
                      setTtsLoading(false);
                    }
                  }}
                  className="w-full rounded-[4px] border-4 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000] disabled:opacity-50"
                >
                  {ttsLoading ? "Generating audio..." : "Play question audio"}
                </button>
                <p className="mt-2 text-xs font-bold text-neutral-600">Listen first, then answer.</p>
                {ttsError ? <p className="mt-1 text-xs font-bold text-red-700">{ttsError}</p> : null}
              </>
            ) : (
              <p className="rounded-[4px] border-4 border-black bg-emerald-50 p-3 text-xs font-black text-emerald-800">
                Audio finished. You can answer now.
              </p>
            )}
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4">
            {canAnswer && isPhaseA ? (
              <p className="rounded-[4px] border-2 border-[#004AAD] bg-[#004AAD]/5 p-3 text-sm font-bold">
                {current.question_en}
              </p>
            ) : null}
            {canAnswer && !isPhaseA ? (
              <p className="rounded-[4px] border-2 border-[#004AAD]/30 bg-[#004AAD]/5 p-3 text-xs font-bold text-[#004AAD]">
                Audio-only prompt loaded. Choose the best response below.
              </p>
            ) : null}
            <div className="mt-3 space-y-3">
              {(Array.isArray(current.options) ? current.options : []).map((o, optionIdx) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setPick(o)}
                  disabled={submitting || !canAnswer}
                  className={`w-full rounded-[6px] border-4 border-black px-4 py-3 text-left text-sm leading-relaxed shadow-[4px_4px_0_0_#000] ${
                    pick === o ? "bg-[#FFCC00]" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border-2 border-black bg-neutral-100 text-xs font-black">
                      {String.fromCharCode(65 + optionIdx)}
                    </span>
                    <span className="font-semibold">{o}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      <button
        type="button"
        disabled={submitting || (isPhaseA && !scenarioUnlocked) || !pick || !canAnswer}
        onClick={submitPick}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
      >
        {submitting ? "Submitting..." : idx + 1 >= allTurns.length ? "Finish conversation" : "Next question"}
      </button>
    </div>
  );
}
