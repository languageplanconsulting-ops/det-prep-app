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
import {
  applyAdaptiveAnswer,
  getNextQuestion,
  pointsForDifficulty,
} from "@/lib/mock-test/adaptive-engine";
import {
  isAdaptivePhase,
  MOCK_TEST_PHASE_COUNT,
  PHASE_QUESTION_COUNTS,
  PHASE_QUESTION_TYPE,
} from "@/lib/mock-test/constants";
import { mt } from "@/lib/mock-test/mock-test-styles";
import { abandonStaleMockSessions } from "@/lib/mock-test/session-integrity";
import type { VocabularyReadingMockContent } from "@/lib/mock-test/vocabulary-reading-mock";
import { gradeVocabularyReadingStep } from "@/lib/mock-test/vocabulary-reading-mock";
import type { AdaptiveState, MockQuestionRow, PhaseResponseItem } from "@/lib/mock-test/types";
import { usePhaseTimer } from "@/hooks/usePhaseTimer";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { Difficulty } from "@/lib/access-control";

type PhaseResponses = Record<string, { items: PhaseResponseItem[] }>;

function normalizeTyped(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9\s']/g, "");
}

function parseCorrectAnswer(q: MockQuestionRow, answer: unknown): boolean {
  if (q.question_type === "fill_in_blanks") {
    const content = q.content as {
      missingWords?: Array<{ correctWord?: string }>;
    };
    const mw = Array.isArray(content.missingWords) ? content.missingWords : [];
    if (mw.length > 0) {
      const rawAnswer =
        typeof answer === "object" && answer && "answer" in answer
          ? (answer as { answer: unknown }).answer
          : answer;
      const attemptArr =
        rawAnswer &&
        typeof rawAnswer === "object" &&
        "answers" in (rawAnswer as Record<string, unknown>) &&
        Array.isArray((rawAnswer as { answers?: unknown[] }).answers)
          ? ((rawAnswer as { answers: unknown[] }).answers as unknown[])
          : [];
      if (attemptArr.length !== mw.length) return false;
      return mw.every((w, i) => {
        const correct = String(w?.correctWord ?? "").trim().toLowerCase();
        const got = String(attemptArr[i] ?? "").trim().toLowerCase();
        return correct.length > 0 && got === correct;
      });
    }
  }

  if (q.question_type === "vocabulary_reading") {
    const inner =
      typeof answer === "object" && answer && "answer" in answer
        ? (answer as { answer: { step: number; choice: string } }).answer
        : (answer as { step: number; choice: string });
    if (
      typeof inner !== "object" ||
      inner === null ||
      typeof inner.step !== "number" ||
      typeof inner.choice !== "string"
    ) {
      return false;
    }
    return gradeVocabularyReadingStep(
      q.content as unknown as VocabularyReadingMockContent,
      inner.step,
      inner.choice,
    );
  }

  const ca = q.correct_answer as { answer?: string } | null;
  if (!ca || typeof ca.answer !== "string") return false;
  const raw =
    typeof answer === "object" && answer && "answer" in answer
      ? String((answer as { answer: string }).answer)
      : String(answer);
  if (q.question_type === "dictation") {
    return normalizeTyped(raw) === normalizeTyped(ca.answer);
  }
  return raw.trim().toLowerCase() === ca.answer.trim().toLowerCase();
}

export function MockTestSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { resetTimer, ...timer } = usePhaseTimer();

  const [phase, setPhase] = useState(1);
  const [adaptive, setAdaptive] = useState<AdaptiveState>({
    phase: 1,
    currentDifficulty: "medium",
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
  });
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [pool, setPool] = useState<MockQuestionRow[]>([]);
  const [currentQ, setCurrentQ] = useState<MockQuestionRow | null>(null);
  const [phaseResponses, setPhaseResponses] = useState<PhaseResponses>({});
  const [transitionOverlay, setTransitionOverlay] =
    useState<MockTestTransitionVariant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const needed = PHASE_QUESTION_COUNTS[phase] ?? 1;

  const fetchPool = useCallback(
    async (p: number, difficulty: Difficulty): Promise<MockQuestionRow[]> => {
      const primary = PHASE_QUESTION_TYPE[p];
      const typeAlts = [primary];
      if (primary === "read_and_write") typeAlts.push("essay_writing");
      if (primary === "conversation_summary") typeAlts.push("summarize_conversation");

      const { data, error: e } = await supabase
        .from("mock_questions")
        .select("*")
        .eq("phase", p)
        .eq("difficulty", difficulty)
        .in("question_type", typeAlts)
        .eq("is_active", true);
      if (e) {
        setError(e.message);
        return [];
      }
      const rows = (data ?? []) as MockQuestionRow[];
      setPool(rows);
      return rows;
    },
    [supabase],
  );

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        setError(
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local. / ไม่พบการตั้งค่า Supabase",
        );
        setReady(true);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await abandonStaleMockSessions(supabase, user.id);
      setReady(true);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!ready) return;
    resetTimer(phase);
    const boot = async () => {
      if (isAdaptivePhase(phase)) {
        setAdaptive({
          phase,
          currentDifficulty: "medium",
          consecutiveCorrect: 0,
          consecutiveWrong: 0,
        });
        setUsedIds([]);
        const rows = await fetchPool(phase, "medium");
        const first = getNextQuestion(phase, "medium", [], rows);
        setCurrentQ(first);
        if (!first) {
          setError(
            "ไม่มีข้อสอบในฐานข้อมูล — ให้แอดมินอัปโหลดข้อสอบ / No questions in bank.",
          );
        }
      } else {
        setUsedIds([]);
        const rows = await fetchPool(phase, "medium");
        const first = getNextQuestion(phase, "medium", [], rows);
        setCurrentQ(first);
        if (!first) {
          setError(
            "ไม่มีข้อสอบในฐานข้อมูล — ให้แอดมินอัปโหลดข้อสอบ / No questions in bank.",
          );
        }
      }
    };
    void boot();
  }, [phase, ready, fetchPool, resetTimer]);

  useEffect(() => {
    if (!timer.isExpired) return;
    if (phase >= MOCK_TEST_PHASE_COUNT) {
      router.push(`/mock-test/processing/${sessionId}`);
      return;
    }
    setTransitionOverlay("nextSection");
    setTimeout(() => {
      setTransitionOverlay(null);
      setPhase((p) => p + 1);
    }, 2000);
  }, [timer.isExpired, phase, router, sessionId]);

  const persistSession = useCallback(
    async (body: Record<string, unknown>) => {
      await fetch(`/api/mock-test/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
    },
    [sessionId],
  );

  const handleSubmit = async (answer: unknown) => {
    if (!currentQ) return;
    const difficulty = currentQ.difficulty as Difficulty;
    const isCorrect = currentQ.is_ai_graded
      ? true
      : parseCorrectAnswer(currentQ, answer);
    const pts = isCorrect ? pointsForDifficulty(difficulty) : 0;

    let nextAdaptive = adaptive;
    // Phases 1–3: adaptive difficulty. Phase 4 is vocabulary_reading only — single bank tier per item; do not drift tier between sub-steps.
    if (isAdaptivePhase(phase) && !currentQ.is_ai_graded && phase < 4) {
      nextAdaptive = applyAdaptiveAnswer({ ...adaptive, phase }, isCorrect);
    }
    setAdaptive(nextAdaptive);

    const item: PhaseResponseItem = {
      questionId: currentQ.id,
      questionType: currentQ.question_type,
      difficulty,
      isCorrect: currentQ.is_ai_graded ? true : isCorrect,
      pointsEarned: pts,
      answer,
      timestamp: new Date().toISOString(),
    };

    const key = String(phase);
    const prevItems = phaseResponses[key]?.items ?? [];
    const newItems = [...prevItems, item];
    const nextPr: PhaseResponses = {
      ...phaseResponses,
      [key]: { items: newItems },
    };
    setPhaseResponses(nextPr);

    const isVocabComposite =
      phase === 4 && currentQ.question_type === "vocabulary_reading";
    const nextUsed =
      isVocabComposite && newItems.length < needed
        ? usedIds
        : [...usedIds, currentQ.id];
    setUsedIds(nextUsed);

    await persistSession({
      current_phase: phase,
      phase_responses: nextPr,
      current_difficulty: nextAdaptive.currentDifficulty,
      consecutive_correct: nextAdaptive.consecutiveCorrect,
      consecutive_wrong: nextAdaptive.consecutiveWrong,
    });

    if (newItems.length >= needed) {
      if (phase >= MOCK_TEST_PHASE_COUNT) {
        router.push(`/mock-test/processing/${sessionId}`);
        return;
      }
      setTransitionOverlay("nextSection");
      setTimeout(() => {
        setTransitionOverlay(null);
        setPhase((p) => p + 1);
      }, 2000);
      return;
    }

    if (isVocabComposite) {
      setCurrentQ(currentQ);
      return;
    }

    const showAdaptingOverlay = phase >= 1 && phase <= 3;
    if (showAdaptingOverlay) {
      setTransitionOverlay("adapting");
    }

    const diffForNext = isAdaptivePhase(phase)
      ? nextAdaptive.currentDifficulty
      : ("medium" as Difficulty);
    let rows = pool;
    if (
      isAdaptivePhase(phase) &&
      !isVocabComposite &&
      nextAdaptive.currentDifficulty !== difficulty
    ) {
      rows = await fetchPool(phase, nextAdaptive.currentDifficulty);
    }
    const nextQ = getNextQuestion(phase, diffForNext, nextUsed, rows);

    const minMs = showAdaptingOverlay ? 850 : 0;
    await new Promise((r) => setTimeout(r, minMs));

    setTransitionOverlay(null);
    setCurrentQ(nextQ);
    if (!nextQ) {
      setError("หาข้อถัดไปไม่ได้ — ฐานข้อสอบไม่เพียงพอ / Could not load next question.");
    }
  };

  if (!ready) {
    return (
      <p className="p-8 text-center font-bold text-neutral-600">กำลังโหลด…</p>
    );
  }

  const diffColor =
    adaptive.currentDifficulty === "easy"
      ? "#16a34a"
      : adaptive.currentDifficulty === "hard"
        ? "#dc2626"
        : "#004AAD";

  return (
    <StudySessionBoundary skill="mock_test" exerciseType="mock_test" setId={sessionId}>
      <MockTestTransitionOverlay
        open={transitionOverlay != null}
        variant={transitionOverlay ?? "adapting"}
      />
      {error ? (
        <div className="mx-auto max-w-lg p-8 text-center">
          <p className="font-bold text-red-800">{error}</p>
        </div>
      ) : transitionOverlay != null ? null : (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div
        className={`${mt.gridBg} ${mt.border} ${mt.shadow} rounded-[4px] p-4`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-[#004AAD]">
            Phase {phase} of {MOCK_TEST_PHASE_COUNT} ·{" "}
            {PHASE_QUESTION_TYPE[phase]?.replace(/_/g, " ")}
            {phase === 4 &&
            currentQ?.question_type === "vocabulary_reading" ? (
              <span className="font-mono text-xs text-neutral-600">
                {" "}
                · {phaseResponses["4"]?.items?.length ?? 0}/{needed}
              </span>
            ) : null}
          </p>
          {isAdaptivePhase(phase) ? (
            <span
              className="rounded-[4px] border-4 border-black px-2 py-1 text-xs font-black"
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                color: diffColor,
              }}
            >
              {adaptive.currentDifficulty.toUpperCase()}
            </span>
          ) : null}
        </div>
        <div className="mt-2 h-2 w-full border-4 border-black bg-neutral-200">
          <div
            className="h-full bg-[#004AAD]"
            style={{ width: `${(phase / MOCK_TEST_PHASE_COUNT) * 100}%` }}
          />
        </div>
      </div>

      <MockTestTimerBar
        progress={timer.progress}
        isWarning={timer.isWarning}
        isCritical={timer.isCritical}
        formattedTime={timer.formattedTime}
      />

      {currentQ ? (
        <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
          <QuestionRouter
            question={currentQ}
            phaseProgress={
              phase === 4 &&
              currentQ.question_type === "vocabulary_reading"
                ? (phaseResponses[String(phase)]?.items?.length ?? 0)
                : 0
            }
            onSubmit={handleSubmit}
          />
        </div>
      ) : (
        <p className="text-center font-bold">กำลังเตรียมข้อสอบ…</p>
      )}
    </div>
      )}
    </StudySessionBoundary>
  );
}
