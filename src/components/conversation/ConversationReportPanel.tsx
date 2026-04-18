"use client";

import Link from "next/link";
import { useState } from "react";
import { CONVERSATION_SCENARIO_Q_COUNT, CONVERSATION_TOTAL_STEPS } from "@/lib/conversation-constants";
import { conversationExplanationThai } from "@/lib/conversation-report-helpers";
import { conversationScore, countConversationCorrect } from "@/lib/conversation-scoring";
import { conversationMaxForExam } from "@/lib/conversation-storage";
import { cancelConversationSpeech, speakConversationLineWithOptionalAudio } from "@/lib/conversation-tts";
import {
  NOTEBOOK_BUILTIN,
  addNotebookEntry,
  normalizeCategoryIds,
} from "@/lib/notebook-storage";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import type { ConversationExam, ConversationMainQuestion } from "@/types/conversation";

export function ConversationReportPanel({
  exam,
  scenarioPicks,
  mainPicks,
  itemOk,
  onRedeemNow,
  backHref,
  restartHref,
}: {
  exam: ConversationExam;
  scenarioPicks: (number | null)[];
  mainPicks: (number | null)[];
  itemOk: boolean[];
  onRedeemNow: () => void;
  /** Round page listing all Easy + Medium sets */
  backHref: string;
  /** Same set URL without redeem — full restart from the beginning */
  restartHref: string;
}) {
  const maxScore = conversationMaxForExam(exam);
  const correct = countConversationCorrect(itemOk);
  const points =
    itemOk.length === CONVERSATION_TOTAL_STEPS ? conversationScore(correct, maxScore) : 0;
  const pctCorrect =
    itemOk.length > 0 ? Math.round((correct / Math.min(itemOk.length, CONVERSATION_TOTAL_STEPS)) * 100) : 0;
  const mastered = itemOk.length === CONVERSATION_TOTAL_STEPS && itemOk.every(Boolean);
  const [speakingLine, setSpeakingLine] = useState<string | null>(null);
  const [addedWords, setAddedWords] = useState<Set<string>>(() => new Set());
  const [knownWords, setKnownWords] = useState<Set<string>>(() => new Set());

  const playLine = (mq: ConversationMainQuestion, key: string) => {
    playBlinkBeep();
    cancelConversationSpeech();
    setSpeakingLine(key);
    speakConversationLineWithOptionalAudio(
      mq.transcript,
      { audioBase64: mq.audioBase64, audioMimeType: mq.audioMimeType },
      {
        onEnd: () => setSpeakingLine((s) => (s === key ? null : s)),
      },
    );
  };

  const addWord = (word: string, translation: string) => {
    playBlinkBeep();
    addNotebookEntry({
      source: "interactive-conversation",
      categoryIds: normalizeCategoryIds([NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.vocabulary]),
      titleEn: word,
      titleTh: translation,
      bodyEn: translation,
      bodyTh: `From: ${exam.title} #conversation`,
      userNote: "",
      excerpt: exam.id,
    });
    setAddedWords((prev) => new Set(prev).add(word.toLowerCase()));
  };

  const redeemClick = () => {
    playBlinkBeep();
    onRedeemNow();
  };

  return (
    <div className="space-y-8">
      {mastered ? (
        <div className="ep-luxury-option-in ep-panel-luxury ep-brutal rounded-sm border-4 border-emerald-600 bg-emerald-50 p-6 text-center shadow-[4px_4px_0_0_#000]">
          <p className="ep-stat text-xs font-bold uppercase tracking-[0.3em] text-emerald-800">
            Mastered
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-900">Perfect run — this set is complete.</p>
        </div>
      ) : null}

      <div className="ep-panel-luxury ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black pb-6">
          <div>
            <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">Total score</p>
            <p
              className="mt-1 text-5xl font-black tabular-nums tracking-tight text-neutral-900"
              style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
            >
              {itemOk.length === CONVERSATION_TOTAL_STEPS ? (
                <>
                  {points}
                  <span className="text-2xl font-bold text-neutral-400">/{maxScore}</span>
                </>
              ) : (
                <span className="text-lg font-bold text-neutral-500">—</span>
              )}
            </p>
            <p className="ep-stat mt-2 text-sm text-neutral-600">
              {itemOk.length === CONVERSATION_TOTAL_STEPS ? (
                <>
                  {correct}/{CONVERSATION_TOTAL_STEPS} correct ({pctCorrect}%) · Full score {maxScore} pts
                </>
              ) : (
                <>Incomplete attempt — finish all questions to earn a score.</>
              )}
            </p>
            <p className="ep-stat mt-1 text-xs text-neutral-500">
              Score = (correct ÷ {CONVERSATION_TOTAL_STEPS}) × {maxScore}.
            </p>
          </div>
          {!mastered ? (
            <button
              type="button"
              onClick={redeemClick}
              className="ep-btn-luxury border-4 border-black bg-ep-yellow px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
            >
              Fix mistakes
            </button>
          ) : null}
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-black uppercase tracking-wide text-neutral-800">Scenario understanding</h3>
          <ul className="mt-3 space-y-4">
            {exam.scenarioQuestions.map((q, i) => {
              const ok = itemOk[i];
              const pick = scenarioPicks[i];
              const user = pick != null ? q.options[pick] : "—";
              const correctOpt = q.options[q.correctIndex] ?? "—";
              const graded = itemOk.length > i;
              return (
                <li
                  key={i}
                  className={`ep-panel-luxury border-4 border-black p-4 shadow-[3px_3px_0_0_#000] ${
                    !graded ? "bg-neutral-50" : ok ? "bg-emerald-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-neutral-900">{q.question}</p>
                    {graded ? (
                      <span
                        className={`shrink-0 rounded-sm border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                          ok ? "bg-emerald-200 text-emerald-900" : "bg-red-200 text-red-900"
                        }`}
                      >
                        {ok ? "Correct" : "Wrong"}
                      </span>
                    ) : null}
                  </div>
                  <p className="ep-stat mt-2 text-xs text-neutral-600">
                    Your answer: <span className={ok ? "font-bold text-emerald-800" : "font-bold text-red-800"}>{user}</span>
                    {" · "}
                    Correct: <span className="font-bold">{correctOpt}</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-800">
                    {conversationExplanationThai(q.explanation)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-10">
          <h3 className="text-sm font-black uppercase tracking-wide text-neutral-800">Main dialogue</h3>
          <ul className="mt-3 space-y-5">
            {exam.mainQuestions.map((mq, i) => {
              const globalIdx = CONVERSATION_SCENARIO_Q_COUNT + i;
              const ok = itemOk[globalIdx];
              const pick = mainPicks[i];
              const graded = itemOk.length > globalIdx;
              return (
                <li
                  key={i}
                  className={`ep-panel-luxury border-4 border-black p-4 shadow-[3px_3px_0_0_#000] ${
                    !graded ? "bg-neutral-50" : ok ? "bg-emerald-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-neutral-900">{mq.question}</p>
                    {graded ? (
                      <span
                        className={`shrink-0 rounded-sm border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                          ok ? "bg-emerald-200 text-emerald-900" : "bg-red-200 text-red-900"
                        }`}
                      >
                        {ok ? "Correct" : "Wrong"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <button
                      type="button"
                      onClick={() => playLine(mq, `r-${i}`)}
                      className={`ep-btn-luxury inline-flex items-center gap-1 border-4 border-black px-2 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000] ${
                        speakingLine === `r-${i}` ? "bg-ep-yellow" : "bg-white"
                      }`}
                      title="Play line"
                    >
                      <span aria-hidden>🔊</span> Speak line
                    </button>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-neutral-800">{mq.transcript}</p>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {mq.options.map((opt, j) => {
                      const isUser = pick === j;
                      const isCorrect = j === mq.correctIndex;
                      let cls = "border-2 border-neutral-200 bg-white";
                      if (isUser && isCorrect) cls = "border-4 border-emerald-700 bg-emerald-100";
                      else if (isUser && !isCorrect) cls = "border-4 border-red-600 bg-red-100";
                      else if (!isUser && isCorrect && !ok) cls = "border-2 border-emerald-300 bg-emerald-50/50";
                      return (
                        <li key={j} className={`rounded-sm px-2 py-1.5 text-sm ${cls}`}>
                          <span className="ep-stat text-xs text-neutral-500">{j + 1}.</span> {opt}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-800">{mq.explanation}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-10 border-t-4 border-black pt-8">
          <h3 className="text-sm font-black uppercase tracking-wide text-ep-blue">Vocabulary (highlighted in JSON)</h3>
          <p className="mt-2 text-base font-bold text-neutral-900">Do you know these words?</p>
          <p className="mt-1 text-sm text-neutral-600">
            Review each word and its meaning. Add any you want to study to your notebook, or mark &quot;Yes, I
            know&quot; to hide it from this list.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {exam.highlightedWords.map((h) => {
              if (knownWords.has(h.word.toLowerCase())) return null;
              const done = addedWords.has(h.word.toLowerCase());
              return (
                <li
                  key={h.word}
                  className="ep-panel-luxury flex flex-col gap-2 border-4 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]"
                >
                  <p className="text-lg font-black text-neutral-900">{h.word}</p>
                  <p className="text-sm text-neutral-700">{h.translation}</p>
                  {done ? (
                    <span className="inline-flex w-fit items-center gap-1 border-2 border-emerald-700 bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900">
                      ✓ Saved to notebook
                    </span>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => addWord(h.word, h.translation)}
                        className="ep-btn-luxury w-full border-4 border-black bg-ep-blue py-2 text-xs font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_#000]"
                      >
                        Add to notebook
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setKnownWords((prev) => new Set(prev).add(h.word.toLowerCase()))
                        }
                        className="ep-btn-luxury w-full border-4 border-black bg-white py-2 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_0_#000]"
                      >
                        Yes, I know
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t-4 border-black pt-8 sm:flex-row sm:flex-wrap">
          {!mastered ? (
            <button
              type="button"
              onClick={redeemClick}
              className="ep-btn-luxury ep-redeem-pulse flex-1 border-4 border-black bg-ep-yellow py-4 text-center text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
            >
              Redeem now
            </button>
          ) : null}
          <Link
            href={restartHref}
            onClick={() => playBlinkBeep()}
            className="ep-btn-luxury ep-link-luxury inline-flex flex-1 items-center justify-center border-4 border-black bg-white py-4 text-center text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000]"
          >
            Start this set again
          </Link>
          <Link
            href={backHref}
            onClick={() => playBlinkBeep()}
            className="ep-btn-luxury ep-link-luxury inline-flex flex-1 items-center justify-center border-4 border-black bg-ep-blue py-4 text-center text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000]"
          >
            Back to all sets
          </Link>
        </div>
      </div>
    </div>
  );
}
