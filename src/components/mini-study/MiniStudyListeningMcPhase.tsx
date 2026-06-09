"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MiniStudyListeningMcSession,
  MiniStudyListeningScenario,
  MiniStudyMcQuestion,
} from "@/lib/mini-study/content";
import { getCachedAudioUrl } from "@/lib/mini-study/audio-cache";

type Props = { session: MiniStudyListeningMcSession };

type Answer = { questionId: string; chosen: "A" | "B" | "C" | "D"; correct: boolean };

export function MiniStudyListeningMcPhase({ session }: Props) {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [audioByScenario, setAudioByScenario] = useState<Record<string, string>>({});
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playsUsed, setPlaysUsed] = useState<Record<string, number>>({});
  const [answersByScenario, setAnswersByScenario] = useState<Record<string, Answer[]>>({});
  const [phase, setPhase] = useState<"listen" | "answer" | "review" | "done">("listen");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scenario: MiniStudyListeningScenario | undefined = session.scenarios[scenarioIdx];
  const plays = scenario ? playsUsed[scenario.id] ?? 0 : 0;
  const total = session.scenarios.length;

  const ensureAudio = useCallback(
    async (id: string, text: string) => {
      if (audioByScenario[id]) return audioByScenario[id];
      setAudioLoading(true);
      setAudioError(null);
      try {
        // Try pre-baked static MP3 first — instant playback, no API call.
        const cached = await getCachedAudioUrl(text);
        if (cached) {
          setAudioByScenario((p) => ({ ...p, [id]: cached }));
          setAudioLoading(false);
          return cached;
        }
        const res = await fetch("/api/speech-synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, provider: "deepgram" }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          audioBase64?: string;
          mimeType?: string;
          error?: string;
        };
        if (!res.ok || !json.audioBase64) {
          setAudioError(json.error ?? "สร้างเสียงไม่สำเร็จ");
          return null;
        }
        const url = `data:${json.mimeType ?? "audio/mpeg"};base64,${json.audioBase64}`;
        setAudioByScenario((p) => ({ ...p, [id]: url }));
        return url;
      } catch {
        setAudioError("เชื่อมต่อ TTS ไม่สำเร็จ");
        return null;
      } finally {
        setAudioLoading(false);
      }
    },
    [audioByScenario],
  );

  const playAudio = useCallback(async () => {
    if (!scenario) return;
    const url = await ensureAudio(scenario.id, scenario.scenarioText);
    if (!url) return;
    setPlaysUsed((p) => ({ ...p, [scenario.id]: (p[scenario.id] ?? 0) + 1 }));
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    }
  }, [scenario, ensureAudio]);

  useEffect(() => {
    if (phase === "listen" && scenario && plays === 0 && !audioLoading) {
      void playAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioIdx, phase]);

  if (phase === "done") {
    const all = session.scenarios.flatMap((s) => answersByScenario[s.id] ?? []);
    const numCorrect = all.filter((a) => a.correct).length;
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#004AAD]">
            เรียนจบบทนี้แล้ว
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {numCorrect} / {all.length} correct
          </h1>
        </div>
        <Link
          href="/practice/mini-study"
          className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
        >
          ← กลับไปหน้าหลัก
        </Link>
      </main>
    );
  }

  if (!scenario) return null;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <audio ref={audioRef} className="hidden" preload="auto" />

      <header className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
            Session {session.index}
          </p>
          <h1 className="text-lg font-black">
            {scenario.title} ({scenarioIdx + 1} / {total})
          </h1>
        </div>
        <div className="text-xs text-neutral-500">ฟังไป: {plays}</div>
      </header>

      {phase === "listen" ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-black text-[#004AAD]">ฟัง scenario</h2>
          {scenario.thaiInstruction ? (
            <p className="mt-2 rounded-xl bg-[#eef4ff] p-3 ring-1 ring-[#004AAD]/30 text-sm leading-7 text-neutral-800">
              {scenario.thaiInstruction}
            </p>
          ) : null}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={playAudio}
              disabled={audioLoading}
              className="rounded-lg bg-[#004AAD] px-5 py-3 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition disabled:opacity-50"
            >
              {audioLoading ? "กำลังโหลด…" : plays === 0 ? "▶ เล่น scenario" : "↻ เล่นซ้ำ"}
            </button>
            <p className="text-xs text-neutral-500">
              ตั้งใจฟัง — จำให้ได้ว่าคุณเป็นใคร · คุยกับใคร · มาทำไม
            </p>
          </div>
          {audioError ? <p className="mt-3 text-sm text-red-700">{audioError}</p> : null}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setPhase("answer")}
              disabled={plays === 0}
              className="rounded-lg bg-[#FFCC00] px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:brightness-95 transition disabled:opacity-50"
            >
              พร้อมแล้ว · ตอบคำถาม →
            </button>
          </div>
        </div>
      ) : null}

      {phase === "answer" ? (
        <QuestionsPanel
          scenario={scenario}
          onSubmit={(answers) => {
            setAnswersByScenario((p) => ({ ...p, [scenario.id]: answers }));
            setPhase("review");
          }}
        />
      ) : null}

      {phase === "review" ? (
        <ReviewPanel
          scenario={scenario}
          answers={answersByScenario[scenario.id] ?? []}
          onNext={() => {
            if (scenarioIdx + 1 >= total) {
              setPhase("done");
              return;
            }
            setScenarioIdx((i) => i + 1);
            setPhase("listen");
          }}
          isLast={scenarioIdx + 1 >= total}
        />
      ) : null}

      <Link href="/practice/mini-study" className="inline-block text-xs text-neutral-500 underline">
        ออกจากบทเรียน
      </Link>
    </main>
  );
}

function QuestionsPanel({
  scenario,
  onSubmit,
}: {
  scenario: MiniStudyListeningScenario;
  onSubmit: (answers: Answer[]) => void;
}) {
  const [picks, setPicks] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const allAnswered = scenario.questions.every((q) => picks[q.id]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-black text-[#004AAD]">
        ตอบจากความจำ (อย่ากดฟังซ้ำ)
      </h2>
      <div className="mt-4 space-y-5">
        {scenario.questions.map((q, qi) => (
          <QuestionBlock
            key={q.id}
            index={qi}
            question={q}
            chosen={picks[q.id]}
            onPick={(letter) => setPicks((p) => ({ ...p, [q.id]: letter }))}
          />
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() =>
            onSubmit(
              scenario.questions.map((q) => ({
                questionId: q.id,
                chosen: picks[q.id]!,
                correct: picks[q.id] === q.correctLetter,
              })),
            )
          }
          disabled={!allAnswered}
          className="rounded-lg bg-[#004AAD] px-5 py-2 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition disabled:opacity-50"
        >
          ส่งคำตอบ →
        </button>
      </div>
    </div>
  );
}

function QuestionBlock({
  index,
  question,
  chosen,
  onPick,
}: {
  index: number;
  question: MiniStudyMcQuestion;
  chosen: "A" | "B" | "C" | "D" | undefined;
  onPick: (letter: "A" | "B" | "C" | "D") => void;
}) {
  return (
    <div>
      <p className="text-sm font-bold">
        {index + 1}. {question.prompt}
      </p>
      <div className="mt-2 space-y-2">
        {question.options.map((o) => (
          <button
            key={o.letter}
            type="button"
            onClick={() => onPick(o.letter)}
            className={`block w-full rounded-xl border px-3 py-2 text-left text-sm ${
              chosen === o.letter
                ? "border-[#004AAD] bg-[#eef4ff] font-bold"
                : "border-black bg-white hover:bg-neutral-50"
            }`}
          >
            <span className="font-black mr-2">{o.letter}.</span>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewPanel({
  scenario,
  answers,
  onNext,
  isLast,
}: {
  scenario: MiniStudyListeningScenario;
  answers: Answer[];
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-black text-[#004AAD]">Review</h2>
      <ol className="space-y-3">
        {scenario.questions.map((q, qi) => {
          const a = answers.find((x) => x.questionId === q.id);
          const correct = a?.correct;
          const chosenOpt = q.options.find((o) => o.letter === a?.chosen);
          const correctOpt = q.options.find((o) => o.letter === q.correctLetter);
          return (
            <li
              key={q.id}
              className={`rounded-xl border-2 p-3 text-sm ${
                correct ? "border-green-700 bg-green-50" : "border-red-700 bg-red-50"
              }`}
            >
              <p className="font-bold">
                {qi + 1}. {q.prompt}
              </p>
              <p className="mt-1">
                คำตอบของคุณ: {a?.chosen}. {chosenOpt?.text}{" "}
                <span className={correct ? "text-green-800" : "text-red-800"}>
                  {correct ? "✓" : "✗"}
                </span>
              </p>
              {!correct ? (
                <p className="mt-1 text-green-800">
                  ที่ถูก: {q.correctLetter}. {correctOpt?.text}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="rounded-xl bg-[#eef4ff] p-3 ring-1 ring-[#004AAD]/30 text-xs leading-6 text-neutral-800">
        <span className="font-bold">อ้างอิง scenario:</span> {scenario.scenarioText}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-[#004AAD] px-5 py-2 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition"
        >
          {isLast ? "เรียนจบบท" : "Scenario ถัดไป →"}
        </button>
      </div>
    </div>
  );
}
