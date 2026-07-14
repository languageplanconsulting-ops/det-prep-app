"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { CoachBubble } from "@/components/ui/CoachBubble";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { fitbPrefix, fitbPrefixLength, fitbRemainderLength, scoreFitb, type MissingWord } from "@/lib/fitb-lesson-scoring";
import { splitFitbPassage } from "@/lib/fitb-passage";
import {
  blankToMissingWord,
  exercisesForLevel,
  grammarTopicMeta,
  GRAMMAR_DIFFICULTY_META,
  type GrammarDifficulty,
  type GrammarExercise,
} from "@/lib/grammar-fitb";
import { itemKey, markItemSeen } from "@/lib/lesson-seen";
import { useLessonUserId } from "@/lib/lesson-user";
import { loadLessonProgress, saveUnitScore, unitKey } from "@/lib/lessons-progress";

const TOPIC = "grammar-fitb";
const HUB = "/practice/lessons/grammar-fitb";

/** Random encouragement shown when an exercise is fully cleared (100%). */
const ENCOURAGEMENT_LINES = [
  "เก่งมาก! เติมถูกครบทุกช่องเลย 🎉",
  "ยอดเยี่ยม! จับกฎได้แม่นมาก 🌟",
  "ปังมาก! ครบ 100% แบบสวยๆ ✨",
  "เจ๋งไปเลย! ไวยากรณ์แน่นขึ้นทุกข้อ 💪",
  "สุดยอด! ผ่านข้อนี้แบบไม่มีที่ติ 🏆",
  "เก่งสุดๆ ไปกันต่อเลย! 🚀",
  "ทำได้ดีมาก! สมองจำกฎได้แล้วนะ 🧠",
  "ปรบมือรัวๆ! เติมถูกครบทุกช่อง 👏",
  "เยี่ยมไปเลย! ฝึกไปเรื่อยๆ จะยิ่งชัวร์ 🔥",
  "เก่งจนพี่ดอยยิ้มเลย! เก็บครบ 100% 😄",
];
function randomEncouragement(): string {
  return ENCOURAGEMENT_LINES[Math.floor(Math.random() * ENCOURAGEMENT_LINES.length)]!;
}

function isValidLevel(v: string): v is GrammarDifficulty {
  return v === "easy" || v === "medium" || v === "hard";
}

/** next/prev editable blank, skipping already-locked (mastered) ones. */
function nextEditableIndex(words: MissingWord[], locked: boolean[], from: number): number {
  for (let j = from + 1; j < words.length; j++) {
    if (!locked[j] && fitbRemainderLength(words[j]!) > 0) return j;
  }
  return -1;
}
function prevEditableIndex(words: MissingWord[], locked: boolean[], from: number): number {
  for (let j = from - 1; j >= 0; j--) {
    if (!locked[j] && fitbRemainderLength(words[j]!) > 0) return j;
  }
  return -1;
}

function shuffled(indices: number[]): number[] {
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

type Phase = "learn" | "quiz" | "done";

export function GrammarLevelRunner({ level: levelParam }: { level: string }) {
  const uid = useLessonUserId();
  const level = isValidLevel(levelParam) ? levelParam : null;
  const levelExercises = useMemo(() => (level ? exercisesForLevel(level) : []), [level]);

  const [phase, setPhase] = useState<Phase>("learn");
  const [queue, setQueue] = useState<number[]>([]); // indices into levelExercises
  const [qPos, setQPos] = useState(0);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [inputs, setInputs] = useState<string[]>([]);
  const [clueVisible, setClueVisible] = useState<boolean[]>([]);
  const [checked, setChecked] = useState(false);
  const [doneIdx, setDoneIdx] = useState<Set<number>>(new Set());
  const [passedThisSession, setPassedThisSession] = useState(0);
  const [encouragement, setEncouragement] = useState("");
  const rewarded = useRef(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!level) return;
    let alive = true;
    loadLessonProgress(uid).then((scores) => {
      if (!alive) return;
      const done = new Set<number>();
      levelExercises.forEach((_e, i) => {
        if (unitKey(TOPIC, level, i) in scores) done.add(i);
      });
      setDoneIdx(done);
    });
    return () => {
      alive = false;
    };
  }, [uid, level, levelExercises]);

  const exOrigIdx = queue[qPos];
  const exercise: GrammarExercise | undefined = exOrigIdx != null ? levelExercises[exOrigIdx] : undefined;
  const words: MissingWord[] = useMemo(() => (exercise ? exercise.blanks.map(blankToMissingWord) : []), [exercise]);
  const segments = useMemo(() => (exercise ? splitFitbPassage(exercise.passage) : []), [exercise]);

  useEffect(() => {
    if (!exercise) return;
    const n = exercise.blanks.length;
    setLocked(new Array(n).fill(false));
    setInputs(new Array(n).fill(""));
    setClueVisible(new Array(n).fill(false));
    setChecked(false);
    setEncouragement("");
  }, [exercise]);

  if (!level) {
    return (
      <div className="py-16 text-center">
        <p className="font-bold text-slate-700">ไม่พบด่านนี้</p>
        <Link href={HUB} className="mt-4 inline-block text-sm font-bold text-[#004AAD]">
          กลับไปหน้าเดินทาง
        </Link>
      </div>
    );
  }

  // Narrowed once here — TS control-flow narrowing from the early return above does
  // not propagate into the nested `function` closures below, so use this instead.
  const lvl: GrammarDifficulty = level;
  const meta = GRAMMAR_DIFFICULTY_META[lvl];
  const n = exercise?.blanks.length ?? 0;

  function reconstructedInput(i: number): string {
    if (locked[i]) return words[i]!.correctWord;
    return fitbPrefix(words[i]!) + (inputs[i] ?? "");
  }
  const grades = checked && exercise ? scoreFitb(words.map((_w, i) => reconstructedInput(i)), words) : null;

  const canCheck = words.every((w, i) => {
    if (locked[i]) return true;
    const rem = fitbRemainderLength(w);
    return rem === 0 || (inputs[i] ?? "").trim().length === rem;
  });

  function startQuiz() {
    const all = levelExercises.map((_e, i) => i);
    const notDone = all.filter((i) => !doneIdx.has(i));
    const pool = notDone.length ? notDone : all;
    sfxTransition();
    setQueue(shuffled(pool));
    setQPos(0);
    setPhase("quiz");
  }

  function setInput(i: number, raw: string) {
    if (locked[i] || checked) return;
    const rem = fitbRemainderLength(words[i]!);
    const next = rem > 0 ? raw.slice(0, rem) : "";
    setInputs((prev) => {
      const cp = [...prev];
      cp[i] = next;
      return cp;
    });
    if (rem > 0 && next.length >= rem) {
      const ni = nextEditableIndex(words, locked, i);
      if (ni >= 0) window.requestAnimationFrame(() => inputRefs.current[ni]?.focus());
    }
  }

  function handleBlankKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (locked[i] || checked) return;
    if (e.key !== "Backspace" || (inputs[i] ?? "").length > 0) return;
    const pi = prevEditableIndex(words, locked, i);
    if (pi < 0) return;
    e.preventDefault();
    setInputs((prev) => {
      const cp = [...prev];
      cp[pi] = (cp[pi] ?? "").slice(0, -1);
      return cp;
    });
    window.requestAnimationFrame(() => inputRefs.current[pi]?.focus());
  }

  function toggleClue(i: number) {
    setClueVisible((prev) => {
      const cp = [...prev];
      cp[i] = !cp[i];
      return cp;
    });
  }

  function checkAnswers() {
    if (!canCheck || checked || exOrigIdx == null) return;
    const res = scoreFitb(words.map((_w, i) => reconstructedInput(i)), words);
    const attemptedThisRound = words.map((_w, i) => !locked[i]);
    const anyWrongThisRound = res.marks.some((m, i) => attemptedThisRound[i] && m.grade !== "exact");
    setChecked(true);
    if (anyWrongThisRound) sfxWrong();
    else sfxCorrect();
    const nextLocked = res.marks.map((m, i) => locked[i] || m.grade === "exact");
    setLocked(nextLocked);
    if (nextLocked.every(Boolean)) {
      sfxCelebrate("md");
      setEncouragement(randomEncouragement());
      saveUnitScore(uid, TOPIC, lvl, exOrigIdx, 100).catch(() => {});
      setDoneIdx((prev) => new Set(prev).add(exOrigIdx));
      setPassedThisSession((c) => c + 1);
    }
  }

  function retryWrongOnly() {
    sfxTransition();
    setInputs((prev) => prev.map((v, i) => (locked[i] ? v : "")));
    setClueVisible((prev) => prev.map((v, i) => (locked[i] ? v : false)));
    setChecked(false);
    window.requestAnimationFrame(() => {
      const firstWrong = words.findIndex((_w, i) => !locked[i]);
      if (firstWrong >= 0) inputRefs.current[firstWrong]?.focus();
    });
  }

  function goNext() {
    sfxTransition();
    if (qPos + 1 < queue.length) {
      setQPos((i) => i + 1);
    } else {
      finish();
    }
  }

  function finish() {
    setPhase("done");
    if (!rewarded.current) {
      rewarded.current = true;
      sfxCelebrate("lg");
      awardXp(uid, XP.auto(100)).catch(() => {});
      markItemSeen(uid, itemKey("grammarfitb", lvl), "grammarfitb", "manual_browse").catch(() => {});
    }
  }

  // ---------------------------------------------------------------- DONE
  if (phase === "done") {
    return (
      <div className="py-8">
        <CelebrateMascot
          title="ผ่านด่านนี้ครบ 100%! 🎉"
          subtitle={
            level === "hard"
              ? `เก็บครบ ${passedThisSession} ข้อในด่านนี้ — เก่งมาก จบทั้ง 3 ด่านแล้ว!`
              : `เก็บครบ ${passedThisSession} ข้อในด่านนี้ — ปลดล็อกด่านถัดไปแล้ว!`
          }
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6 text-center">
          <p className="text-4xl font-black text-[#004AAD]">100%</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{meta.th} · {meta.cefr}</p>
        </div>
        <div className="text-center">
          <Link href={HUB} className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]">
            กลับไปหน้าเดินทาง →
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- LEARN (level intro)
  if (phase === "learn") {
    const totalDone = levelExercises.filter((_e, i) => doneIdx.has(i)).length;
    return (
      <div>
        <Link href={HUB} className="text-sm font-bold text-[#004AAD]">← กลับไปหน้าเดินทาง</Link>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">บทเรียน · ไวยากรณ์</p>
          <div className="mt-1 flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-black ${meta.badge}`}>
              {meta.cefr}
            </span>
            <div>
              <h1 className="font-display text-xl font-black leading-tight text-slate-900">{meta.th}</h1>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">เป้าหมาย DET {meta.scoreBand}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <CoachBubble>
            ด่านนี้คละไวยากรณ์ทุกเรื่องปนกัน ไม่ได้แยกเป็นหมวดๆ — ดูป้ายหัวข้อกับคำแนะนำ{" "}
            <strong>เหนือแต่ละข้อ</strong> ให้ดี ว่าข้อนั้นทดสอบกฎไหน แล้วต้องเติมให้ถูก{" "}
            <strong>ครบ 100%</strong> ทุกข้อถึงจะปลดล็อกด่านถัดไป — ข้อไหนผิดจะได้ลองใหม่เฉพาะช่องที่ผิดจนกว่าจะถูก
          </CoachBubble>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">ไวยากรณ์ที่จะเจอในด่านนี้</p>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(levelExercises.map((e) => e.topic))].map((tid) => {
              const t = grammarTopicMeta(tid);
              return (
                <span key={tid} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  {t.icon} {t.th}
                </span>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={startQuiz}
          className="mt-6 w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]"
        >
          {totalDone > 0 && totalDone < levelExercises.length
            ? `ทำต่อ (เหลือ ${levelExercises.length - totalDone} ข้อ) →`
            : `เริ่มด่านนี้ (${levelExercises.length} ข้อ) →`}
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- QUIZ
  if (!exercise) {
    return (
      <div className="py-16 text-center">
        <p className="font-bold text-slate-700">ไม่พบข้อในด่านนี้</p>
        <Link href={HUB} className="mt-4 inline-block text-sm font-bold text-[#004AAD]">
          กลับไปหน้าเดินทาง
        </Link>
      </div>
    );
  }

  const topicMeta = grammarTopicMeta(exercise.topic);
  const allLocked = locked.length > 0 && locked.every(Boolean);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
        <Link href={HUB} className="text-[#004AAD]">← ออก</Link>
        <span className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${meta.badge}`}>{meta.th} · {meta.cefr}</span>
          <span>ข้อ {qPos + 1} / {queue.length}</span>
        </span>
      </div>

      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-[#FFCC00] transition-all duration-500 ease-out"
          style={{ width: `${((qPos + (allLocked ? 1 : 0)) / queue.length) * 100}%` }}
        />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black text-[#FFCC00]">
            {topicMeta.icon} {topicMeta.th}
          </span>
        </div>
        <CoachBubble>{topicMeta.tipTh}</CoachBubble>
      </div>

      <div key={exercise.id} className="ep-step-slide-in">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {exercise.passageTh ? (
            <p className="mb-2.5 inline-block rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500">📖 {exercise.passageTh}</p>
          ) : null}
          <h2 className="mb-3 font-display text-[15px] font-black leading-snug text-slate-900">{exercise.titleEn}</h2>
          <p className="text-[14.5px] leading-[2.3] text-slate-800">
            {segments.map((seg, idx) => {
              if (seg.type === "text") return <span key={idx}>{seg.value}</span>;
              const b = seg.blankIndex;
              if (b < 0 || b >= n) return <span key={idx}>{seg.value}</span>;
              const w = words[b]!;
              const rem = fitbRemainderLength(w);
              const isLocked = locked[b];
              const g = grades?.marks[b];
              const isWrongNow = checked && !isLocked && g && g.grade !== "exact";
              const typed = isLocked ? w.correctWord.slice(fitbPrefixLength(w)) : (inputs[b] ?? "");
              return (
                <span key={idx} className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-baseline">
                  <span className="font-black text-[#004AAD]">{fitbPrefix(w)}</span>
                  <span className="relative inline-flex items-center">
                    <input
                      ref={(el) => {
                        inputRefs.current[b] = el;
                      }}
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={typed}
                      disabled={isLocked || checked}
                      maxLength={rem}
                      onKeyDown={(e) => handleBlankKeyDown(b, e)}
                      onChange={(e) => setInput(b, e.target.value)}
                      className="absolute left-0 top-0 h-full w-full opacity-0"
                      style={{ width: `${Math.min(Math.max(rem + 1, 3), 22)}ch`, minWidth: "2.5ch" }}
                      aria-label={`ช่องที่ ${b + 1}`}
                    />
                    <span
                      className="inline-flex cursor-text gap-0.5"
                      onClick={() => inputRefs.current[b]?.focus()}
                      aria-hidden="true"
                    >
                      {Array.from({ length: rem }, (_, k) => (
                        <span
                          key={k}
                          className={`inline-flex h-7 w-6 items-center justify-center rounded border text-xs font-bold ${
                            isLocked
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : isWrongNow
                                ? "border-rose-400 bg-rose-50 text-rose-800"
                                : typed[k]
                                  ? "border-[#004AAD]/40 bg-blue-50 text-neutral-900"
                                  : "border-neutral-300 bg-neutral-50 text-neutral-400"
                          }`}
                        >
                          {typed[k] ?? "_"}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
              );
            })}
          </p>
        </div>

        {!checked ? (
          <div className="mt-3 space-y-2">
            {exercise.blanks.map((blk, i) => {
              if (locked[i]) return null;
              return (
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
              );
            })}
          </div>
        ) : null}

        {checked && grades ? (
          <div className="mt-4 space-y-2">
            <div className={`rounded-xl px-4 py-3 text-white ${allLocked ? "bg-emerald-600" : "bg-slate-900"}`}>
              <p className="text-sm font-black">
                {allLocked ? encouragement : `ล็อกแล้ว ${locked.filter(Boolean).length} / ${n} ช่อง — ลองใหม่เฉพาะช่องที่ผิด`}
              </p>
            </div>
            {exercise.blanks.map((blk, i) => {
              if (locked[i]) {
                return (
                  <div key={i} className="rounded-xl border border-emerald-400 bg-emerald-50 p-3">
                    <p className="text-sm font-black text-emerald-700">ช่องที่ {i + 1}: ✓ ถูกต้อง (ล็อกแล้ว)</p>
                  </div>
                );
              }
              const mark = grades.marks[i]!;
              return (
                <div key={i} className="rounded-xl border border-rose-300 bg-rose-50 p-3">
                  <p className="text-sm font-black text-rose-700">
                    ช่องที่ {i + 1}: ✕ เฉลย: {blk.correctWord}
                    {mark.input ? <span className="ml-1 font-semibold text-rose-500">(คุณตอบ {mark.input})</span> : null}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-slate-700">{blk.explanationThai}</p>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-6">
          {checked ? (
            allLocked ? (
              <button type="button" onClick={goNext} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
                {qPos + 1 >= queue.length ? "ดูสรุปด่าน →" : "ข้อต่อไป →"}
              </button>
            ) : (
              <button type="button" onClick={retryWrongOnly} className="w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white">
                ลองใหม่เฉพาะข้อที่ผิด →
              </button>
            )
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
