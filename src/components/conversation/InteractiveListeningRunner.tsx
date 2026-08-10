"use client";

/**
 * Interactive Listening — the DET task rebuilt beat for beat, minus the written summary.
 *
 * The real task (docs/listening/det-interactive-listening-gap-analysis.md) is nine questions on one
 * clock in three phases. We run the first two and skip the third, because the written summary has
 * its own surface elsewhere in the app. What that leaves is the part our old version got wrong:
 *
 *   · comprehension is TYPED into a sentence frame, not picked from a list
 *   · every comprehension question sits on ONE screen behind a single SUBMIT, scored per blank
 *   · the conversation then runs turn by turn, five options a turn, the thread building up
 *   · one countdown across the whole thing, header re-labelling itself as the set shrinks
 *   · audio plays ONCE — the real test says so out loud, and practising with replay teaches a
 *     strategy that does not exist on test day
 *
 * Ours: the typeface, #004AAD / #FFCC00, the Thai explanation under every answer, and the
 * highlighted-word glossary. DET gives a bare "Best Answer:" and nothing else.
 *
 * Audio is whatever the set was authored with — existing base64 / IndexedDB clips play unchanged
 * through the same helper the old runner used.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConversationReportPanel } from "@/components/conversation/ConversationReportPanel";
import { computeItemOk } from "@/lib/conversation-scoring";
import { conversationMaxForExam, saveConversationProgress } from "@/lib/conversation-storage";
import { cancelConversationSpeech, ensureSpeechVoices, speakConversationLineWithOptionalAudio } from "@/lib/conversation-tts";
import { sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import {
  IL_CONVERSATION_SECONDS,
  IL_COPY,
  ilGradeTyped,
  ilIsTyped,
  ilReferenceAnswer,
  ilQuestionCount,
  ilRemainingLabel,
  ilTemplateParts,
} from "@/lib/interactive-listening";
import type { ConversationDifficulty, ConversationExam } from "@/types/conversation";

const BRAND = "#004AAD";
const YELLOW = "#FFCC00";

type Stage = "scenario" | "comprehension" | "turns" | "report";

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function InteractiveListeningRunner({
  exam,
  round,
  difficulty,
  setNumber,
  onComplete,
  embedded = false,
}: {
  exam: ConversationExam;
  round: number;
  difficulty: ConversationDifficulty;
  setNumber: number;
  onComplete?: (correct: number, total: number) => void;
  embedded?: boolean;
}) {
  const total = ilQuestionCount(exam);
  const maxScore = conversationMaxForExam(exam);
  const backHref = `/practice/listening/interactive/${round}`;

  const [stage, setStage] = useState<Stage>("scenario");
  const [left, setLeft] = useState(IL_CONVERSATION_SECONDS);
  const [started, setStarted] = useState(false);

  // comprehension — all questions on one screen, one SUBMIT
  const [typed, setTyped] = useState<string[]>(() => exam.scenarioQuestions.map(() => ""));
  const [picksScenario, setPicksScenario] = useState<(number | null)[]>(() => exam.scenarioQuestions.map(() => null));
  const [compSubmitted, setCompSubmitted] = useState(false);

  // conversation turns
  const [turn, setTurn] = useState(0);
  const [turnPick, setTurnPick] = useState<number | null>(null);
  const [turnSubmitted, setTurnSubmitted] = useState(false);
  const [picksMain, setPicksMain] = useState<(number | null)[]>(() => exam.mainQuestions.map(() => null));

  // audio plays once per clip
  const [playing, setPlaying] = useState<string | null>(null);
  const played = useRef<Set<string>>(new Set());
  const saved = useRef(false);

  useEffect(() => {
    ensureSpeechVoices(() => {});
    return () => {
      if (playTimer.current) clearTimeout(playTimer.current);
      cancelConversationSpeech();
    };
  }, []);

  const finish = useCallback(() => {
    setStage("report");
    if (saved.current) return;
    saved.current = true;
    const ok = computeItemOk(picksScenario, picksMain, {
      correctScenarioIndex: exam.scenarioQuestions.map((q) => q.correctIndex),
      correctMainIndex: exam.mainQuestions.map((q) => q.correctIndex),
    });
    const correct = ok.filter(Boolean).length;
    saveConversationProgress({ round, difficulty, setNumber, itemOk: ok, maxScore });
    onComplete?.(correct, total);
  }, [picksScenario, picksMain, exam, round, difficulty, setNumber, maxScore, onComplete, total]);

  // one clock across the whole task, started when the learner opens the scenario
  useEffect(() => {
    if (!started || stage === "report") return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, stage, finish]);

  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function play(id: string, text: string, audio?: { audioBase64?: string; audioMimeType?: string }) {
    if (played.current.has(id) || playing) return;
    played.current.add(id);
    setPlaying(id);
    const clear = () => {
      if (playTimer.current) clearTimeout(playTimer.current);
      playTimer.current = null;
      setPlaying(null);
    };
    // Safety net: some voices never fire onEnd (browser TTS quirks, a clip that fails to decode).
    // Without this the learner sits on a disabled button with the clock running and no way forward.
    playTimer.current = setTimeout(clear, Math.max(8000, Math.min(45000, text.length * 90)));
    speakConversationLineWithOptionalAudio(text, audio, { onEnd: clear, onError: clear });
  }

  const answeredCount = useMemo(() => {
    const comp = compSubmitted ? exam.scenarioQuestions.length : 0;
    return comp + turn + (turnSubmitted ? 1 : 0);
  }, [compSubmitted, turn, turnSubmitted, exam.scenarioQuestions.length]);

  /* ── header ─────────────────────────────────────────────────────────── */
  function header() {
    return (
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-8">
        <p className="flex items-center gap-2 text-[15px] text-slate-500">
          <span className="text-lg">🕐</span>
          <span className="text-lg font-black text-slate-800">{mmss(left)}</span>
          <span className="font-semibold">{ilRemainingLabel(answeredCount, total)}</span>
        </p>
        {embedded ? null : (
          <Link href={backHref} className="text-2xl leading-none text-slate-400 hover:text-slate-600">
            ✕
          </Link>
        )}
      </div>
    );
  }

  function scenarioPanel() {
    return (
      <div className="rounded-2xl bg-[#EAF1FF] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">สถานการณ์</p>
        <p className="mt-1.5 text-[15px] leading-7 text-slate-800">{exam.scenario}</p>
        {exam.highlightedWords?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exam.highlightedWords.map((w) => (
              <span key={w.word} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-black/5">
                {w.word} · <span className="text-slate-500">{w.translation}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  /* ── stage: scenario ────────────────────────────────────────────────── */
  if (stage === "scenario") {
    const id = "scenario";
    const done = played.current.has(id);
    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)] ring-1 ring-black/5">
        {header()}
        <div className="px-5 py-6 sm:px-8">
          <h2 className="text-[19px] font-black leading-7 text-slate-900">{IL_COPY.conversationTh}</h2>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{IL_COPY.conversationEn}</p>
          {scenarioPanel()}
          <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] font-bold text-amber-800">⚠️ {IL_COPY.playOnceTh}</p>
          <button
            type="button"
            disabled={done || !!playing}
            onClick={() => {
              setStarted(true);
              play(id, exam.scenario, { audioBase64: exam.scenarioAudioBase64, audioMimeType: exam.scenarioAudioMimeType });
            }}
            className="mt-4 w-full rounded-xl py-3.5 text-sm font-black uppercase tracking-wide disabled:bg-slate-200 disabled:text-slate-400"
            style={!done && !playing ? { background: BRAND, color: YELLOW } : undefined}
          >
            {playing === id ? "กำลังเล่น…" : done ? "เล่นไปแล้ว" : "▶ ฟังสถานการณ์"}
          </button>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-8">
          <button
            type="button"
            disabled={!done || !!playing}
            onClick={() => {
              sfxTransition();
              setStage("comprehension");
            }}
            className="rounded-xl px-9 py-3 text-sm font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            style={done && !playing ? { background: BRAND, color: YELLOW } : undefined}
          >
            ต่อไป
          </button>
        </div>
      </div>
    );
  }

  /* ── stage: comprehension — every question on one screen ────────────── */
  if (stage === "comprehension") {
    const qs = exam.scenarioQuestions;
    const okFor = (i: number) => {
      const q = qs[i]!;
      return ilIsTyped(q) ? ilGradeTyped(typed[i] ?? "", q) : picksScenario[i] === q.correctIndex;
    };
    const hits = qs.filter((_, i) => okFor(i)).length;
    const ready = qs.every((q, i) => (ilIsTyped(q) ? (typed[i] ?? "").trim().length > 0 : picksScenario[i] != null));

    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)] ring-1 ring-black/5">
        {header()}
        <div className="max-h-[62vh] overflow-y-auto px-5 py-5 sm:px-8">
          <h2 className="text-[19px] font-black leading-7 text-slate-900">{IL_COPY.comprehensionTh}</h2>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{IL_COPY.comprehensionEn}</p>
          {scenarioPanel()}

          <div className="mt-5 space-y-5">
            {qs.map((q, i) => {
              const good = okFor(i);
              const [before, after] = ilTemplateParts(q.answerTemplate ?? "{}");
              return (
                <div key={i}>
                  <p className="text-[15px] font-bold text-slate-900">{q.question}</p>
                  {ilIsTyped(q) ? (
                    <p className="mt-2 text-[15px] leading-9 text-slate-800">
                      {before}
                      <input
                        value={typed[i] ?? ""}
                        disabled={compSubmitted}
                        onChange={(e) => setTyped((cur) => cur.map((v, j) => (j === i ? e.target.value : v)))}
                        className={`mx-1 min-w-[9rem] border-b-2 bg-transparent px-1 pb-0.5 text-[15px] font-bold outline-none ${
                          compSubmitted ? (good ? "border-emerald-500 text-emerald-700" : "border-rose-400 text-rose-600") : "border-slate-300 text-slate-900 focus:border-[#004AAD]"
                        }`}
                        placeholder="พิมพ์คำตอบ"
                      />
                      {after}
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {q.options.map((o, oi) => {
                        const state = !compSubmitted ? (picksScenario[i] === oi ? "sel" : "idle") : oi === q.correctIndex ? "key" : picksScenario[i] === oi ? "miss" : "idle";
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={compSubmitted}
                            onClick={() => setPicksScenario((cur) => cur.map((v, j) => (j === i ? oi : v)))}
                            className={`w-full rounded-xl border-2 p-3 text-left text-[14px] font-semibold ${
                              state === "key"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                : state === "miss"
                                  ? "border-rose-400 bg-rose-50 text-rose-700"
                                  : state === "sel"
                                    ? "border-[#004AAD] bg-[#EAF1FF] text-[#004AAD]"
                                    : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {compSubmitted ? (
                    <div className={`mt-2 rounded-xl p-3 text-[13px] leading-6 ${good ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
                      {!good && ilIsTyped(q) ? (
                        <p className="font-black">
                          {IL_COPY.bestAnswerTh} {ilReferenceAnswer(q)}
                        </p>
                      ) : null}
                      {q.explanation ? <p className="mt-0.5 text-slate-700">💡 {q.explanation}</p> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {compSubmitted ? (
          <div className={`px-5 py-4 sm:px-8 ${hits === qs.length ? "bg-[#DCF5E6]" : hits > 0 ? "bg-[#FFF4D6]" : "bg-[#FFE4E6]"}`}>
            <div className="flex items-center gap-4">
              <p className={`flex-1 text-[15px] font-black ${hits === qs.length ? "text-emerald-700" : hits > 0 ? "text-amber-700" : "text-rose-600"}`}>
                {hits === qs.length ? "✓ เยี่ยมมาก!" : `! ถูก ${hits}/${qs.length}`}
              </p>
              <button
                type="button"
                onClick={() => {
                  sfxTransition();
                  setStage("turns");
                }}
                className={`rounded-xl px-7 py-3 text-sm font-black uppercase tracking-wide text-white ${hits === qs.length ? "bg-emerald-500" : hits > 0 ? "bg-amber-400" : "bg-rose-500"}`}
              >
                เริ่มบทสนทนา
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-8">
            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                setCompSubmitted(true);
                // typed answers are graded here; the MCQ fallback already recorded its pick
                setPicksScenario((cur) => cur.map((v, i) => (ilIsTyped(qs[i]!) ? (okFor(i) ? qs[i]!.correctIndex : -1) : v)));
                if (hits === qs.length) sfxCorrect();
                else sfxWrong();
              }}
              className="rounded-xl px-9 py-3 text-sm font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              style={ready ? { background: BRAND, color: YELLOW } : undefined}
            >
              ส่งคำตอบ
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── stage: the conversation, turn by turn ──────────────────────────── */
  if (stage === "turns") {
    const q = exam.mainQuestions[turn]!;
    const id = `turn-${turn}`;
    const heard = played.current.has(id);
    const good = turnPick === q.correctIndex;
    const isFirst = turn === 0;

    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)] ring-1 ring-black/5">
        {header()}
        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
          {/* the thread so far — the real task keeps the conversation visible */}
          <div className="max-h-[42vh] overflow-y-auto border-b border-slate-200 px-5 py-5 sm:px-8 lg:max-h-[58vh] lg:border-b-0">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">บทสนทนา</p>
            <p className="mb-4 rounded-xl bg-slate-50 p-3 text-[13px] leading-6 text-slate-600">{exam.scenario}</p>
            <div className="space-y-3">
              {exam.mainQuestions.slice(0, turn + 1).map((m, i) => {
                const answeredPick = picksMain[i];
                return (
                  <div key={i}>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2.5 text-[14px] leading-6 text-slate-800">
                      {i === turn && !heard ? <span className="text-slate-400">— แตะปุ่มฟังเพื่อฟังประโยคนี้ —</span> : m.transcript}
                    </div>
                    {answeredPick != null && answeredPick >= 0 ? (
                      <div className="ml-auto mt-2 max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[14px] leading-6 text-white" style={{ background: BRAND }}>
                        {m.options[answeredPick]}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* the turn */}
          <div className="max-h-[52vh] overflow-y-auto px-5 py-5 sm:px-8 lg:max-h-[58vh]">
            <h2 className="text-[19px] font-black leading-7 text-slate-900">{isFirst ? IL_COPY.selectStartTh : IL_COPY.selectResponseTh}</h2>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{isFirst ? IL_COPY.selectStartEn : IL_COPY.selectResponseEn}</p>

            <button
              type="button"
              disabled={heard || !!playing}
              onClick={() => play(id, q.transcript, { audioBase64: q.audioBase64, audioMimeType: q.audioMimeType })}
              className="mb-4 w-full rounded-xl border-2 border-slate-200 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
            >
              {playing === id ? "🔊 กำลังเล่น…" : heard ? "เล่นไปแล้ว (ครั้งเดียว)" : "▶ ฟังประโยคนี้"}
            </button>

            <div className={`space-y-2.5 ${heard ? "" : "pointer-events-none opacity-40"}`}>
              {q.options.map((o, i) => {
                const state = !turnSubmitted ? (turnPick === i ? "sel" : "idle") : i === q.correctIndex ? "key" : turnPick === i ? "miss" : "idle";
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={turnSubmitted}
                    onClick={() => setTurnPick(i)}
                    className={`flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[14px] font-semibold leading-6 transition ${
                      state === "key"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : state === "miss"
                          ? "border-rose-400 bg-rose-50 text-rose-700"
                          : state === "sel"
                            ? "border-[#004AAD] bg-[#EAF1FF] text-[#004AAD]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${state === "sel" ? "border-[#004AAD] bg-[#004AAD] shadow-[inset_0_0_0_3px_white]" : "border-slate-300"}`} />
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {turnSubmitted ? (
          <div className={`px-5 py-4 sm:px-8 ${good ? "bg-[#DCF5E6]" : "bg-[#FFE4E6]"}`}>
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] font-black ${good ? "text-emerald-700" : "text-rose-600"}`}>{good ? "✓ เยี่ยมมาก!" : "✕ ยังไม่ถูก"}</p>
                {!good ? (
                  <p className="mt-1 text-[13px] font-semibold text-rose-700">
                    {IL_COPY.bestAnswerTh} {q.options[q.correctIndex]}
                  </p>
                ) : null}
                {q.explanation ? <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-700">💡 {q.explanation}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (turn + 1 >= exam.mainQuestions.length) return finish();
                  sfxTransition();
                  setTurn(turn + 1);
                  setTurnPick(null);
                  setTurnSubmitted(false);
                }}
                className={`shrink-0 rounded-xl px-7 py-3 text-sm font-black uppercase tracking-wide text-white ${good ? "bg-emerald-500" : "bg-rose-500"}`}
              >
                {turn + 1 >= exam.mainQuestions.length ? "ดูสรุป" : "ต่อไป"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-8">
            <button
              type="button"
              disabled={turnPick == null}
              onClick={() => {
                setTurnSubmitted(true);
                setPicksMain((cur) => cur.map((v, i) => (i === turn ? turnPick : v)));
                if (turnPick === q.correctIndex) sfxCorrect();
                else sfxWrong();
              }}
              className="rounded-xl px-9 py-3 text-sm font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              style={turnPick != null ? { background: BRAND, color: YELLOW } : undefined}
            >
              ส่งคำตอบ
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── report ─────────────────────────────────────────────────────────── */
  const itemOk = computeItemOk(picksScenario, picksMain, {
    correctScenarioIndex: exam.scenarioQuestions.map((q) => q.correctIndex),
    correctMainIndex: exam.mainQuestions.map((q) => q.correctIndex),
  });
  return (
    <ConversationReportPanel
      exam={exam}
      scenarioPicks={picksScenario}
      mainPicks={picksMain}
      itemOk={itemOk}
      onRedeemNow={() => {}}
      backHref={embedded ? undefined : backHref}
      restartHref={`/practice/listening/interactive/${round}/${difficulty}/${setNumber}`}
    />
  );
}
