"use client";

import { useMemo, useState } from "react";
import { sfxCorrect, sfxWrong } from "@/lib/exam-sfx";
import { shuffleMcOptions } from "@/lib/reading-utils";
import { addNotebookEntry, NOTEBOOK_BUILTIN, normalizeCategoryIds } from "@/lib/notebook-storage";
import {
  isVocabWordNotebookSaved,
  markVocabWordNotebookSaved,
} from "@/lib/vocab-storage";
import type {
  VocabCorrectWordEntry,
  VocabExamResultRow,
  VocabPassageUnit,
  VocabRoundNum,
} from "@/types/vocab";

/**
 * Vocabulary word-fill, rebuilt to the real DET layout: the passage on the LEFT with numbered
 * gaps, the "select a word" list on the RIGHT (docs screenshot). Unlike the real test we grade
 * each blank the moment it is answered — a wrong pick turns the gap red, fills it with what the
 * learner chose, and drops an inline card that shows the CORRECT word, its Thai meaning, a short
 * why, and a one-tap "save to notebook" button. DET reveals nothing; that gap is the lesson.
 */
export function VocabExam({
  round,
  passage,
  setNumber,
  passageNumber,
  onComplete,
}: {
  round: VocabRoundNum;
  passage: VocabPassageUnit;
  setNumber: number;
  passageNumber: number;
  onComplete: (rows: VocabExamResultRow[]) => void;
}) {
  const parts = useMemo(() => passage.passageText.split("[BLANK]"), [passage.passageText]);
  const shuffledPerBlank = useMemo(
    () => passage.blanks.map((b) => shuffleMcOptions(b.options, b.correctAnswer)),
    [passage.blanks],
  );
  const blankCount = passage.blanks.length;
  const passageTitle = passage.titleEn?.trim() || `Set ${setNumber} · Passage ${passageNumber}`;

  /** null = not answered yet; otherwise the option the learner picked. */
  const [picks, setPicks] = useState<(string | null)[]>(() => Array(blankCount).fill(null));
  /** Which blank's dropdown is open on the right. */
  const [openBlank, setOpenBlank] = useState<number | null>(0);

  if (parts.length !== blankCount + 1) {
    return (
      <p className="text-sm font-bold text-red-700">
        Invalid passage: expected {blankCount} [BLANK] markers.
      </p>
    );
  }

  const answeredCount = picks.filter((p) => p !== null).length;
  const allAnswered = answeredCount === blankCount;

  const pick = (i: number, option: string) => {
    if (picks[i] !== null) return;
    if (option === passage.blanks[i]!.correctAnswer) sfxCorrect();
    else sfxWrong();
    setPicks((prev) => {
      const next = [...prev];
      next[i] = option;
      return next;
    });
    // Jump the open panel to the next unanswered blank so the flow keeps moving.
    const nextUnanswered = picks.findIndex((p, idx) => p === null && idx !== i);
    setOpenBlank(nextUnanswered === -1 ? null : nextUnanswered);
  };

  const finish = () => {
    const rows: VocabExamResultRow[] = passage.blanks.map((b, i) => ({
      blankIndex: i + 1,
      question: b.question,
      userAnswer: picks[i] ?? "",
      correctAnswer: b.correctAnswer,
      isCorrect: picks[i] === b.correctAnswer,
      explanationThai: b.explanationThai,
    }));
    onComplete(rows);
  };

  return (
    <div className="space-y-4">
      {/* P'Doy tip — slim */}
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">
          📚
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Vocabulary · Set {setNumber} · Passage {passageNumber}
          </p>
          <p className="text-[13px] font-semibold leading-5 text-emerald-900">
            อ่านทั้งประโยคก่อนเลือก · ตอบผิดช่องไหน เก็บลง Notebook ได้เลยตรงนั้น
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)] ring-1 ring-black/5">
        {/* header strip */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-lg">📝</span>
            <span className="font-black text-slate-800">
              {answeredCount}/{blankCount}
            </span>
            <span className="font-semibold">ช่องว่าง</span>
          </p>
          <p className="truncate pl-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            {passageTitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
          {/* LEFT — passage */}
          <div className="max-h-[42vh] overflow-y-auto border-b border-slate-200 px-4 py-5 sm:px-6 lg:max-h-[62vh] lg:border-b-0">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Passage
            </p>
            <p className="text-[15px] leading-9 text-slate-800">
              {parts.map((segment, i) => (
                <span key={i}>
                  {segment}
                  {i < blankCount ? <PassageBlank index={i} pick={picks[i]} answer={passage.blanks[i]!.correctAnswer} /> : null}
                </span>
              ))}
            </p>
          </div>

          {/* RIGHT — questions */}
          <div className="max-h-[52vh] overflow-y-auto px-4 py-5 sm:px-6 lg:max-h-[62vh]">
            <h2 className="text-[17px] font-black leading-6 text-slate-900">
              เลือกคำที่เหมาะที่สุดสำหรับช่องว่างแต่ละช่อง
            </h2>
            <p className="mb-4 mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Select the best option for each missing word
            </p>

            <div className="space-y-2.5">
              {passage.blanks.map((b, i) => (
                <BlankRow
                  key={i}
                  index={i}
                  chosen={picks[i]}
                  correctAnswer={b.correctAnswer}
                  explanationThai={b.explanationThai}
                  options={shuffledPerBlank[i]!.shuffled}
                  correctWord={passage.correctWords[i]}
                  open={openBlank === i}
                  onToggle={() => setOpenBlank(openBlank === i ? null : i)}
                  onPick={(opt) => pick(i, opt)}
                  round={round}
                  setNumber={setNumber}
                  passageNumber={passageNumber}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={!allAnswered}
              onClick={finish}
              className="mt-5 w-full rounded-xl px-6 py-3.5 text-sm font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              style={allAnswered ? { background: "#004AAD", color: "#FFCC00" } : undefined}
            >
              {allAnswered ? "ดูผลสรุป →" : `เหลืออีก ${blankCount - answeredCount} ช่อง`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── a numbered gap inside the passage ─────────────────────────────────── */

function PassageBlank({
  index,
  pick,
  answer,
}: {
  index: number;
  pick: string | null;
  answer: string;
}) {
  const answered = pick !== null;
  const correct = pick === answer;
  return (
    <span className="mx-0.5 inline-flex min-w-[3.5rem] items-baseline gap-1 border-b-2 px-1 sm:min-w-[5rem]"
      style={{ borderColor: answered ? (correct ? "#059669" : "#e11d48") : "#cbd5e1" }}
    >
      <span className="rounded border border-slate-300 bg-slate-50 px-1 text-[10px] font-black leading-none text-slate-500">
        {index + 1}
      </span>
      <span
        className="font-black"
        style={{ color: answered ? (correct ? "#047857" : "#e11d48") : "#94a3b8" }}
      >
        {answered ? pick : ""}
      </span>
    </span>
  );
}

/* ── one blank on the right: dropdown + instant feedback ────────────────── */

function BlankRow({
  index,
  chosen,
  correctAnswer,
  explanationThai,
  options,
  correctWord,
  open,
  onToggle,
  onPick,
  round,
  setNumber,
  passageNumber,
}: {
  index: number;
  chosen: string | null;
  correctAnswer: string;
  explanationThai: string;
  options: string[];
  correctWord?: VocabCorrectWordEntry;
  open: boolean;
  onToggle: () => void;
  onPick: (option: string) => void;
  round: VocabRoundNum;
  setNumber: number;
  passageNumber: number;
}) {
  const answered = chosen !== null;
  const correct = chosen === correctAnswer;

  return (
    <div>
      <button
        type="button"
        disabled={answered}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded-xl border-2 bg-white px-3.5 py-3 text-left text-[14px] transition disabled:cursor-default ${
          answered
            ? correct
              ? "border-emerald-400"
              : "border-rose-400"
            : open
              ? "border-[#004AAD]"
              : "border-slate-200"
        }`}
      >
        <span className="rounded border border-slate-300 bg-slate-50 px-1.5 text-[10px] font-black text-slate-500">
          {index + 1}
        </span>
        <span
          className={`flex-1 font-bold ${
            answered ? (correct ? "text-emerald-700" : "text-rose-600 line-through") : "text-slate-400"
          }`}
        >
          {chosen ?? "เลือกคำ"}
        </span>
        {answered ? (
          <span className={`text-base font-black ${correct ? "text-emerald-600" : "text-rose-500"}`}>
            {correct ? "✓" : "✕"}
          </span>
        ) : (
          <span className="text-slate-400">{open ? "▲" : "▼"}</span>
        )}
      </button>

      {open && !answered ? (
        <div className="mt-1 overflow-hidden rounded-xl border-2 border-slate-200">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onPick(o)}
              className="block w-full border-b border-slate-100 bg-white px-4 py-3 text-left text-[14px] font-bold text-slate-800 last:border-0 hover:bg-slate-50"
            >
              {o}
            </button>
          ))}
        </div>
      ) : null}

      {answered && !correct ? (
        <BlankFeedback
          correctAnswer={correctAnswer}
          explanationThai={explanationThai}
          correctWord={correctWord}
          round={round}
          setNumber={setNumber}
          passageNumber={passageNumber}
        />
      ) : null}
    </div>
  );
}

/* ── the red "here's the right word" card, with save-to-notebook ────────── */

function BlankFeedback({
  correctAnswer,
  explanationThai,
  correctWord,
  round,
  setNumber,
  passageNumber,
}: {
  correctAnswer: string;
  explanationThai: string;
  correctWord?: VocabCorrectWordEntry;
  round: VocabRoundNum;
  setNumber: number;
  passageNumber: number;
}) {
  const meaningTh =
    correctWord?.meaningTh?.trim() ||
    (correctWord?.synonyms.length ? correctWord.synonyms.join(", ") : "");
  // The meaning is shown on its own line, so drop a leading "แปลว่า …" clause the explanation repeats.
  const explanationBody = explanationThai.replace(
    /^\s*แปลว่า\s*[‘'’"][^‘'’".]+[’'‘"]\s*/,
    "",
  );
  const [saved, setSaved] = useState(() =>
    isVocabWordNotebookSaved(round, setNumber, passageNumber, correctAnswer),
  );

  const save = async () => {
    if (saved) return;
    const synText = correctWord?.synonyms.length ? correctWord.synonyms.join(", ") : "";
    try {
      await addNotebookEntry({
        source: "vocabulary-comprehension",
        categoryIds: normalizeCategoryIds([NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.vocabulary]),
        titleEn: correctAnswer,
        titleTh: meaningTh || synText,
        bodyEn: synText ? `Synonyms: ${synText}` : correctAnswer,
        bodyTh: explanationThai || (synText ? `คำเหมือน/ใกล้เคียง: ${synText}` : ""),
        userNote: "",
        excerpt: meaningTh.length > 80 ? `${meaningTh.slice(0, 80)}…` : meaningTh,
        attemptId: `vocab-${setNumber}-p${passageNumber}-${correctAnswer}`,
      });
      markVocabWordNotebookSaved(round, setNumber, passageNumber, correctAnswer);
      setSaved(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-1.5 rounded-xl border-2 border-rose-200 bg-rose-50/70 px-3.5 py-3">
      <p className="text-[13px] leading-6 text-slate-800">
        <span className="text-rose-600">✕ ยังไม่ใช่</span> · คำที่ถูกคือ{" "}
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-black text-emerald-800">
          {correctAnswer}
        </span>
        {meaningTh ? <span className="text-slate-600"> — แปลว่า {meaningTh}</span> : null}
      </p>
      {explanationBody ? (
        <p className="mt-1.5 text-[12.5px] leading-6 text-slate-600">{explanationBody}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void save()}
        disabled={saved}
        className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${
          saved ? "bg-emerald-600 text-white" : "bg-[#FFCC00] text-[#004AAD] hover:brightness-105"
        }`}
      >
        {saved ? "📓 บันทึกแล้ว" : "📓 เก็บลง Notebook"}
      </button>
    </div>
  );
}
