"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConversationReportPanel } from "@/components/conversation/ConversationReportPanel";
import { ConversationSpeakerButton } from "@/components/conversation/ConversationSpeakerButton";
import { CONVERSATION_SCENARIO_Q_COUNT, CONVERSATION_TOTAL_STEPS } from "@/lib/conversation-constants";
import {
  CONVERSATION_ALL_STEP_INDICES,
  buildConversationRedeemState,
} from "@/lib/conversation-redeem";
import { computeItemOk } from "@/lib/conversation-scoring";
import {
  cancelConversationSpeech,
  ensureSpeechVoices,
  speakConversationLineWithOptionalAudio,
} from "@/lib/conversation-tts";
import {
  conversationMaxForExam,
  getConversationProgress,
  saveConversationProgress,
} from "@/lib/conversation-storage";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import type { ConversationDifficulty, ConversationExam } from "@/types/conversation";

type ConvStage = "scenario_listen" | "scenario_batch" | "main";

function sortSteps(steps: number[]) {
  return [...steps].sort((a, b) => a - b);
}

export function ConversationSessionClient({
  exam,
  round,
  difficulty,
  setNumber,
  startWithRedeem = false,
}: {
  exam: ConversationExam;
  round: number;
  difficulty: ConversationDifficulty;
  setNumber: number;
  startWithRedeem?: boolean;
}) {
  const roundSetsHref = `/practice/listening/interactive/${round}`;
  const restartHref = `/practice/listening/interactive/${round}/${difficulty}/${setNumber}`;
  const maxScore = conversationMaxForExam(exam);

  const [phase, setPhase] = useState<"session" | "report">("session");
  const [activeSteps, setActiveSteps] = useState<number[]>(() => [...CONVERSATION_ALL_STEP_INDICES]);
  const [convStage, setConvStage] = useState<ConvStage>("scenario_listen");
  const [mainWalkIndex, setMainWalkIndex] = useState(0);
  const [scenarioPicks, setScenarioPicks] = useState<(number | null)[]>(() =>
    Array.from({ length: 3 }, () => null),
  );
  const [mainPicks, setMainPicks] = useState<(number | null)[]>(() =>
    Array.from({ length: 5 }, () => null),
  );
  const [mainOptionsUnlocked, setMainOptionsUnlocked] = useState(false);
  const [mainTranscriptShown, setMainTranscriptShown] = useState<boolean[]>(() =>
    Array.from({ length: 5 }, () => false),
  );
  const [ttsBusy, setTtsBusy] = useState(false);
  const [itemOkSnapshot, setItemOkSnapshot] = useState<boolean[]>([]);
  const [scenarioTranscriptVisible, setScenarioTranscriptVisible] = useState(false);
  const [scenarioAudioBusy, setScenarioAudioBusy] = useState(false);
  const [scenarioQuestionBusyIdx, setScenarioQuestionBusyIdx] = useState<number | null>(null);
  const [mainDialogueTextVisible, setMainDialogueTextVisible] = useState(false);
  const [activeVocabWord, setActiveVocabWord] = useState<string | null>(null);
  const [awaitingReportCta, setAwaitingReportCta] = useState(false);

  const scenarioPicksRef = useRef(scenarioPicks);
  const mainPicksRef = useRef(mainPicks);
  scenarioPicksRef.current = scenarioPicks;
  mainPicksRef.current = mainPicks;

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Only reset main dialogue UI when moving to a different main step (not on unrelated re-renders). */
  const mainStepResetKeyRef = useRef<string | null>(null);
  const redeemHydrateSignatureRef = useRef<string | null>(null);

  const scenarioStepsInPlay = useMemo(
    () => sortSteps(activeSteps.filter((s) => s < CONVERSATION_SCENARIO_Q_COUNT)),
    [activeSteps],
  );
  const mainStepsInPlay = useMemo(
    () => sortSteps(activeSteps.filter((s) => s >= CONVERSATION_SCENARIO_Q_COUNT)),
    [activeSteps],
  );

  const currentMainGlobalStep = mainStepsInPlay[mainWalkIndex];
  const mainIndex =
    currentMainGlobalStep !== undefined
      ? currentMainGlobalStep - CONVERSATION_SCENARIO_Q_COUNT
      : -1;

  const correctScenarioIndex = useMemo(
    () => exam.scenarioQuestions.map((q) => q.correctIndex),
    [exam.scenarioQuestions],
  );
  const correctMainIndex = useMemo(
    () => exam.mainQuestions.map((m) => m.correctIndex),
    [exam.mainQuestions],
  );

  const scenarioBatchComplete = useMemo(
    () => scenarioStepsInPlay.every((si) => scenarioPicks[si] != null),
    [scenarioStepsInPlay, scenarioPicks],
  );

  const applySessionFromRedeem = useCallback(
    (active: number[], sp: (number | null)[], mp: (number | null)[]) => {
      setScenarioPicks(sp);
      setMainPicks(mp);
      setMainTranscriptShown(Array.from({ length: 5 }, () => false));
      setActiveSteps(active);
      const hasScenario = active.some((s) => s < CONVERSATION_SCENARIO_Q_COUNT);
      setConvStage(hasScenario ? "scenario_listen" : "main");
      setMainWalkIndex(0);
      setMainOptionsUnlocked(false);
      setScenarioTranscriptVisible(false);
      setMainDialogueTextVisible(false);
      setAwaitingReportCta(false);
      setScenarioQuestionBusyIdx(null);
      setPhase("session");
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    ensureSpeechVoices(() => {});
  }, []);

  useEffect(() => {
    if (!startWithRedeem) {
      redeemHydrateSignatureRef.current = null;
      return;
    }
    const signature = `${exam.id}:${round}:${difficulty}:${setNumber}`;
    if (redeemHydrateSignatureRef.current === signature) return;

    const prog = getConversationProgress(round, difficulty, setNumber);
    const ok = prog?.lastItemOk;
    if (!ok || ok.length !== CONVERSATION_TOTAL_STEPS || ok.every(Boolean)) {
      redeemHydrateSignatureRef.current = signature;
      return;
    }
    const { activeSteps: nextActive, scenarioPicks: sp, mainPicks: mp } = buildConversationRedeemState(
      exam,
      ok,
    );
    applySessionFromRedeem(nextActive, sp, mp);
    redeemHydrateSignatureRef.current = signature;
  }, [startWithRedeem, round, difficulty, setNumber, exam, applySessionFromRedeem]);

  useEffect(() => {
    if (convStage !== "main" || mainIndex < 0) {
      mainStepResetKeyRef.current = null;
      return;
    }
    const stepKey = `${convStage}:${mainWalkIndex}:${mainIndex}`;
    if (mainStepResetKeyRef.current === stepKey) {
      return;
    }
    mainStepResetKeyRef.current = stepKey;

    setMainOptionsUnlocked(false);
    setMainDialogueTextVisible(false);
    setAwaitingReportCta(false);
    cancelConversationSpeech();
    setTtsBusy(false);
    setScenarioAudioBusy(false);
    setScenarioQuestionBusyIdx(null);
  }, [convStage, mainWalkIndex, mainIndex]);

  const goToReport = useCallback(
    (sp: (number | null)[], mp: (number | null)[]) => {
      const itemOk = computeItemOk(sp, mp, {
        correctScenarioIndex,
        correctMainIndex,
      });
      setItemOkSnapshot(itemOk);
      saveConversationProgress({
        round,
        difficulty,
        setNumber,
        itemOk,
        maxScore: conversationMaxForExam(exam),
      });
      setPhase("report");
    },
    [correctScenarioIndex, correctMainIndex, round, difficulty, setNumber, exam],
  );

  const playScenarioAudio = () => {
    playBlinkBeep();
    cancelConversationSpeech();
    setTtsBusy(false);
    setScenarioQuestionBusyIdx(null);
    setScenarioAudioBusy(true);
    speakConversationLineWithOptionalAudio(
      exam.scenario,
      { audioBase64: exam.scenarioAudioBase64, audioMimeType: exam.scenarioAudioMimeType },
      {
        onEnd: () => setScenarioAudioBusy(false),
      },
    );
  };

  const speakScenarioQuestion = (si: number) => {
    playBlinkBeep();
    cancelConversationSpeech();
    setScenarioAudioBusy(false);
    setTtsBusy(false);
    setScenarioQuestionBusyIdx(si);
    speakConversationLineWithOptionalAudio(
      exam.scenarioQuestions[si].question,
      {
        audioBase64: exam.scenarioQuestions[si].audioBase64,
        audioMimeType: exam.scenarioQuestions[si].audioMimeType,
      },
      {
        onEnd: () => setScenarioQuestionBusyIdx(null),
      },
    );
  };

  const toggleScenarioTranscript = () => {
    playBlinkBeep();
    setScenarioTranscriptVisible((v) => !v);
  };

  const toggleMainDialogueText = () => {
    playBlinkBeep();
    setMainDialogueTextVisible((v) => !v);
  };

  const playMainAudio = () => {
    playBlinkBeep();
    if (mainIndex < 0) return;
    cancelConversationSpeech();
    setScenarioAudioBusy(false);
    setScenarioQuestionBusyIdx(null);
    setTtsBusy(true);
    speakConversationLineWithOptionalAudio(
      exam.mainQuestions[mainIndex].transcript,
      {
        audioBase64: exam.mainQuestions[mainIndex].audioBase64,
        audioMimeType: exam.mainQuestions[mainIndex].audioMimeType,
      },
      {
        onStart: () => setMainOptionsUnlocked(true),
        onEnd: () => setTtsBusy(false),
      },
    );
  };

  const submitScenarioPick = (si: number, j: number) => {
    playBlinkBeep();
    if (!scenarioStepsInPlay.includes(si)) return;
    const nextSp = [...scenarioPicksRef.current];
    nextSp[si] = j;
    scenarioPicksRef.current = nextSp;
    setScenarioPicks(nextSp);
  };

  const moveOnToMainQuestions = () => {
    playBlinkBeep();
    const hasMain = activeSteps.some((s) => s >= CONVERSATION_SCENARIO_Q_COUNT);
    if (!hasMain) {
      goToReport([...scenarioPicksRef.current], [...mainPicksRef.current]);
      return;
    }
    setConvStage("main");
    setMainWalkIndex(0);
    setMainOptionsUnlocked(false);
    setMainDialogueTextVisible(false);
    setAwaitingReportCta(false);
  };

  const selectMainOption = (j: number) => {
    playBlinkBeep();
    if (mainIndex < 0) return;
    if (mainPicksRef.current[mainIndex] != null) return;
    const next = [...mainPicksRef.current];
    next[mainIndex] = j;
    mainPicksRef.current = next;
    setMainPicks(next);
    setMainTranscriptShown((prev) => {
      const nt = [...prev];
      nt[mainIndex] = true;
      return nt;
    });

    const isLastMain = mainWalkIndex >= mainStepsInPlay.length - 1;
    if (isLastMain) {
      setAwaitingReportCta(true);
      return;
    }

    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      setMainWalkIndex((w) => w + 1);
    }, 420);
  };

  const startRedeem = () => {
    const { activeSteps: nextActive, scenarioPicks: sp, mainPicks: mp } = buildConversationRedeemState(
      exam,
      itemOkSnapshot,
    );
    applySessionFromRedeem(nextActive, sp, mp);
  };

  const mainPickedLast =
    mainIndex >= 0 && mainPicks[mainIndex] != null && mainTranscriptShown[mainIndex];

  const progressLabel =
    convStage === "main" && mainStepsInPlay.length
      ? `Main dialogue ${mainWalkIndex + 1}/${mainStepsInPlay.length}`
      : convStage === "scenario_batch"
        ? `Scenario questions (${scenarioStepsInPlay.length})`
        : scenarioStepsInPlay.length
          ? "Listen to the scenario"
          : null;

  if (phase === "report") {
    return (
      <div className="ep-luxury-option-in space-y-6">
        <Link
          href={roundSetsHref}
          onClick={() => playBlinkBeep()}
          className="ep-link-luxury inline-block text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-4 hover:underline"
        >
          ← All sets
        </Link>
        <ConversationReportPanel
          exam={exam}
          scenarioPicks={scenarioPicks}
          mainPicks={mainPicks}
          itemOk={itemOkSnapshot}
          onRedeemNow={startRedeem}
          backHref={roundSetsHref}
          restartHref={restartHref}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[min(100vh,960px)] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
        <Link
          href={roundSetsHref}
          onClick={() => playBlinkBeep()}
          className="ep-link-luxury text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-4 hover:underline"
        >
          ← All sets
        </Link>
        <p className="max-w-[16rem] text-right text-xs font-bold text-neutral-600">{exam.title}</p>
      </div>

      {scenarioStepsInPlay.length > 0 && convStage !== "main" ? (
        <div className="ep-panel-luxury mb-4 min-h-0 shrink-0 border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">Scenario</p>
          {convStage === "scenario_listen" ? (
            <>
              <p className="mt-2 text-xs text-neutral-600">
                Click the speaker to listen. Open the transcript only when you want to read along.
              </p>
              <div className="mt-6 flex flex-col items-center gap-4">
                <ConversationSpeakerButton
                  isPlaying={scenarioAudioBusy}
                  onClick={playScenarioAudio}
                  label="Click here to listen to the scenario"
                  subLabel={scenarioAudioBusy ? "Playing…" : "Tap the speaker"}
                />
                <button
                  type="button"
                  onClick={toggleScenarioTranscript}
                  className="ep-btn-luxury border-4 border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000] hover:bg-ep-yellow/30"
                >
                  {scenarioTranscriptVisible ? "Hide transcript" : "Show transcript"}
                </button>
              </div>
              <p
                className={`ep-stat ep-fade-hint mt-4 text-center text-xs font-bold text-neutral-400 ${
                  scenarioTranscriptVisible ? "ep-fade-hint--hidden" : ""
                }`}
              >
                Transcript hidden
              </p>
              <div
                className={`ep-luxury-reveal ${scenarioTranscriptVisible ? "ep-luxury-reveal--open" : ""}`}
              >
                <div className="ep-luxury-reveal__inner">
                  <div className="ep-luxury-reveal__content">
                    <p className="pb-1 pt-1 text-sm leading-relaxed text-neutral-900">{exam.scenario}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t-2 border-dashed border-neutral-300 pt-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-neutral-600">
                  Tap highlighted words to view Thai meaning
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {exam.highlightedWords.map((h) => (
                    <button
                      key={h.word}
                      type="button"
                      onClick={() => {
                        playBlinkBeep();
                        setActiveVocabWord((prev) => (prev === h.word ? null : h.word));
                      }}
                      className="ep-btn-luxury border-2 border-black bg-white px-2 py-1 text-xs font-black shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/20"
                    >
                      {h.word}
                    </button>
                  ))}
                </div>
                {activeVocabWord ? (
                  <p className="mt-2 text-xs font-bold text-ep-blue">
                    {activeVocabWord}:{" "}
                    {exam.highlightedWords.find((h) => h.word === activeVocabWord)?.translation ?? "-"}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  playBlinkBeep();
                  setConvStage("scenario_batch");
                }}
                className="ep-btn-luxury mt-8 w-full border-4 border-black bg-ep-yellow py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
              >
                Show the {scenarioStepsInPlay.length} comprehension question
                {scenarioStepsInPlay.length === 1 ? "" : "s"}
              </button>
            </>
          ) : (
            <div className="ep-luxury-option-in mt-2">
              <p className="text-xs font-bold text-neutral-700">
                Answer every scenario question below, then continue to the main dialogue.
              </p>
              <ul className="mt-6 grid gap-8">
                {scenarioStepsInPlay.map((si) => (
                  <li
                    key={si}
                    className="rounded-sm border-4 border-black bg-neutral-50/80 p-4 shadow-[4px_4px_0_0_#000]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-ep-blue">
                      Scenario Q{si + 1}
                    </p>
                    <p className="mt-2 text-sm font-bold text-neutral-900">
                      {exam.scenarioQuestions[si].question}
                    </p>
                    <div className="mt-4 flex justify-center">
                      <ConversationSpeakerButton
                        size="md"
                        isPlaying={scenarioQuestionBusyIdx === si}
                        onClick={() => speakScenarioQuestion(si)}
                        label="Click here to play the question"
                        subLabel={scenarioQuestionBusyIdx === si ? "Playing…" : undefined}
                      />
                    </div>
                    <ul className="mt-4 grid gap-2">
                      {exam.scenarioQuestions[si].options.map((opt, j) => {
                        const picked = scenarioPicks[si];
                        const isPicked = picked === j;
                        return (
                          <li key={j}>
                            <button
                              type="button"
                              onClick={() => submitScenarioPick(si, j)}
                              className={`ep-btn-luxury w-full border-4 border-black px-3 py-3 text-left text-sm font-bold shadow-[2px_2px_0_0_#000] ${
                                isPicked ? "bg-ep-blue text-white" : "bg-white hover:bg-ep-yellow/25"
                              }`}
                            >
                              <span className="ep-stat opacity-80">{j + 1}.</span> {opt}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!scenarioBatchComplete}
                onClick={moveOnToMainQuestions}
                className="ep-btn-luxury mt-8 w-full border-4 border-black bg-ep-yellow py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {mainStepsInPlay.length
                  ? "Move on to main questions"
                  : "See my report"}
              </button>
            </div>
          )}
        </div>
      ) : null}

      <div className="ep-panel-luxury min-h-0 flex-1 overflow-y-auto border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        {progressLabel ? (
          <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            {progressLabel} · max {maxScore} pts
          </p>
        ) : (
          <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Main dialogue · max {maxScore} pts
          </p>
        )}

        {convStage === "main" && mainIndex >= 0 ? (
          <div key={`dialogue-${mainIndex}-${mainWalkIndex}`} className="ep-luxury-option-in mt-4">
            <p className="text-xs font-black uppercase tracking-wide text-ep-blue">
              Dialogue {mainIndex + 1}/5
            </p>
            <p className="mt-2 text-xs text-neutral-600">
              Play the line of dialogue first. Options unlock when audio starts. After you answer, the next line
              appears automatically (until the last question).
            </p>
            <div className="mt-6 flex justify-center">
              <ConversationSpeakerButton
                isPlaying={ttsBusy}
                onClick={playMainAudio}
                label="Click here to play"
                subLabel={ttsBusy ? "Playing…" : "Hear this line of dialogue"}
              />
            </div>
            <button
              type="button"
              onClick={toggleMainDialogueText}
              className="ep-btn-luxury mt-6 w-full border-4 border-black bg-white py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/25"
            >
              {mainDialogueTextVisible ? "Hide transcript" : "Click here to see transcript"}
            </button>
            <div
              className={`ep-luxury-reveal mt-4 ${mainDialogueTextVisible ? "ep-luxury-reveal--open" : ""}`}
            >
              <div className="ep-luxury-reveal__inner">
                <div className="ep-luxury-reveal__content">
                  <div className="space-y-3 border-4 border-black bg-neutral-50 p-3 shadow-[3px_3px_0_0_#000]">
                    <p className="text-[10px] font-bold uppercase text-ep-blue">Question</p>
                    <p className="text-sm font-bold text-neutral-900">{exam.mainQuestions[mainIndex].question}</p>
                    <p className="text-[10px] font-bold uppercase text-neutral-500">Transcript (spoken line)</p>
                    <p className="text-sm leading-relaxed text-neutral-800">
                      {exam.mainQuestions[mainIndex].transcript}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {!mainOptionsUnlocked ? (
              <p className="mt-4 text-center text-xs font-bold text-neutral-500">
                Options unlock when speech starts.
              </p>
            ) : null}
            {mainOptionsUnlocked && mainPicks[mainIndex] == null ? (
              <ul className="mt-4 grid gap-2">
                {exam.mainQuestions[mainIndex].options.map((opt, j) => (
                  <li
                    key={j}
                    className="ep-luxury-option-in"
                    style={{ animationDelay: `${j * 72}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => selectMainOption(j)}
                      className="ep-btn-luxury w-full border-4 border-black bg-white px-3 py-3 text-left text-sm font-bold shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/25"
                    >
                      <span className="ep-stat text-neutral-500">{j + 1}.</span> {opt}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {mainPickedLast && awaitingReportCta ? (
              <div className="ep-luxury-option-in mt-6 space-y-4 border-4 border-ep-blue/40 bg-ep-yellow/10 p-4 shadow-[3px_3px_0_0_#000]">
                <p className="text-[10px] font-bold uppercase text-ep-blue">Spoken line</p>
                <p className="text-sm leading-relaxed text-neutral-900">
                  {exam.mainQuestions[mainIndex].transcript}
                </p>
                <button
                  type="button"
                  onClick={() => goToReport([...scenarioPicksRef.current], [...mainPicksRef.current])}
                  className="ep-btn-luxury w-full border-4 border-black bg-ep-blue py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#000] hover:opacity-95"
                >
                  See my report
                </button>
              </div>
            ) : null}
            {mainPickedLast && !awaitingReportCta ? (
              <p className="ep-luxury-option-in mt-4 text-center text-xs font-bold text-ep-blue">
                Moving to the next line…
              </p>
            ) : null}
          </div>
        ) : null}

        {convStage === "main" && mainStepsInPlay.length === 0 ? (
          <p className="mt-6 text-sm font-bold text-neutral-600">No main dialogue steps in this session.</p>
        ) : null}
      </div>
    </div>
  );
}
