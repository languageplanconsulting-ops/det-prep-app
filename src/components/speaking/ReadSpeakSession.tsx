"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpeakingHintPanel } from "@/components/speaking/SpeakingHintPanel";
import { TeacherSamplePlayer } from "@/components/speaking-samples/TeacherSamplePlayer";
import { StickyExamCTA } from "@/components/practice/StickyExamCTA";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { VipAiFeedbackQuotaBanner } from "@/components/vip/VipAiFeedbackQuotaBanner";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import { finalizeLatestStudySession } from "@/lib/study-tracker";
import {
  getSpeechRecognitionCtor,
  handleSpeechRecognitionError,
} from "@/lib/speech-recognition-helpers";
import {
  getSpeakingQuestionLatestScore,
  getSpeakingVisibleTopicById,
  saveSpeakingReport,
} from "@/lib/speaking-storage";
import type { SpeakingAttemptReport, SpeakingQuestion, SpeakingRoundNum } from "@/types/speaking";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ReadSpeakSession({
  topicId,
  round,
  startWithRedeem = false,
  redeemQuestionId = null,
}: {
  topicId: string;
  round: SpeakingRoundNum;
  startWithRedeem?: boolean;
  redeemQuestionId?: string | null;
}) {
  const router = useRouter();
  const { effectiveTier } = useEffectiveTier();
  const vipGate = useVipAiFeedbackGate();
  const topic = useMemo(() => getSpeakingVisibleTopicById(topicId, round), [topicId, round]);
  const roundBase = `/practice/production/read-and-speak/round/${round}`;
  const [prepChoice, setPrepChoice] = useState(3);
  const [phase, setPhase] = useState<
    "prep-pick" | "prep-run" | "pick-question" | "record"
  >("pick-question");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<SpeakingQuestion | null>(
    null,
  );
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [questionScoreTick, setQuestionScoreTick] = useState(0);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const networkRetriesRef = useRef(0);

  useEffect(() => {
    if (phase !== "prep-run") return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "prep-run" && secondsLeft === 0) setPhase("record");
  }, [phase, secondsLeft]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    const bump = () => setQuestionScoreTick((n) => n + 1);
    window.addEventListener("ep-speaking-storage", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("ep-speaking-storage", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const stopRecognition = useCallback(() => {
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopRecognition();
  }, [stopRecognition]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "Live speech-to-text may be limited in this browser or on iPad Safari. You can still type your answer in the transcript box and use instant scoring normally.",
      );
      return;
    }
    setSpeechError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    networkRetriesRef.current = 0;

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      networkRetriesRef.current = 0;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const piece = r[0]?.transcript ?? "";
        if (r.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      const fin = finalTranscriptRef.current;
      setTranscript(`${fin}${interim ? (fin ? " " : "") + interim : ""}`.trim());
    };

    rec.onerror = (ev: SpeechRecognitionErrorEventLike) => {
      handleSpeechRecognitionError(ev, {
        listeningRef,
        networkRetriesRef,
        setSpeechError,
        setListening,
      });
    };

    rec.onend = () => {
      if (!listeningRef.current || recRef.current !== rec) return;
      window.setTimeout(() => {
        if (!listeningRef.current || recRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      }, 200);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start the microphone. On iPad/Safari, you can type your answer instead and still submit for instant scoring.");
      setListening(false);
    }
  }, []);

  if (!topic) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Topic not found.</p>
        <Link href="/practice/production/read-and-speak" className="mt-4 inline-block text-ep-blue">
          Back to rounds
        </Link>
      </div>
    );
  }

  const wc = countWords(transcript);
  const canSubmit = wc >= 15;
  const stepNum = phase === "pick-question" ? 1 : phase === "record" ? 3 : 2;

  const startPrep = () => {
    setSecondsLeft(prepChoice * 60);
    setPhase("prep-run");
  };

  const selectQuestion = (q: SpeakingQuestion) => {
    setSelectedQuestion(q);
    setPhase("prep-pick");
    setTranscript("");
    finalTranscriptRef.current = "";
    stopRecognition();
  };

  const goToReport = async (report: SpeakingAttemptReport) => {
    try {
      await finalizeLatestStudySession({
        exerciseType: "read_then_speak",
        setId: `r${round}-${topicId}`,
        score: report.score160,
        completed: true,
        submissionPayload: {
          kind: "read_then_speak",
          topicId: topic.id,
          questionId: selectedQuestion?.id ?? null,
          titleEn: topic.titleEn,
          titleTh: topic.titleTh,
          promptEn: selectedQuestion?.promptEn ?? "",
          promptTh: selectedQuestion?.promptTh ?? "",
          transcript,
        },
        reportPayload: report,
      });
    } catch (e) {
      console.warn("[ReadSpeakSession] finalize study session failed", e);
    }
    stashReportForNavigation(report.attemptId, report);
    saveSpeakingReport(report);
    await router.push(`/practice/production/read-and-speak/report/${report.attemptId}`);
  };

  const submitWithGemini = async () => {
    if (!canSubmit || !topic || !selectedQuestion) return;
    if (!vipGate.confirmBeforeAiSubmit()) return;
    const previousQuestionScore = getSpeakingQuestionLatestScore(topic.id, selectedQuestion.id);
    const redeemedForSameQuestion =
      startWithRedeem && redeemQuestionId === selectedQuestion.id && Boolean(previousQuestionScore);
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sp-${Date.now()}`;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const geminiKey = getStoredGeminiKey();
      const res = await fetch("/api/speaking-report", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          attemptId: id,
          topicId: topic.id,
          questionId: selectedQuestion.id,
          topicTitleEn: topic.titleEn,
          topicTitleTh: topic.titleTh,
          questionPromptEn: selectedQuestion.promptEn,
          questionPromptTh: selectedQuestion.promptTh,
          prepMinutes: prepChoice,
          transcript,
          speakingRound: round,
          redeemed: redeemedForSameQuestion,
          previousScore160: redeemedForSameQuestion ? previousQuestionScore?.score160 ?? null : null,
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<SpeakingAttemptReport>;
      if (!res.ok) {
        throw new Error(data.error || `Grading failed (${res.status})`);
      }
      if (!data.attemptId || data.score160 === undefined) {
        throw new Error("Invalid response from grading service");
      }
      vipGate.recordSuccessfulAiSubmit();
      await goToReport(data as SpeakingAttemptReport);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudySessionBoundary
      skill="production"
      exerciseType="read_then_speak"
      setId={`r${round}-${topicId}`}
    >
    <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-8">
      {submitting ? <GradingProgressLoader eyebrow="Grading your speaking" /> : null}
      <Link href={roundBase} className="text-sm font-bold text-ep-blue hover:underline">
        ← Round {round} topics
      </Link>
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {["อ่านโจทย์", "เตรียมตัว", "พูด & ส่ง"].map((label, i) => {
          const n = i + 1;
          const active = n === stepNum;
          const done = n < stepNum;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active ? "bg-[#004AAD] text-white" : done ? "bg-[#004AAD]/15 text-[#004AAD]" : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span className={`text-xs font-semibold hidden sm:inline ${active ? "text-[#004AAD]" : "text-slate-400"}`}>
                {label}
              </span>
              {n < 3 ? <span className="h-px flex-1 bg-slate-200" /> : null}
            </div>
          );
        })}
      </div>

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ep-blue">อ่านแล้วพูด · Round {round}</p>
        <h1 className="mt-1 text-xl font-black text-slate-900">{topic.titleEn}</h1>
        <p className="text-sm text-neutral-500">{topic.titleTh}</p>
      </header>

      {phase === "prep-pick" && selectedQuestion ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ep-blue">เตรียมตัว · คำถามของคุณ</p>
          <div className="mt-2 rounded-xl bg-slate-50 p-3.5">
            <p className="text-sm font-bold text-slate-900">{selectedQuestion.promptEn}</p>
            <p className="mt-1 text-sm text-slate-600">{selectedQuestion.promptTh}</p>
          </div>
          <p className="mt-4 text-sm font-bold text-slate-700">จับเวลาเตรียมตัว</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPrepChoice(n)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  prepChoice === n ? "bg-[#004AAD] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {n} นาที
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={startPrep}
              className="flex-1 rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-white hover:opacity-90"
            >
              เริ่มจับเวลา {prepChoice} นาที
            </button>
            <button
              type="button"
              onClick={() => setPhase("record")}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              ข้ามไปพูดเลย →
            </button>
          </div>
        </div>
      ) : null}

      {phase === "prep-run" && selectedQuestion ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ep-blue">กำลังเตรียมตัว</p>
          <p className="mt-2 text-sm font-bold text-slate-800">{selectedQuestion.promptEn}</p>
          <p className="mt-6 font-mono text-4xl sm:text-6xl font-black text-[#004AAD]">
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </p>
          <p className="mt-2 text-xs text-slate-400">โครง: เลือกข้าง → 2 เหตุผล → ตัวอย่างสั้น → สรุป</p>
          <button
            type="button"
            onClick={() => setPhase("record")}
            className="mt-5 w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-white hover:opacity-90"
          >
            พร้อมพูดแล้ว →
          </button>
        </div>
      ) : null}

      {phase === "pick-question" ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ep-blue">บทอ่าน / โจทย์</p>
            <p className="mt-2 text-sm leading-6 text-slate-800">{topic.promptEn}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{topic.promptTh}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-800">เลือกคำถามที่จะตอบ</p>
            <p className="mt-0.5 text-xs text-slate-400">อ่านคำถาม แล้วแตะเพื่อไปเตรียมตัว</p>
            <div key={questionScoreTick} className="mt-3 space-y-2">
              {topic.questions.map((q, i) => {
                const latest = getSpeakingQuestionLatestScore(topic.id, q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => selectQuestion(q)}
                    className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-[#004AAD] hover:shadow-md"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#004AAD]/10 text-xs font-bold text-[#004AAD]">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{q.promptEn}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{q.promptTh}</span>
                    </span>
                    {latest ? (
                      <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-[#004AAD]" title="คะแนนล่าสุด">
                        {latest.score160}
                      </span>
                    ) : (
                      <span className="shrink-0 text-slate-300">→</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {phase === "record" && selectedQuestion ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="text-sm font-bold text-slate-900">{selectedQuestion.promptEn}</p>
            <p className="mt-1 text-sm text-slate-600">{selectedQuestion.promptTh}</p>
          </div>

          <TeacherSamplePlayer
            target={{
              kind: "standalone_read_then_speak",
              ref: selectedQuestion.id,
              questionType: "read_then_speak",
            }}
          />

          {speechError ? <p className="mt-3 text-sm font-semibold text-red-600">{speechError}</p> : null}

          <div className="mt-4">
            {!listening ? (
              <button
                type="button"
                onClick={startListening}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#004AAD] py-3.5 text-base font-bold text-white hover:opacity-90"
              >
                🎙️ เริ่มพูด (live caption)
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecognition}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-base font-bold text-white hover:opacity-90"
              >
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                ⏺ กำลังฟัง… แตะเพื่อหยุด
              </button>
            )}
          </div>

          <label className="mt-4 block text-sm font-bold text-slate-700">
            ข้อความจากเสียงพูด · แก้ไขได้ก่อนส่ง
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm focus:border-[#004AAD] focus:outline-none"
              placeholder="ข้อความจะขึ้นตอนคุณพูด (live caption) หรือพิมพ์/วางเองได้…"
            />
          </label>
          <p className="mt-1 text-[11px] text-slate-400">
            live caption อาจไม่ครบบน iPad/Safari — พิมพ์/แก้เพิ่มได้
          </p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={wc >= 15 ? "text-emerald-600" : "text-slate-500"}>{wc} / 15 คำขั้นต่ำ</span>
              {wc >= 15 ? (
                <span className="text-emerald-600">พร้อมส่ง ✓</span>
              ) : (
                <span className="text-slate-400">พูด/พิมพ์ต่ออีกนิด</span>
              )}
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${wc >= 15 ? "bg-emerald-500" : "bg-[#004AAD]"}`}
                style={{ width: `${Math.min(100, (wc / 15) * 100)}%` }}
              />
            </div>
          </div>

          {submitError ? <p className="mt-2 text-sm font-semibold text-red-600">{submitError}</p> : null}

          <div className="mt-4">
            <VipAiFeedbackQuotaBanner />
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <button
              type="button"
              onClick={() => {
                stopRecognition();
                setPhase("pick-question");
                setSelectedQuestion(null);
              }}
              className="py-2 font-semibold text-slate-500 hover:text-[#004AAD]"
            >
              ← เลือกคำถามอื่น
            </button>
            <Link href={roundBase} className="py-2 font-semibold text-slate-500 hover:text-[#004AAD]">
              หัวข้ออื่นในรอบนี้
            </Link>
          </div>

          <StickyExamCTA>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={submitWithGemini}
              className="w-full rounded-xl bg-[#004AAD] py-3.5 text-base font-bold text-[#FFCC00] hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "กำลังตรวจ…" : "ส่งคำตอบ →"}
            </button>
          </StickyExamCTA>
        </div>
      ) : null}
      <SpeakingHintPanel unlocked={effectiveTier === "vip"} />
    </div>
    </StudySessionBoundary>
  );
}
