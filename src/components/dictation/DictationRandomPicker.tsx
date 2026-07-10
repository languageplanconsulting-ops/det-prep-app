"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DICTATION_ROUND_NUMBERS } from "@/lib/dictation-constants";
import { loadDictationProgressMap } from "@/lib/dictation-storage";
import {
  SINGLE_SKILL_DURATION_TO_COUNT,
  UNLIMITED_INITIAL_BATCH,
  buildPracticeHref,
  resolveDifficulty,
  type RandomDifficulty,
  type RandomDifficultyOrAny,
  type SingleSkillDuration,
} from "@/lib/practice-random";
import type { DictationDifficulty } from "@/types/dictation";

type Candidate = { round: number; difficulty: RandomDifficulty; setNumber: number; key: string };
type QueueItem = { key: string; href: string; round: number; difficulty: RandomDifficulty; setNumber: number };

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
    `/api/practice/content/set?skill=dictation&round=${round}&difficulty=${difficulty}&list=1`,
    { credentials: "same-origin" },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { setNumbers?: number[] };
  return json.setNumbers ?? [];
}

async function buildCandidatePool(difficulties: RandomDifficulty[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const round of DICTATION_ROUND_NUMBERS) {
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

function seenKeysFromProgress(): Set<string> {
  const map = loadDictationProgressMap();
  return new Set(Object.keys(map));
}

export function DictationRandomPicker() {
  const [mounted, setMounted] = useState(false);
  const [difficulty, setDifficulty] = useState<RandomDifficultyOrAny>("medium");
  const [duration, setDuration] = useState<SingleSkillDuration>(10);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  async function pickBatch(count: number, excludeKeys: Set<string>): Promise<QueueItem[]> {
    const difficulties: RandomDifficulty[] =
      difficulty === "any" ? ["easy", "medium", "hard"] : [resolveDifficulty(difficulty)];
    const pool = await buildCandidatePool(difficulties);
    const seen = seenKeysFromProgress();
    const unseen = pool.filter((c) => !seen.has(c.key) && !excludeKeys.has(c.key));
    const usePool = unseen.length > 0 ? unseen : pool.filter((c) => !excludeKeys.has(c.key));
    if (unseen.length === 0 && pool.length > 0) setExhausted(true);
    return shuffle(usePool)
      .slice(0, count)
      .map((c) => ({
        key: c.key,
        href: buildPracticeHref("dictation", c.round, c.difficulty as DictationDifficulty, c.setNumber),
        round: c.round,
        difficulty: c.difficulty,
        setNumber: c.setNumber,
      }));
  }

  async function roll() {
    setLoading(true);
    setExhausted(false);
    setQueue([]);
    try {
      const count = duration === "unlimited" ? UNLIMITED_INITIAL_BATCH : SINGLE_SKILL_DURATION_TO_COUNT[duration];
      const picked = await pickBatch(count, new Set());
      setQueue(picked);
    } finally {
      setLoading(false);
    }
  }

  async function rollMore() {
    setLoading(true);
    try {
      const already = new Set(queue.map((q) => q.key));
      const more = await pickBatch(3, already);
      setQueue((prev) => [...prev, ...more]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 p-5 ring-1 ring-indigo-100 transition-all duration-500 ease-out ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">🎲</span>
        <div>
          <h3 className="text-sm font-bold text-indigo-950">ทำข้อสอบที่เราเลือกให้ · Dictation</h3>
          <p className="text-[11px] text-indigo-700">เลือกระดับ + เวลาที่มี แล้วให้เราเลือกข้อสอบให้</p>
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
        onClick={() => void roll()}
        disabled={loading}
        className="w-full rounded-xl bg-[#004AAD] py-2.5 text-sm font-bold text-[#FFCC00] shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "กำลังเลือกข้อสอบให้…" : "🎲 ทำข้อสอบที่เราเลือกให้เลย"}
      </button>

      {exhausted ? (
        <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-center text-[11px] font-semibold text-indigo-700">
          ทำครบทุกชุดแล้ว — เริ่มวนซ้ำนะครับ
        </p>
      ) : null}

      {queue.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-indigo-100 pt-3">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-500">
            แบบฝึกของคุณวันนี้ ({queue.length} ชุด)
          </p>
          {queue.map((item, i) => (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-slate-800 transition-all duration-150 hover:translate-x-0.5 hover:bg-white hover:shadow-sm"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                {i + 1}
              </span>
              <span>🎧</span>
              <span className="flex-1 truncate">
                Round {item.round} · {item.difficulty} · Set {item.setNumber}
              </span>
              <span className="text-indigo-400">→</span>
            </Link>
          ))}
          {duration === "unlimited" ? (
            <button
              type="button"
              onClick={() => void rollMore()}
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-white/80 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-white disabled:opacity-50"
            >
              {loading ? "กำลังเลือกข้อสอบให้…" : "🎲 อีกชุด"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
