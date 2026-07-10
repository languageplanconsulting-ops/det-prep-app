"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { FitbSessionClient } from "@/components/fitb/FitbSessionClient";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import { FITB_ROUND_NUMBERS } from "@/lib/fitb-constants";
import {
  getFitbProgress,
  getFitbVisibleSet,
  hydrateFitbProgressFromServer,
  loadFitbProgressMap,
} from "@/lib/fitb-storage";
import {
  SINGLE_SKILL_DURATION_TO_COUNT,
  UNLIMITED_INITIAL_BATCH,
  resolveDifficulty,
  type RandomDifficulty,
  type RandomDifficultyOrAny,
  type SingleSkillDuration,
} from "@/lib/practice-random";
import type { FitbDifficulty, FitbRoundNum, FitbSet } from "@/types/fitb";

type QueueItem = { key: string; round: FitbRoundNum; difficulty: FitbDifficulty; setNumber: number };
type Candidate = { round: FitbRoundNum; difficulty: RandomDifficulty; setNumber: number; key: string };
type Phase = "picker" | "loading" | "running" | "done";

const DIFFICULTIES: { id: RandomDifficultyOrAny; th: string }[] = [
  { id: "easy", th: "ง่าย" },
  { id: "medium", th: "ปานกลาง" },
  { id: "hard", th: "ยาก" },
  { id: "any", th: "ทุกระดับ" },
];

const DURATIONS: { id: SingleSkillDuration; th: string }[] = [
  { id: 5, th: "5 นาที" },
  { id: 10, th: "10 นาที" },
  { id: 15, th: "15 นาที" },
  { id: 20, th: "20 นาที" },
  { id: "unlimited", th: "ทำจนกว่าจะจบ" },
];

async function fetchSetNumbers(round: number, difficulty: RandomDifficulty): Promise<number[]> {
  const res = await fetch(
    `/api/practice/content/set?skill=fitb&round=${round}&difficulty=${difficulty}&list=1`,
    { credentials: "same-origin" },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { setNumbers?: number[] };
  return json.setNumbers ?? [];
}

async function buildCandidatePool(difficulties: RandomDifficulty[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const round of FITB_ROUND_NUMBERS) {
    for (const difficulty of difficulties) {
      const nums = await fetchSetNumbers(round, difficulty);
      for (const setNumber of nums) {
        out.push({ round, difficulty, setNumber, key: `${round}:${difficulty}:${setNumber}` });
      }
    }
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FitbRandomRunner() {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("picker");
  const [difficulty, setDifficulty] = useState<RandomDifficultyOrAny>("medium");
  const [duration, setDuration] = useState<SingleSkillDuration>(10);
  const [exhausted, setExhausted] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [set, setSet] = useState<FitbSet | null>(null);
  const [completedScores, setCompletedScores] = useState<number[]>([]);

  useEffect(() => {
    void Promise.all([ensureCanonicalPracticeContent(), hydrateFitbProgressFromServer()]).then(() =>
      setReady(true),
    );
  }, []);

  async function pickBatch(count: number, excludeKeys: Set<string>): Promise<QueueItem[]> {
    const difficulties: RandomDifficulty[] =
      difficulty === "any" ? ["easy", "medium", "hard"] : [resolveDifficulty(difficulty)];
    const pool = await buildCandidatePool(difficulties);
    const seen = new Set(Object.keys(loadFitbProgressMap()));
    const unseen = pool.filter((c) => !seen.has(c.key) && !excludeKeys.has(c.key));
    const usePool = unseen.length > 0 ? unseen : pool.filter((c) => !excludeKeys.has(c.key));
    if (unseen.length === 0 && pool.length > 0) setExhausted(true);
    return shuffle(usePool)
      .slice(0, count)
      .map((c) => ({ key: c.key, round: c.round, difficulty: c.difficulty as FitbDifficulty, setNumber: c.setNumber }));
  }

  async function start() {
    setPhase("loading");
    setExhausted(false);
    setCompletedScores([]);
    const count = duration === "unlimited" ? UNLIMITED_INITIAL_BATCH : SINGLE_SKILL_DURATION_TO_COUNT[duration];
    const picked = await pickBatch(count, new Set());
    setQueue(picked);
    setIndex(0);
    if (picked.length === 0) {
      setPhase("done");
      return;
    }
    setSet(getFitbVisibleSet(picked[0]!.round, picked[0]!.difficulty, picked[0]!.setNumber));
    setPhase("running");
  }

  function recordCurrentScore() {
    const item = queue[index];
    if (!item) return;
    const prog = getFitbProgress(item.round, item.difficulty, item.setNumber);
    if (prog) setCompletedScores((prev) => [...prev, prog.maxScore > 0 ? (prog.bestScore / prog.maxScore) * 100 : 0]);
  }

  async function advance() {
    recordCurrentScore();
    const nextIndex = index + 1;
    if (nextIndex < queue.length) {
      setIndex(nextIndex);
      setSet(getFitbVisibleSet(queue[nextIndex]!.round, queue[nextIndex]!.difficulty, queue[nextIndex]!.setNumber));
      return;
    }
    if (duration === "unlimited") {
      const already = new Set(queue.map((q) => q.key));
      const more = await pickBatch(3, already);
      if (more.length === 0) {
        setPhase("done");
        return;
      }
      setQueue((prev) => [...prev, ...more]);
      setIndex(nextIndex);
      setSet(getFitbVisibleSet(more[0]!.round, more[0]!.difficulty, more[0]!.setNumber));
      return;
    }
    setPhase("done");
  }

  function endSession() {
    recordCurrentScore();
    setPhase("done");
  }

  if (!ready) {
    return <LuxuryLoader label="Loading fill-in-the-blank bank…" />;
  }

  if (phase === "picker") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/practice/literacy/fill-in-blank" className="text-sm font-semibold text-[#004AAD] hover:underline">
          ← กลับหน้า Fill in the blank
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 p-5 ring-1 ring-indigo-100">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <div>
              <h3 className="text-sm font-bold text-indigo-950">ทำข้อสอบที่เราเลือกให้ · Fill in the blank</h3>
              <p className="text-[11px] text-indigo-700">
                ผิดตรงไหนพี่ดอยจะอธิบายให้ทันที แล้วต้องทำให้ถูก 100% ก่อนไปข้อถัดไปนะครับ
              </p>
            </div>
          </div>

          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-500">ระดับความยาก</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
                  difficulty === d.id ? "bg-[#004AAD] text-white" : "bg-white/70 text-indigo-700 hover:bg-white"
                }`}
              >
                {d.th}
              </button>
            ))}
          </div>

          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-500">เวลาที่มี</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {DURATIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setDuration(m.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
                  duration === m.id ? "bg-[#004AAD] text-white" : "bg-white/70 text-indigo-700 hover:bg-white"
                }`}
              >
                {m.th}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void start()}
            className="w-full rounded-xl bg-[#004AAD] py-2.5 text-sm font-bold text-[#FFCC00] shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98]"
          >
            🎲 เริ่มทำข้อสอบที่เราเลือกให้
          </button>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return <LuxuryLoader label="กำลังเลือกข้อสอบให้…" />;
  }

  if (phase === "done") {
    const avgPct = completedScores.length
      ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
      : null;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 text-center shadow-[4px_4px_0_0_#000]">
          <p className="text-2xl font-black">ทำข้อสอบที่เราเลือกให้ครบแล้ว! 🎉</p>
          <p className="mt-2 text-sm text-neutral-700">
            ทำไปทั้งหมด {completedScores.length} ชุด
            {avgPct !== null ? <> · เฉลี่ย {avgPct}%</> : null}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/practice/literacy/fill-in-blank"
              className="inline-flex items-center border-4 border-black bg-white px-5 py-3 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] hover:bg-neutral-50"
            >
              กลับหน้า Fill in the blank
            </Link>
            <button
              type="button"
              onClick={() => setPhase("picker")}
              className="inline-flex items-center border-4 border-black bg-ep-blue px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000]"
            >
              เลือกข้อสอบให้อีกรอบ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const item = queue[index];
  if (!set || !item) {
    return <LuxuryLoader label="Loading fill-in-the-blank set…" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="ep-stat text-xs font-bold text-neutral-500">
          ข้อ {index + 1}
          {duration === "unlimited" ? "" : ` / ${queue.length}`}
          {exhausted ? " · ทำครบทุกชุดแล้ว กำลังวนซ้ำ" : ""}
        </p>
        <button
          type="button"
          onClick={endSession}
          className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_0_#000] hover:bg-neutral-50"
        >
          จบเซสชัน
        </button>
      </div>
      <StudySessionBoundary
        skill="literacy"
        exerciseType="fill_in_blank"
        difficulty={item.difficulty}
        setId={`fitb-random-r${item.round}-${item.difficulty}-s${item.setNumber}`}
      >
        <FitbSessionClient
          key={`${set.setId}-${index}`}
          set={set}
          round={item.round}
          difficulty={item.difficulty}
          setNumber={item.setNumber}
          startWithRedeem={false}
          hideRedeemLater
          onAdvance={() => void advance()}
        />
      </StudySessionBoundary>
    </div>
  );
}
