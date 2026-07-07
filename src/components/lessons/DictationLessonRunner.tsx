"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { speakLesson } from "@/lib/lesson-audio";
import { useLessonUserId } from "@/lib/lesson-user";
import { fetchSeenKeys, filterUnseen, itemKey, markItemSeen } from "@/lib/lesson-seen";
import {
  clearUnitResume,
  loadUnitResume,
  saveUnitResume,
  saveUnitScore,
} from "@/lib/lessons-progress";
import {
  checkDictation,
  dictationUnit,
  isPunctuation,
  shuffle,
  type DictationLesson,
  type DictationTier,
} from "@/lib/dictation-lessons";

type Tile = { id: number; token: string };
type Phase = "solving" | "correct" | "wrong";

/** Only commas count as tiles among punctuation — matches mobile exactly. */
function isCountedTile(token: string): boolean {
  return !isPunctuation(token) || token === ",";
}
function answerTiles(lesson: DictationLesson): string[] {
  return lesson.tokens.filter(isCountedTile);
}
function buildBank(lesson: DictationLesson): Tile[] {
  const tiles = [...answerTiles(lesson), ...lesson.distractors.filter(isCountedTile)];
  return shuffle(tiles).map((token, id) => ({ id, token }));
}

export function DictationLessonRunner({ tier, unit }: { tier: DictationTier; unit: number }) {
  const uid = useLessonUserId();
  const [seenKeys, setSeenKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    let alive = true;
    fetchSeenKeys(uid).then((k) => alive && setSeenKeys(k));
    return () => {
      alive = false;
    };
  }, [uid]);

  if (!seenKeys) {
    return (
      <div className="flex justify-center py-10">
        <MascotLoader label="กำลังโหลด…" />
      </div>
    );
  }

  const items = filterUnseen(dictationUnit(tier, unit), (l) => itemKey("dictation", l.id), seenKeys);
  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-bold">คุณฝึกครบทุกข้อในด่านนี้แล้ว 🎉</p>
        <p className="mt-2 text-sm text-slate-500">ลองด่านอื่น หรือกลับมาดูสรุปความก้าวหน้าได้เลย</p>
        <Link href="/practice/lessons/dictation" className="mt-4 inline-block rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00]">
          กลับไปเลือกด่าน
        </Link>
      </div>
    );
  }

  return <Player tier={tier} unit={unit} items={items} uid={uid} />;
}

function Player({
  tier,
  unit,
  items,
  uid,
}: {
  tier: DictationTier;
  unit: number;
  items: DictationLesson[];
  uid: string | null;
}) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [bank, setBank] = useState<Tile[]>(() => buildBank(items[0]!));
  const [placed, setPlaced] = useState<(number | null)[]>(() => new Array(answerTiles(items[0]!).length).fill(null));
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("solving");
  const [hintShown, setHintShown] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const rewarded = useRef(false);
  const player = useRef<{ play: () => void } | null>(null);

  const lesson = items[index]!;

  useEffect(() => {
    const p = speakLesson(lesson.answer);
    player.current = p;
    const t = setTimeout(() => p.play(), 350);
    return () => clearTimeout(t);
  }, [lesson.answer]);

  useEffect(() => {
    const r = loadUnitResume("dictation", tier, unit);
    if (r && r.index > 0 && r.index < total) {
      setIndex(r.index);
      setCorrectCount(r.a);
      resetItem(items[r.index]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tokenOf = useMemo(() => {
    const m = new Map<number, string>();
    bank.forEach((t) => m.set(t.id, t.token));
    return m;
  }, [bank]);

  const placedTokens = placed.map((id) => (id == null ? "" : tokenOf.get(id) ?? ""));
  const correctSeq = useMemo(() => answerTiles(lesson), [lesson]);
  const allFilled = placed.every((id) => id !== null);

  function resetItem(next: DictationLesson) {
    setBank(buildBank(next));
    setPlaced(new Array(answerTiles(next).length).fill(null));
    setLocked(new Set());
    setPhase("solving");
    setHintShown(false);
  }

  function place(id: number) {
    if (phase !== "solving") return;
    const gap = placed.findIndex((x) => x === null);
    if (gap === -1) return;
    setPlaced((p) => {
      const n = [...p];
      n[gap] = id;
      return n;
    });
  }

  function unplace(id: number) {
    if (phase !== "solving" || locked.has(id)) return;
    setPlaced((p) => p.map((x) => (x === id ? null : x)));
  }

  function check() {
    if (!allFilled) return;
    markItemSeen(uid, itemKey("dictation", lesson.id), "dictation", "manual_browse").catch(() => {});
    const ok = checkDictation(placedTokens, correctSeq);
    if (ok) {
      sfxCorrect();
      setStreak((s) => s + 1);
      setCorrectCount((c) => c + 1);
      setPhase("correct");
    } else {
      sfxWrong();
      setStreak(0);
      setPhase("wrong");
    }
  }

  function tryAgain() {
    const newlyLocked = new Set(locked);
    setPlaced((p) =>
      p.map((id, i) => {
        if (id != null && tokenOf.get(id) === correctSeq[i]) {
          newlyLocked.add(id);
          return id;
        }
        return null;
      }),
    );
    setLocked(newlyLocked);
    setPhase("solving");
  }

  function next() {
    sfxTransition();
    if (index + 1 >= total) return finish();
    const n = index + 1;
    saveUnitResume("dictation", tier, unit, { index: n, a: correctCount });
    setIndex(n);
    resetItem(items[n]!);
  }

  function finish() {
    setFinished(true);
    if (!rewarded.current) {
      rewarded.current = true;
      sfxCelebrate("md");
      const pct = Math.round((correctCount / total) * 100);
      saveUnitScore(uid, "dictation", tier, unit, pct).catch(() => {});
      awardXp(uid, XP.auto(pct)).catch(() => {});
      clearUnitResume("dictation", tier, unit);
    }
  }

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    return (
      <div className="py-8">
        <CelebrateMascot
          title={pct >= 80 ? "เก่งมาก! 🎉" : "ทำได้ดีมาก!"}
          subtitle="การเรียงคำช่วยให้เห็นว่าประโยคที่ถูกต้องหน้าตาเป็นยังไง ฟังเสียงบ่อย ๆ แล้วลองพูดตาม จะจำโครงประโยคได้เร็วขึ้น"
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6 text-center">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">เรียงถูก {correctCount} จาก {total} ประโยค</p>
        </div>
        <div className="text-center">
          <Link
            href="/practice/lessons/dictation"
            className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]"
          >
            เสร็จแล้ว · กลับไปบทเรียน
          </Link>
        </div>
      </div>
    );
  }

  const canCheck = allFilled && phase === "solving";

  return (
    <div key={index} className="ep-step-slide-in">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">ข้อ {index + 1} / {total}</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-[#004AAD]">{lesson.level}</span>
          {streak >= 2 ? (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-700">🔥 {streak}</span>
          ) : null}
        </div>
        <span className="text-xs font-bold text-slate-500">ถูกแล้ว {correctCount}</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#004AAD] transition-all duration-300"
          style={{ width: `${((index + (phase === "correct" ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <p className="mb-3 text-sm font-bold text-slate-800">ฟังเสียง แล้วแตะคำเรียงเป็นประโยคให้ถูกลำดับ</p>

      <button
        type="button"
        onClick={() => player.current?.play()}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-blue-50 p-4 text-left transition hover:bg-blue-100"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">🔊</span>
        <span>
          <span className="block text-sm font-bold text-[#004AAD]">แตะเพื่อฟังอีกครั้ง</span>
          <span className="block text-xs text-[#004AAD]/70">ฟังได้ไม่จำกัด</span>
        </span>
      </button>

      <div
        className={`mb-5 min-h-[76px] rounded-xl border-2 border-dashed p-3 transition-colors ${
          phase === "correct"
            ? "border-emerald-500 bg-emerald-50"
            : phase === "wrong"
              ? "border-rose-500 bg-rose-50"
              : "border-slate-200 bg-white"
        }`}
      >
        {placed.every((id) => id === null) ? (
          <p className="py-3 text-center text-sm text-slate-400">แตะคำด้านล่างเพื่อเริ่มเรียง…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {placed.map((id, i) =>
              id == null ? (
                <div key={`empty-${i}`} className="h-[42px] w-[46px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50" />
              ) : (
                <button
                  key={id}
                  type="button"
                  onClick={() => unplace(id)}
                  disabled={phase !== "solving" || locked.has(id)}
                  className={`rounded-xl border-2 px-4 py-2.5 text-base font-bold transition ${
                    phase === "wrong"
                      ? tokenOf.get(id) === correctSeq[i]
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-rose-500 bg-rose-50"
                      : "border-[#004AAD] bg-blue-50"
                  }`}
                >
                  {tokenOf.get(id)}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap justify-center gap-2.5">
        {bank.map((t) => {
          const used = placed.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => place(t.id)}
              disabled={used || phase !== "solving"}
              className={`rounded-xl border-[1.5px] px-4 py-2.5 text-base font-bold transition active:scale-90 ${
                used ? "border-slate-100 bg-slate-100 text-transparent" : "border-slate-200 bg-white text-slate-900 shadow-sm hover:border-[#004AAD]"
              } ${!used && isPunctuation(t.token) ? "bg-amber-50 border-amber-300" : ""}`}
            >
              {t.token}
            </button>
          );
        })}
      </div>

      {phase === "solving" ? (
        <button type="button" onClick={() => setHintShown((v) => !v)} className="mx-auto mb-1 block text-xs font-bold text-[#004AAD]">
          {hintShown ? "ซ่อนคำใบ้" : "💡 ดูคำใบ้"}
        </button>
      ) : null}
      {hintShown && phase === "solving" ? (
        <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-center">
          <p className="text-sm font-semibold text-amber-900">{lesson.hintTh}</p>
          <p className="mt-1 text-xs text-amber-800/80">{lesson.hintEn}</p>
        </div>
      ) : null}

      {phase !== "solving" ? (
        <div className={`mt-5 rounded-xl border p-4 ${phase === "correct" ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50"}`}>
          <p className={`mb-1.5 text-base font-black ${phase === "correct" ? "text-emerald-700" : "text-rose-700"}`}>
            {phase === "correct" ? "✓ ถูกต้อง!" : "✕ ยังไม่ถูก"}
          </p>
          {phase === "wrong" ? (
            <>
              <p className="mb-2 text-sm text-slate-600">
                เฉลย: <span className="font-black text-slate-900">{lesson.answer}</span>
              </p>
              <p className="mb-3 text-xs font-semibold text-slate-500">คำสีเขียวถูกแล้ว ไม่ต้องแตะใหม่ — แก้เฉพาะคำสีแดงก็พอ</p>
            </>
          ) : null}
          <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
            {phase === "wrong" ? "ทำไมถึงเป็นแบบนี้ · Why" : "กฎที่ได้ฝึก · What you practised"}
          </p>
          {lesson.points.map((p, i) => (
            <div key={i} className="mb-2 rounded-lg border border-slate-200 bg-white p-3">
              <span className="inline-block rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-black text-white">{p.labelEn}</span>
              <p className="mt-1.5 text-xs font-bold text-slate-500">{p.labelTh}</p>
              <p className="mt-1.5 text-sm text-slate-800">{p.en}</p>
              <p className="mt-1 text-sm text-slate-600">{p.th}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        {phase === "solving" ? (
          <button
            type="button"
            disabled={!canCheck}
            onClick={check}
            className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40"
          >
            ตรวจคำตอบ
          </button>
        ) : phase === "correct" ? (
          <button type="button" onClick={next} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
            {index + 1 >= total ? "ดูสรุป →" : "ถัดไป →"}
          </button>
        ) : (
          <div className="space-y-2">
            <button type="button" onClick={tryAgain} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]">
              แก้เฉพาะคำที่ผิด →
            </button>
            <button type="button" onClick={next} className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600">
              {index + 1 >= total ? "ข้าม · ดูสรุป" : "ข้ามข้อนี้ →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
