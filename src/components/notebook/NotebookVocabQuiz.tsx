"use client";

/**
 * NotebookVocabQuiz — a cute multiple-choice review over the learner's own saved
 * vocabulary. Shows a word, asks for its meaning, 4 choices. Right → celebrate +
 * next question; wrong → encourage + try again on the SAME question. Runs up to
 * 10 questions (or all the vocab they have, if fewer), then a celebration report.
 *
 * Deck = the same vocabulary-only, not-yet-mastered entries the matching game uses
 * (passed in by NotebookListV2). A correct answer marks that word mastered, same as
 * the matching game, so review decks shrink as the learner truly learns.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { CoachBubble } from "@/components/ui/CoachBubble";
import { sfxCelebrate, sfxCorrect, sfxWrong } from "@/lib/exam-sfx";
import type { NotebookEntry } from "@/types/writing";

const MAX_Q = 10;
const ADVANCE_MS = 950;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function meaningOf(w: NotebookEntry): string {
  const wordEn = w.titleEn?.trim().toLowerCase() ?? "";
  // Some older saved entries mistakenly stored the English word itself as the
  // "Thai meaning" — skip any candidate that's just the word repeated back.
  const candidates = [w.titleTh, w.bodyTh, w.bodyEn];
  for (const c of candidates) {
    const trimmed = (c ?? "").trim();
    if (trimmed && trimmed.toLowerCase() !== wordEn) return trimmed;
  }
  return "";
}

type Question = { word: NotebookEntry; choices: string[]; answer: string };

function buildQuestions(deck: NotebookEntry[]): Question[] {
  const usable = deck.filter((w) => w.titleEn?.trim() && meaningOf(w));
  const picked = shuffle(usable).slice(0, MAX_Q);
  const pool = Array.from(new Set(usable.map(meaningOf)));
  return picked.map((word) => {
    const answer = meaningOf(word);
    const distractors = shuffle(pool.filter((m) => m !== answer)).slice(0, 3);
    return { word, answer, choices: shuffle([answer, ...distractors]) };
  });
}

const ENCOURAGE = [
  "ยังไม่ใช่นะ ลองใหม่อีกครั้ง! 💪",
  "เกือบแล้ว! ลองดูอีกทีนะ ✨",
  "ไม่เป็นไร ค่อยๆ คิดแล้วลองใหม่นะ 🌟",
];

export function NotebookVocabQuiz({
  deck,
  onMastered,
  onClose,
}: {
  deck: NotebookEntry[];
  onMastered: (id: string) => void;
  onClose: () => void;
}) {
  // Frozen for the session so a background entries refresh can't reshuffle mid-quiz.
  const [questions] = useState(() => buildQuestions(deck));
  const [qIdx, setQIdx] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<Set<string>>(new Set());
  const [correctPick, setCorrectPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [encourage, setEncourage] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setPortalReady(true);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const total = questions.length;
  const q = questions[qIdx];
  const usedAll = total < MAX_Q;

  const goNext = () => {
    setWrongPicks(new Set());
    setCorrectPick(null);
    setEncourage(null);
    if (qIdx + 1 >= total) {
      setFinished(true);
      sfxCelebrate("lg");
    } else {
      setQIdx((i) => i + 1);
    }
  };

  const choose = (choice: string) => {
    if (!q || correctPick) return;
    if (wrongPicks.has(choice)) return;
    if (choice === q.answer) {
      sfxCorrect();
      setCorrectPick(choice);
      setScore((s) => s + 1);
      // Only mark mastered on a clean first-try correct — a wrong-then-right
      // answer stays in the deck so they can review it again later.
      if (wrongPicks.size === 0) onMastered(q.word.id);
      timers.current.push(setTimeout(goNext, ADVANCE_MS));
    } else {
      sfxWrong();
      setWrongPicks((prev) => new Set(prev).add(choice));
      setEncourage(ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)] ?? ENCOURAGE[0]!);
    }
  };

  if (!portalReady) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#004AAD]">🎯 ทายความหมายคำศัพท์</p>
            {!finished && total > 0 ? (
              <p className="mt-0.5 text-xs text-slate-500">
                ข้อ {Math.min(qIdx + 1, total)}/{total} · ถูกแล้ว {score} ข้อ
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600"
          >
            ✕ ปิด
          </button>
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-12 text-center">
            <p className="text-2xl">📚</p>
            <p className="text-sm font-bold text-slate-700">ยังไม่มีคำศัพท์ให้ทบทวนนะ</p>
            <button type="button" onClick={onClose} className="rounded-xl bg-[#004AAD] px-5 py-2 text-sm font-bold text-[#FFCC00]">
              ปิด
            </button>
          </div>
        ) : finished ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <CelebrateMascot title="เก่งมากเลย! 🎉" />
            <CoachBubble>
              {usedAll
                ? `นั่นคือคำศัพท์ทั้งหมดที่คุณมีตอนนี้ (${total} คำ) — ทบทวนครบแล้ว เก่งมากจริงๆ! เก็บคำใหม่เพิ่มแล้วกลับมาเล่นอีกได้เลยนะ 🌟`
                : `ทำครบ ${total} ข้อแล้ว สุดยอดไปเลย! ทบทวนบ่อยๆ แบบนี้ คำศัพท์จะติดตัวยาวๆ เลยนะ 💪`}
            </CoachBubble>
            <div className="mt-3 rounded-2xl bg-emerald-50 px-5 py-3 ring-1 ring-emerald-100">
              <p className="text-sm font-bold text-emerald-800">
                ตอบถูก {score} จาก {total} ข้อ
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-2xl bg-ep-yellow px-6 py-3 font-display text-sm font-extrabold text-slate-900 shadow-md transition hover:shadow-lg active:scale-[0.98]"
            >
              เสร็จสิ้น
            </button>
          </div>
        ) : q ? (
          <>
            {/* the word */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 p-6 text-center ring-1 ring-indigo-100">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">คำนี้แปลว่าอะไร?</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{q.word.titleEn}</p>
            </div>

            {encourage ? (
              <div className="mt-3">
                <CoachBubble label="ลองใหม่นะ">{encourage}</CoachBubble>
              </div>
            ) : null}

            {/* choices */}
            <div className="mt-4 grid gap-2.5">
              {q.choices.map((choice, i) => {
                const isCorrect = correctPick === choice;
                const isWrong = wrongPicks.has(choice);
                return (
                  <button
                    key={`${choice}-${i}`}
                    type="button"
                    disabled={isWrong || !!correctPick}
                    onClick={() => choose(choice)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-bold shadow-sm transition-colors ${
                      isCorrect
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : isWrong
                          ? "border-rose-300 bg-rose-50 text-rose-400 line-through"
                          : "border-slate-200 bg-white text-slate-800 hover:border-[#004AAD] hover:bg-blue-50"
                    }`}
                  >
                    {isCorrect ? "✅ " : ""}
                    {choice}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
