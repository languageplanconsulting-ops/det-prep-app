"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { CoachBubble } from "@/components/ui/CoachBubble";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { fitbPrefix, fitbRemainderLength, scoreFitb, type MissingWord } from "@/lib/fitb-lesson-scoring";
import { splitFitbPassage } from "@/lib/fitb-passage";
import { blankToMissingWord, grammarChapter, GRAMMAR_DIFFICULTY_META, type GrammarExercise } from "@/lib/grammar-fitb";
import { itemKey, markItemSeen } from "@/lib/lesson-seen";
import { useLessonUserId } from "@/lib/lesson-user";
import { loadLessonProgress, saveUnitScore, unitKey } from "@/lib/lessons-progress";

const TOPIC = "grammar-fitb";
const HUB = "/practice/lessons/grammar-fitb";

type Phase = "learn" | "quiz" | "done";

export function GrammarChapterRunner({ chapterId }: { chapterId: string }) {
  const uid = useLessonUserId();
  const chapter = useMemo(() => grammarChapter(chapterId), [chapterId]);

  const [phase, setPhase] = useState<Phase>("learn");
  const [exIndex, setExIndex] = useState(0);
  const [inputs, setInputs] = useState<string[]>([]);
  const [clueVisible, setClueVisible] = useState<boolean[]>([]);
  const [checked, setChecked] = useState(false);
  const [scoreSum, setScoreSum] = useState(0); // sum of per-exercise pct, for the final average
  const [gradedExercises, setGradedExercises] = useState(0);
  const [doneIdx, setDoneIdx] = useState<Set<number>>(new Set());
  const rewarded = useRef(false);

  // Load which exercises in this chapter are already done, so we can resume there.
  useEffect(() => {
    if (!chapter) return;
    let alive = true;
    loadLessonProgress(uid).then((scores) => {
      if (!alive) return;
      const done = new Set<number>();
      chapter.exercises.forEach((_e, i) => {
        if (unitKey(TOPIC, chapter.id, i) in scores) done.add(i);
      });
      setDoneIdx(done);
    });
    return () => {
      alive = false;
    };
  }, [uid, chapter]);

  const exercise: GrammarExercise | undefined = chapter?.exercises[exIndex];
  const words: MissingWord[] = useMemo(() => (exercise ? exercise.blanks.map(blankToMissingWord) : []), [exercise]);
  const segments = useMemo(() => (exercise ? splitFitbPassage(exercise.passage) : []), [exercise]);

  // Reset per-exercise state whenever we move to a new exercise.
  useEffect(() => {
    if (!exercise) return;
    setInputs(new Array(exercise.blanks.length).fill(""));
    setClueVisible(new Array(exercise.blanks.length).fill(false));
    setChecked(false);
  }, [exercise]);

  if (!chapter || !exercise) {
    return (
      <div className="py-16 text-center">
        <p className="font-bold text-slate-700">ไม่พบบทเรียนนี้</p>
        <Link href={HUB} className="mt-4 inline-block text-sm font-bold text-[#004AAD]">
          กลับไปเลือกบท
        </Link>
      </div>
    );
  }

  const n = exercise.blanks.length;
  const grades = checked ? scoreFitb(words.map((w, i) => fitbPrefix(w) + (inputs[i] ?? "")), words) : null;

  const canCheck = words.every((w, i) => {
    const rem = fitbRemainderLength(w);
    return rem === 0 || (inputs[i] ?? "").trim().length === rem;
  });

  function setInput(i: number, raw: string, rem: number) {
    setInputs((prev) => {
      const cp = [...prev];
      cp[i] = raw.slice(0, rem);
      return cp;
    });
  }

  function toggleClue(i: number) {
    setClueVisible((prev) => {
      const cp = [...prev];
      cp[i] = !cp[i];
      return cp;
    });
  }

  function checkAnswers() {
    if (!canCheck || checked) return;
    const res = scoreFitb(words.map((w, i) => fitbPrefix(w) + (inputs[i] ?? "")), words);
    setChecked(true);
    const passed = res.correct >= Math.ceil(n * 0.6);
    if (passed) sfxCorrect();
    else sfxWrong();
    // Record this exercise's score toward chapter progress.
    saveUnitScore(uid, TOPIC, chapter!.id, exIndex, res.pct).catch(() => {});
    setScoreSum((s) => s + res.pct);
    setGradedExercises((g) => g + 1);
  }

  function goNext() {
    sfxTransition();
    if (exIndex + 1 < chapter!.exercises.length) {
      setExIndex((i) => i + 1);
    } else {
      finish();
    }
  }

  function finish() {
    setPhase("done");
    if (!rewarded.current) {
      rewarded.current = true;
      sfxCelebrate("md");
      const avg = gradedExercises ? Math.round(scoreSum / gradedExercises) : 0;
      awardXp(uid, XP.auto(avg)).catch(() => {});
      markItemSeen(uid, itemKey("grammarfitb", chapter!.id), "grammarfitb", "manual_browse").catch(() => {});
    }
  }

  // ---------------------------------------------------------------- DONE
  if (phase === "done") {
    const avg = gradedExercises ? Math.round(scoreSum / gradedExercises) : 0;
    return (
      <div className="py-8">
        <CelebrateMascot
          title={avg >= 90 ? "เก่งมาก! เข้าใจบทนี้แล้ว 🎉" : "จบบทนี้แล้ว!"}
          subtitle={`คะแนนเฉลี่ย ${avg}% จาก ${gradedExercises} ข้อ — ลองบทอื่นเพื่อฝึกไวยากรณ์เพิ่มได้เลย`}
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6 text-center">
          <p className="text-4xl font-black text-[#004AAD]">{avg}%</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{chapter.th}</p>
        </div>
        <div className="text-center">
          <Link href={HUB} className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]">
            เสร็จแล้ว · กลับไปเลือกบท
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- LEARN (mascot teaches the rule)
  if (phase === "learn") {
    return (
      <div>
        <Link href={HUB} className="text-sm font-bold text-[#004AAD]">← กลับไปเลือกบท</Link>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">บทเรียน · ไวยากรณ์</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-3xl">{chapter.icon}</span>
            <div>
              <h1 className="font-display text-xl font-black leading-tight text-slate-900">{chapter.th}</h1>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{chapter.en}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm font-black text-slate-800">{chapter.ruleTitleTh}</p>
          {chapter.coachLines.map((line, i) => (
            <CoachBubble key={i}>{line}</CoachBubble>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#FFCC00]">ตัวอย่าง</p>
          <ul className="mt-2 space-y-2.5">
            {chapter.examples.map((ex, i) => (
              <li key={i}>
                <p className="text-sm font-bold leading-snug">{ex.en}</p>
                <p className="mt-0.5 text-xs text-slate-300">{ex.th}</p>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => {
            sfxTransition();
            // Resume at the first not-yet-finished exercise (or the start if all done).
            const firstUndone = chapter.exercises.findIndex((_e, i) => !doneIdx.has(i));
            setExIndex(firstUndone >= 0 ? firstUndone : 0);
            setPhase("quiz");
          }}
          className="mt-6 w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]"
        >
          {doneIdx.size > 0 && doneIdx.size < chapter.exercises.length
            ? `ทำต่อ (เหลือ ${chapter.exercises.length - doneIdx.size} ข้อ) →`
            : `เริ่มทำโจทย์ (${chapter.exercises.length} ข้อ) →`}
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- QUIZ
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
        <Link href={HUB} className="text-[#004AAD]">← ออก</Link>
        <span className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${GRAMMAR_DIFFICULTY_META[exercise.difficulty].badge}`}>
            {GRAMMAR_DIFFICULTY_META[exercise.difficulty].th}
          </span>
          <span>ข้อ {exIndex + 1} / {chapter.exercises.length}</span>
        </span>
      </div>

      {/* progress bar across the chapter's exercises */}
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-[#FFCC00] transition-all duration-500 ease-out"
          style={{ width: `${((exIndex + (checked ? 1 : 0)) / chapter.exercises.length) * 100}%` }}
        />
      </div>

      <div className="mb-4">
        <CoachBubble>
          อ่านย่อหน้าให้จบก่อนเติม — ดูว่าแต่ละช่องต้องเป็น <strong>รูปไหน</strong> ตามกฎของบทนี้ · ติดตรงไหนกด{" "}
          <strong>คำใบ้</strong> ได้เลยนะครับ
        </CoachBubble>
      </div>

      <div key={exIndex} className="ep-step-slide-in">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {exercise.passageTh ? (
            <p className="mb-2.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500">📖 {exercise.passageTh}</p>
          ) : null}
          <p className="text-[15px] leading-9 text-slate-800">
            {segments.map((seg, idx) => {
              if (seg.type === "text") return <span key={idx}>{seg.value}</span>;
              const b = seg.blankIndex;
              if (b < 0 || b >= n) return <span key={idx}>{seg.value}</span>;
              const w = words[b]!;
              const rem = fitbRemainderLength(w);
              const g = grades?.marks[b];
              const isExact = g?.grade === "exact";
              return (
                <span key={idx} className="mx-0.5 inline-flex items-center gap-0.5 align-baseline">
                  <span className="font-black text-[#004AAD]">{fitbPrefix(w)}</span>
                  <input
                    value={inputs[b] ?? ""}
                    disabled={checked}
                    onChange={(e) => setInput(b, e.target.value, rem)}
                    aria-label={`ช่องที่ ${b + 1}`}
                    className={`rounded-md border-b-2 bg-transparent px-1 text-center font-bold outline-none disabled:opacity-100 ${
                      checked
                        ? isExact
                          ? "border-emerald-500 text-emerald-700"
                          : "border-rose-500 text-rose-700"
                        : "border-[#004AAD] text-slate-900"
                    }`}
                    style={{ width: `${Math.max(2.4, rem * 0.7)}em` }}
                  />
                </span>
              );
            })}
          </p>
        </div>

        {/* per-blank clue toggles (hidden once checked — the feedback shows the answer) */}
        {!checked ? (
          <div className="mt-3 space-y-2">
            {exercise.blanks.map((blk, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleClue(i)}
                  className="flex w-full items-center justify-between text-left text-xs font-black text-slate-600"
                >
                  <span>ช่องที่ {i + 1}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#004AAD] ring-1 ring-slate-200">
                    {clueVisible[i] ? "ซ่อนคำใบ้" : "💡 คำใบ้"}
                  </span>
                </button>
                {clueVisible[i] ? <p className="mt-1.5 text-[13px] font-semibold text-slate-700">{blk.clueTh}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* feedback after checking */}
        {checked && grades ? (
          <div className="mt-4 space-y-2">
            <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              <p className="text-sm font-black">
                เติมถูก {grades.correct} / {n} ช่อง{grades.correct === n ? " — ครบทุกช่อง! 🎉" : ""}
              </p>
            </div>
            {exercise.blanks.map((blk, i) => {
              const mark = grades.marks[i]!;
              const ok = mark.grade === "exact";
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-3 ${ok ? "border-emerald-400 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}
                >
                  <p className={`text-sm font-black ${ok ? "text-emerald-700" : "text-rose-700"}`}>
                    ช่องที่ {i + 1}: {ok ? "✓ ถูกต้อง" : `✕ เฉลย: ${blk.correctWord}`}
                    {!ok && mark.input ? <span className="ml-1 font-semibold text-rose-500">(คุณตอบ {mark.input})</span> : null}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-slate-700">{blk.explanationThai}</p>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-6">
          {checked ? (
            <button type="button" onClick={goNext} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
              {exIndex + 1 >= chapter.exercises.length ? "ดูสรุปบท →" : "ข้อต่อไป →"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canCheck}
              onClick={checkAnswers}
              className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40"
            >
              {canCheck ? "ตรวจคำตอบ" : "เติมให้ครบทุกช่องก่อน"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
