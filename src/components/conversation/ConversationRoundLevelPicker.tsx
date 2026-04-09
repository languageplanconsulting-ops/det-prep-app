"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONVERSATION_DIFFICULTIES,
  CONVERSATION_DIFFICULTY_LABEL,
  CONVERSATION_MAX_SCORE,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";
import { filterConversationExamsForPractice } from "@/lib/conversation-practice-filter";
import {
  conversationMaxForExam,
  getConversationProgress,
  getConversationRoundStats,
  loadConversationBank,
} from "@/lib/conversation-storage";
import { buildDefaultConversationBank } from "@/lib/conversation-default-data";
import type { ConversationDifficulty, ConversationExam } from "@/types/conversation";

function isComplete(
  prog: ReturnType<typeof getConversationProgress>,
  maxScore: number,
): boolean {
  if (!prog) return false;
  if (Math.round(prog.bestScore) >= maxScore) return true;
  const ok = prog.lastItemOk;
  return !!ok && ok.length === CONVERSATION_TOTAL_STEPS && ok.every(Boolean);
}

function audioCoverage(exam: {
  scenarioAudioBase64?: string;
  scenarioAudioInIndexedDb?: boolean;
  scenarioQuestions: { audioBase64?: string; audioInIndexedDb?: boolean }[];
  mainQuestions: { audioBase64?: string; audioInIndexedDb?: boolean }[];
}): { covered: number; total: number } {
  const total = 1 + exam.scenarioQuestions.length + exam.mainQuestions.length;
  let covered =
    Boolean(exam.scenarioAudioBase64?.trim()) || Boolean(exam.scenarioAudioInIndexedDb) ? 1 : 0;
  covered += exam.scenarioQuestions.filter(
    (q) => Boolean(q.audioBase64?.trim()) || Boolean(q.audioInIndexedDb),
  ).length;
  covered += exam.mainQuestions.filter(
    (q) => Boolean(q.audioBase64?.trim()) || Boolean(q.audioInIndexedDb),
  ).length;
  return { covered, total };
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function ConversationRoundTutorExplainer({ round }: { round: number }) {
  const [open, setOpen] = useState(false);
  const easy = CONVERSATION_MAX_SCORE.easy;
  const medium = CONVERSATION_MAX_SCORE.medium;
  const hard = CONVERSATION_MAX_SCORE.hard;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-sm border-2 border-black bg-ep-yellow/40 px-4 py-3 text-left shadow-[3px_3px_0_0_#000] transition hover:bg-ep-yellow/60"
      >
        <span className="block text-sm font-black text-neutral-900">
          How rounds &amp; levels work (tutor) — tap to {open ? "hide" : "show"}
        </span>
        <span className="mt-0.5 block text-xs font-bold text-neutral-700">
          อธิบายรอบและระดับ (ติวเตอร์) — แตะเพื่อ{open ? "ซ่อน" : "ดู"}
        </span>
      </button>

      {open ? (
        <div className="mt-3 space-y-5 rounded-sm border-2 border-black bg-white p-4 text-sm shadow-[3px_3px_0_0_#000]">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-ep-blue">
              English
            </p>
            <p className="mt-2 font-black text-neutral-900">What is &quot;Round {round}&quot;?</p>
            <p className="mt-2 leading-relaxed text-neutral-800">
              We call it a <strong>round</strong> because each round contains <strong>many exams</strong> (several
              sets). That structure is for learners who want to <strong>practice a lot</strong> in one place
              before moving on. <strong>Round {round}</strong> is available now;{" "}
              <strong>Rounds 2–5</strong> will be loaded soon.
            </p>
            <p className="mt-3 font-black text-neutral-900">Difficulty levels &amp; max scores</p>
            <ul className="mt-2 list-inside list-disc space-y-1 font-semibold text-neutral-800">
              <li>
                Easy · max <strong>{easy}</strong> pts
              </li>
              <li>
                Medium · max <strong>{medium}</strong> pts
              </li>
              <li>
                Hard · max <strong>{hard}</strong> pts
              </li>
            </ul>
          </div>

          <div className="border-t-2 border-dashed border-neutral-200 pt-4">
            <p className="text-xs font-black uppercase tracking-wide text-ep-blue">ไทย</p>
            <p className="mt-2 font-black text-neutral-900">รอบ {round} คืออะไร?</p>
            <p className="mt-2 leading-relaxed text-neutral-800">
              เรียกว่า <strong>รอบ</strong> เพราะในแต่ละรอบมี<strong>ข้อสอบหลายชุด</strong> (หลายเซ็ต) ให้ฝึก
              เหมาะกับคนที่อยาก<strong>ซ้อมเยอะๆ</strong>ก่อนไปต่อ <strong>รอบ {round}</strong> ใช้งานได้แล้วตอนนี้;{" "}
              <strong>รอบ 2–5</strong> กำลังจะเปิดให้โหลดเร็วๆ นี้
            </p>
            <p className="mt-3 font-black text-neutral-900">ระดับความยากและคะแนนเต็ม</p>
            <ul className="mt-2 list-inside list-disc space-y-1 font-semibold text-neutral-800">
              <li>
                ง่าย (Easy) · เต็ม <strong>{easy}</strong> คะแนน
              </li>
              <li>
                ปานกลาง (Medium) · เต็ม <strong>{medium}</strong> คะแนน
              </li>
              <li>
                ยาก (Hard) · เต็ม <strong>{hard}</strong> คะแนน
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ConversationRoundLevelPicker({ round }: { round: number }) {
  const hubHref = "/practice/listening/interactive";
  const [bank, setBank] = useState(buildDefaultConversationBank);
  const [bankVersion, setBankVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-conversation-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-conversation-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    setBank(loadConversationBank());
  }, [bankVersion]);

  const roundStats = getConversationRoundStats(round);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={hubHref}
          className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Interactive hub
        </Link>
      </div>

      <header className="ep-panel-luxury ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Round {round}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Choose your set</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Summary by level: Easy ({CONVERSATION_MAX_SCORE.easy}), Medium ({CONVERSATION_MAX_SCORE.medium}), Hard (
          {CONVERSATION_MAX_SCORE.hard}). Click a topic thumbnail below to start.
        </p>
        <ConversationRoundTutorExplainer round={round} />

        <div className="mt-4 grid gap-4 border-t-2 border-dashed border-neutral-300 pt-4 sm:grid-cols-2">
          <div>
            <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-neutral-600">
              Average score
            </p>
            <p className="mt-1 text-lg font-black text-ep-blue">
              {roundStats.avgPercent != null ? `${roundStats.avgPercent}%` : "—"}
            </p>
            <p className="ep-stat mt-0.5 text-xs text-neutral-500">
              Mean of your best % on each set you&apos;ve tried (all levels in this round).
            </p>
          </div>
          <div>
            <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-neutral-600">
              Last attempt
            </p>
            <p className="mt-1 text-lg font-black text-neutral-900">
              {formatShortDate(roundStats.latestAttemptDate)}
            </p>
            <p className="ep-stat mt-0.5 text-xs text-neutral-500">
              Most recent finish across any set in this round.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {CONVERSATION_DIFFICULTIES.map((d) => (
          <DifficultyColumn
            key={d}
            round={round}
            difficulty={d}
            exams={filterConversationExamsForPractice(bank[round]?.[d])}
          />
        ))}
      </section>
    </div>
  );
}

function DifficultyColumn({
  round,
  difficulty,
  exams,
}: {
  round: number;
  difficulty: ConversationDifficulty;
  exams: ConversationExam[];
}) {
  const levelMax = CONVERSATION_MAX_SCORE[difficulty];
  const sorted = [...exams].sort((a, b) => a.setNumber - b.setNumber);
  return (
    <div className="ep-panel-luxury ep-brutal rounded-sm border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
      <p className="text-base font-black uppercase">{CONVERSATION_DIFFICULTY_LABEL[difficulty]}</p>
      <p className="ep-stat text-xs font-bold text-neutral-600">
        Default max {levelMax} pts · {sorted.length} set(s)
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {sorted.length === 0 ? (
          <p className="col-span-2 text-[10px] font-bold text-neutral-500">No sets uploaded for this level.</p>
        ) : (
          sorted.map((exam) => {
            const setNumber = exam.setNumber;
            const examMax = conversationMaxForExam(exam);
            const prog = getConversationProgress(round, difficulty, setNumber);
            const complete = isComplete(prog, examMax);
            const redeem = !!prog && !complete && (prog.lastItemOk?.some((x) => !x) ?? false);
            const href = redeem
              ? `/practice/listening/interactive/${round}/${difficulty}/${setNumber}?redeem=1`
              : `/practice/listening/interactive/${round}/${difficulty}/${setNumber}`;
            const cov = audioCoverage(exam);
            return (
              <Link
                key={exam.id}
                href={href}
                className="ep-btn-luxury ep-interactive rounded-sm border-2 border-black bg-neutral-50 px-2 py-2 text-left shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/25"
              >
                <p className="text-xs font-black">Set {setNumber}</p>
                <p className="line-clamp-2 text-[10px] font-bold text-neutral-600">{exam.title}</p>
                <p className="ep-stat mt-1 text-[10px] font-bold text-neutral-500">
                  Audio {cov.covered}/{cov.total}
                </p>
                <p className="ep-stat mt-1 text-[10px] font-bold text-ep-blue">
                  {prog ? `${Math.round(prog.bestScore)}/${examMax}` : `0/${examMax}`}
                </p>
                {complete ? <p className="text-[10px] font-black text-emerald-700">Completed</p> : null}
                {redeem ? <p className="text-[10px] font-black text-amber-700">Redeem</p> : null}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
