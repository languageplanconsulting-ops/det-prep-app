"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { CoachBubble } from "@/components/ui/CoachBubble";
import { staggerIn } from "@/components/ui/StaggerIn";
import { sfxCelebrate, sfxTransition } from "@/lib/exam-sfx";
import {
  VOCAB_SESSION_LABEL,
  VOCAB_SESSION_MAX,
} from "@/lib/vocab-constants";
import { addNotebookEntry, NOTEBOOK_BUILTIN, normalizeCategoryIds } from "@/lib/notebook-storage";
import {
  isVocabWordNotebookSaved,
  markVocabWordNotebookSaved,
} from "@/lib/vocab-storage";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";
import type {
  VocabExamResultRow,
  VocabPassageUnit,
  VocabRoundNum,
  VocabSessionLevel,
} from "@/types/vocab";

export function VocabReport({
  round,
  sessionLevel,
  setNumber,
  passageNumber,
  passage,
  rows,
  onRedeem,
  setListHref,
  bankHref,
  nextPassageHref,
  inRunner = false,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
  passageNumber: number;
  passage: VocabPassageUnit;
  rows: VocabExamResultRow[];
  onRedeem: () => void;
  setListHref: string;
  bankHref: string;
  nextPassageHref: string | null;
  /** True when embedded in a daily/timed runner — hide next/back navigation so
   * only the runner's "ต่อไป" bar advances. */
  inRunner?: boolean;
}) {
  useEffect(() => {
    sfxCelebrate("md");
  }, []);
  const maxScore = VOCAB_SESSION_MAX[sessionLevel];
  const correctCount = rows.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / 6) * maxScore);
  const coachText =
    correctCount === 6
      ? "เต็ม 6/6! คุณเข้าใจบริบทของทุกช่องเลย เก่งมากจริงๆ 🎉"
      : correctCount >= 4
        ? `ทำได้ดีมาก — ถูก ${correctCount} จาก 6 ช่อง ลองอ่านคำอธิบายของช่องที่ผิดด้านล่าง แล้วสังเกตว่าทำไมคำนั้นถึงเข้ากับประโยคได้ดีกว่า`
        : `ไม่เป็นไรเลย ${correctCount} จาก 6 ช่อง เป็นจุดเริ่มต้นที่ดี — เคล็ดลับคือ อ่านทั้งประโยคก่อนเดา แล้วดูว่าคำไหนเข้ากับความหมายและไวยากรณ์ ลองดูคำอธิบายทีละข้อด้านล่างนะ`;

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900">
      <div className={`px-4 py-8 sm:px-6 sm:py-12 ${LANDING_PAGE_GRID_BG}`}>
        <div className="mx-auto max-w-[900px] space-y-8">
          <header className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
            <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
              Report — R{round} · {VOCAB_SESSION_LABEL[sessionLevel]} · Set {setNumber} · Passage {passageNumber}
            </p>
            <p className="ep-stat mt-4 text-2xl font-bold tracking-tight text-neutral-900">
              SCORE: {score}/{maxScore}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              {correctCount} of 6 correct · weighted by your chosen level.
            </p>
          </header>

          <CelebrateMascot title={correctCount === 6 ? "เต็ม 6/6! 🎉" : "ทำได้ดีมาก!"} />
          <CoachBubble>{coachText}</CoachBubble>

          <section className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Question review
            </h2>
            <ul className="mt-6 space-y-6">
              {rows.map((r, i) => {
                const stagger = staggerIn(i);
                return (
                <li
                  key={r.blankIndex}
                  className={`ep-brutal-reading rounded-sm border-4 p-5 shadow-[4px_4px_0_0_#000] ${
                    r.isCorrect
                      ? "border-emerald-600 bg-emerald-50/90"
                      : "border-red-600 bg-red-50/90"
                  } ${stagger.className}`}
                  style={stagger.style}
                >
                  <p
                    className={`ep-stat text-xs font-bold uppercase tracking-[0.2em] ${
                      r.isCorrect ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    Blank {r.blankIndex}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">{r.question}</p>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <div
                      className={`rounded-sm border-4 bg-white p-3 shadow-[2px_2px_0_0_#000] ${
                        r.isCorrect ? "border-emerald-700" : "border-red-700"
                      }`}
                    >
                      <p
                        className={`ep-stat text-[10px] font-bold uppercase ${
                          r.isCorrect ? "text-emerald-800" : "text-red-800"
                        }`}
                      >
                        Your answer
                      </p>
                      <p
                        className={`mt-1 font-medium ${
                          r.isCorrect ? "text-emerald-950" : "text-red-950"
                        }`}
                      >
                        {r.userAnswer || "—"}
                      </p>
                    </div>
                    <div className="rounded-sm border-4 border-black bg-ep-yellow/35 p-3 shadow-[2px_2px_0_0_#000]">
                      <p className="ep-stat text-[10px] font-bold uppercase text-neutral-700">
                        Correct answer
                      </p>
                      <p className="mt-1 font-medium text-neutral-900">{r.correctAnswer}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-sm border-4 border-black bg-white p-3 text-sm shadow-[2px_2px_0_0_#000]">
                    <p className="font-bold text-ep-blue">Explanation (ไทย)</p>
                    <p className="mt-2 whitespace-pre-wrap text-neutral-800">{r.explanationThai}</p>
                  </div>
                </li>
                );
              })}
            </ul>
          </section>

          <section className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Correct words & synonyms
            </h2>
            <ul className="mt-4 space-y-4">
              {passage.correctWords.map((cw, i) => (
                <WordNotebookRow
                  key={cw.word + i}
                  round={round}
                  setNumber={setNumber}
                  passageNumber={passageNumber}
                  entry={cw}
                  index={i}
                />
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-4">
            {!inRunner && nextPassageHref ? (
              <Link
                href={nextPassageHref}
                onClick={() => sfxTransition()}
                className="ep-brutal-reading block border-4 border-black bg-ep-blue py-4 text-center text-lg font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#000]"
              >
                Next passage →
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onRedeem}
              className="ep-redeem-pulse ep-brutal-reading w-full border-4 border-black bg-ep-yellow py-4 text-center text-lg font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#000]"
            >
              Redeem yourself
            </button>
            {!inRunner && (
              <Link
                href={setListHref}
                className="ep-brutal-reading block border-4 border-black bg-neutral-100 py-3 text-center text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#000]"
              >
                Back to passages in this set
              </Link>
            )}
            {!inRunner && (
              <Link
                href={bankHref}
                className="ep-brutal-reading block border-4 border-black bg-white py-3 text-center text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#000]"
              >
                Back to levels
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WordNotebookRow({
  round,
  setNumber,
  passageNumber,
  entry,
  index,
}: {
  round: VocabRoundNum;
  setNumber: number;
  passageNumber: number;
  entry: VocabPassageUnit["correctWords"][number];
  index: number;
}) {
  const [saved, setSaved] = useState(() =>
    isVocabWordNotebookSaved(round, setNumber, passageNumber, entry.word),
  );
  const [showAddedCelebration, setShowAddedCelebration] = useState(false);

  const synText =
    entry.synonyms.length > 0 ? entry.synonyms.join(", ") : "—";

  useEffect(() => {
    if (!showAddedCelebration) return;
    const id = window.setTimeout(() => setShowAddedCelebration(false), 3800);
    return () => window.clearTimeout(id);
  }, [showAddedCelebration]);

  const save = async () => {
    if (saved) return;
    try {
      await addNotebookEntry({
        source: "vocabulary-comprehension",
        categoryIds: normalizeCategoryIds([NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.vocabulary]),
        titleEn: entry.word,
        titleTh: entry.meaningTh?.trim() || synText,
        bodyEn: `Synonyms: ${synText}`,
        bodyTh: `คำเหมือน/ใกล้เคียง: ${synText}`,
        userNote: "",
        excerpt: synText.length > 80 ? `${synText.slice(0, 80)}…` : synText,
        attemptId: `vocab-${setNumber}-p${passageNumber}-${entry.word}`,
      });
      markVocabWordNotebookSaved(round, setNumber, passageNumber, entry.word);
      setSaved(true);
      setShowAddedCelebration(true);
    } catch {
      /* ignore */
    }
  };

  const stagger = staggerIn(index);
  return (
    <li
      className={`relative ep-brutal-reading rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] ${
        showAddedCelebration ? "mb-1 pb-16 sm:pb-14" : ""
      } ${stagger.className}`}
      style={stagger.style}
    >
      <p className="text-lg font-black text-neutral-900">{entry.word}</p>
      <p className="mt-2 text-sm text-neutral-700">
        <span className="font-bold">Synonyms: </span>
        <span className="ep-stat">{synText}</span>
      </p>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saved}
        className={`mt-3 border-4 border-black px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#000] transition-transform active:translate-x-px active:translate-y-px ${
          saved ? "bg-green-600 text-white" : "bg-ep-yellow text-black hover:bg-[#ffe033]"
        }`}
      >
        {saved ? "Saved!" : "Add to notebook"}
      </button>
      {showAddedCelebration ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-[min(100%,19rem)] -translate-x-1/2">
          <div
            role="status"
            aria-live="polite"
            className="ep-vocab-notebook-toast rounded-[6px] border-[3px] border-black bg-[#e8fff3] px-3 py-2.5 text-center shadow-[4px_4px_0_0_#000]"
          >
            <p className="text-sm font-black leading-snug text-emerald-900">
              <span className="inline-block" aria-hidden>
                📓{" "}
              </span>
              Added to notebook!
            </p>
            <p className="mt-1 text-xs font-semibold leading-snug text-emerald-800/95">
              Don&apos;t forget to study later :)
            </p>
          </div>
        </div>
      ) : null}
    </li>
  );
}
