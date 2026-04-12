"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { QuestionRouter } from "@/components/mock-test/questions/QuestionRouter";
import { MockTestTimerBar } from "@/components/mock-test/MockTestTimerBar";
import {
  MockTestTransitionOverlay,
  type MockTestTransitionVariant,
} from "@/components/mock-test/MockTestTransitionOverlay";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { usePhaseTimer } from "@/hooks/usePhaseTimer";
import { VOCAB_READING_MOCK_STEPS } from "@/lib/mock-test/vocabulary-reading-mock";
import { gradeVocabularyReadingStep } from "@/lib/mock-test/vocabulary-reading-mock";
import type { AssemblySlot, V2AssemblyState } from "@/lib/mock-test/v2/types";
import { v2FallbackSecondsForSlot } from "@/lib/mock-test/v2/slot-time-defaults";
import type { MockQuestionRow } from "@/lib/mock-test/types";
import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type SessionRow = {
  id: string;
  engine_version: number;
  assembly: V2AssemblyState & {
    accumulator?: {
      usedContentFamilies: string[];
      usedQuestionIds: string[];
      usedAssetKeys: string[];
    };
  };
};

export function MockTestV2SessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { resetTimer, ...timer } = usePhaseTimer();

  const [session, setSession] = useState<SessionRow | null>(null);
  const [questions, setQuestions] = useState<Record<string, MockQuestionRow>>({});
  const [stage, setStage] = useState(1);
  const [slotIdx, setSlotIdx] = useState(0);
  const [stageAnswers, setStageAnswers] = useState<Record<string, unknown>>({});
  const [vocabStep, setVocabStep] = useState(0);
  const [vocabScores, setVocabScores] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [transitionOverlay, setTransitionOverlay] =
    useState<MockTestTransitionVariant | null>(null);

  const slots = session?.assembly?.slots ?? [];
  const stageSlots = useMemo(
    () => slots.filter((s) => s.stage === stage).sort((a, b) => a.orderIndex - b.orderIndex),
    [slots, stage],
  );
  const currentSlot = stageSlots[slotIdx] ?? null;
  const currentQ = currentSlot ? questions[currentSlot.questionId] : null;

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/mock-test/session/${sessionId}`, { credentials: "same-origin" });
    const j = (await res.json()) as { session?: SessionRow };
    if (!j.session) {
      setError("Session not found");
      return;
    }
    setSession(j.session);
  }, [sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!currentSlot) return;
    const sec =
      currentSlot.timeLimitSec != null && currentSlot.timeLimitSec > 0
        ? currentSlot.timeLimitSec
        : v2FallbackSecondsForSlot(currentSlot);
    resetTimer(stage, sec);
  }, [stage, currentSlot, resetTimer]);

  useEffect(() => {
    if (!supabase || !currentSlot) return;
    void (async () => {
      const { data, error: e } = await supabase
        .from("mock_questions")
        .select("*")
        .eq("id", currentSlot.questionId)
        .maybeSingle();
      if (e || !data) {
        setError(e?.message ?? "Question missing");
        return;
      }
      setQuestions((prev) => ({ ...prev, [currentSlot.questionId]: data as MockQuestionRow }));
    })();
  }, [supabase, currentSlot]);

  const submitWholeStage = async (answers: Record<string, unknown>) => {
    setTransitionOverlay("submittingStage");
    setError(null);
    try {
      const res = await fetch(`/api/mock-test/v2/session/${sessionId}/submit-stage`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          responses: Object.entries(answers).map(([slotId, answer]) => ({ slotId, answer })),
        }),
      });
      const j = (await res.json()) as { error?: string; complete?: boolean; placement?: unknown };
      if (!res.ok || j.error) {
        setError(j.error ?? "Submit failed");
        return;
      }
      if (j.complete) {
        router.push(`/mock-test/results/${sessionId}`);
        return;
      }
      await loadSession();
      setStage((s) => s + 1);
      setSlotIdx(0);
      setStageAnswers({});
      setVocabStep(0);
      setVocabScores([]);
    } finally {
      setTransitionOverlay(null);
    }
  };

  const onSlotAnswer = async (answer: unknown) => {
    if (!currentSlot || !currentQ) return;

    if (currentQ.question_type === "vocabulary_reading") {
      const inner =
        typeof answer === "object" && answer && "answer" in answer
          ? (answer as { answer: { step: number; choice: string } }).answer
          : (answer as { step: number; choice: string });
      const ok = gradeVocabularyReadingStep(
        currentQ.content as never,
        inner.step,
        inner.choice,
      );
      const nextScores = [...vocabScores, ok ? 100 : 0];
      setVocabScores(nextScores);
      const nextStep = vocabStep + 1;
      if (nextStep < VOCAB_READING_MOCK_STEPS) {
        setVocabStep(nextStep);
        return;
      }
      const avg = nextScores.reduce((a, b) => a + b, 0) / VOCAB_READING_MOCK_STEPS;
      const wrapped = { averageScore0To100: avg };
      const next = { ...stageAnswers, [currentSlot.slotId]: wrapped };
      setStageAnswers(next);
      if (slotIdx + 1 >= stageSlots.length) {
        await submitWholeStage(next);
      } else {
        setTransitionOverlay("adapting");
        await new Promise((r) => setTimeout(r, 800));
        setSlotIdx((i) => i + 1);
        setVocabStep(0);
        setVocabScores([]);
        setTransitionOverlay(null);
      }
      return;
    }

    const next = { ...stageAnswers, [currentSlot.slotId]: answer };
    setStageAnswers(next);
    if (slotIdx + 1 >= stageSlots.length) {
      await submitWholeStage(next);
    } else {
      setTransitionOverlay("adapting");
      await new Promise((r) => setTimeout(r, 800));
      setSlotIdx((i) => i + 1);
      setTransitionOverlay(null);
    }
  };

  if (error) {
    return <p className="p-6 font-bold text-red-800">{error}</p>;
  }
  if (!session || !currentSlot || !currentQ) {
    return <p className="p-6 text-neutral-600">กำลังโหลด… / Loading…</p>;
  }

  const progress = slotIdx / Math.max(1, stageSlots.length);

  return (
    <StudySessionBoundary skill="mock_test" exerciseType="mock_test" setId={sessionId}>
      <MockTestTransitionOverlay
        open={transitionOverlay != null}
        variant={transitionOverlay ?? "adapting"}
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className={`${mt.gridBg} ${mt.border} ${mt.shadow} rounded-[4px] p-4`}>
          <p className="text-sm font-black text-[#004AAD]">
            Mock test v2 · Stage {stage} · Item {slotIdx + 1}/{stageSlots.length}
          </p>
          <div className="mt-2 h-2 w-full border-4 border-black bg-neutral-200">
            <div className="h-full bg-[#004AAD]" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <MockTestTimerBar
          progress={timer.progress}
          isWarning={timer.isWarning}
          isCritical={timer.isCritical}
          formattedTime={timer.formattedTime}
        />
        <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
          <QuestionRouter
            question={currentQ}
            phaseProgress={
              currentQ.question_type === "vocabulary_reading" ? vocabStep : 0
            }
            onSubmit={onSlotAnswer}
          />
        </div>
      </div>
    </StudySessionBoundary>
  );
}
