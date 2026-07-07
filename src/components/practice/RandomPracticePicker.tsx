"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildPracticeHref,
  DURATION_TO_COUNT,
  RANDOM_SKILLS,
  randomRound,
  pickOne,
  type RandomDifficulty,
} from "@/lib/practice-random";

type QueueItem = { key: string; emoji: string; label: string; href: string };

const DIFFICULTIES: { id: RandomDifficulty; th: string }[] = [
  { id: "easy", th: "ง่าย" },
  { id: "medium", th: "ปานกลาง" },
  { id: "hard", th: "ยาก" },
];

const DURATIONS: (5 | 10 | 20 | 30)[] = [5, 10, 20, 30];

async function fetchSetNumbers(
  skillId: string,
  round: number,
  difficulty: RandomDifficulty,
): Promise<number[]> {
  const res = await fetch(
    `/api/practice/content/set?skill=${skillId}&round=${round}&difficulty=${difficulty}&list=1`,
    { credentials: "same-origin" },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { setNumbers?: number[] };
  return json.setNumbers ?? [];
}

async function pickOneSession(
  difficulty: RandomDifficulty,
  usedHrefs: Set<string>,
): Promise<QueueItem | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const skill = pickOne(RANDOM_SKILLS);
    const round = randomRound();
    const setNumbers = await fetchSetNumbers(skill.id, round, difficulty);
    if (setNumbers.length === 0) continue;
    const setNumber = pickOne(setNumbers);
    const href = buildPracticeHref(skill.id, round, difficulty, setNumber);
    if (usedHrefs.has(href)) continue;
    return { key: href, emoji: skill.emoji, label: skill.label, href };
  }
  return null;
}

export function RandomPracticePicker() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"exam" | "lesson">("exam");
  const [difficulty, setDifficulty] = useState<RandomDifficulty>("medium");
  const [duration, setDuration] = useState<5 | 10 | 20 | 30>(10);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  async function roll() {
    setLoading(true);
    setQueue([]);
    try {
      const count = DURATION_TO_COUNT[duration];
      const used = new Set<string>();
      const picked: QueueItem[] = [];
      for (let i = 0; i < count; i++) {
        const item = await pickOneSession(difficulty, used);
        if (!item) continue;
        used.add(item.href);
        picked.push(item);
      }
      setQueue(picked);
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
          <h3 className="text-sm font-bold text-indigo-950">สุ่มแบบฝึกวันนี้</h3>
          <p className="text-[11px] text-indigo-700">เลือกเวลาที่มี แล้วให้เราสุ่มให้</p>
        </div>
      </div>

      <div className="mb-3 flex gap-1.5 rounded-full bg-white/70 p-1">
        <button
          type="button"
          onClick={() => setMode("exam")}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
            mode === "exam" ? "bg-[#004AAD] text-white" : "text-indigo-700 hover:bg-white"
          }`}
        >
          🎯 ข้อสอบจริง
        </button>
        <button
          type="button"
          onClick={() => setMode("lesson")}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
            mode === "lesson" ? "bg-[#004AAD] text-white" : "text-indigo-700 hover:bg-white"
          }`}
        >
          📘 บทเรียน
        </button>
      </div>

      {mode === "lesson" ? (
        <p className="rounded-xl bg-white/70 px-3 py-3 text-center text-xs font-semibold text-indigo-700">
          บทเรียนแบบสุ่มกำลังจะมาเร็ว ๆ นี้ — ตอนนี้ใช้ &quot;ข้อสอบจริง&quot; ไปก่อนนะครับ
        </p>
      ) : (
        <>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-500">
            ระดับความยาก
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
                  difficulty === d.id
                    ? "bg-[#004AAD] text-white"
                    : "bg-white/70 text-indigo-700 hover:bg-white"
                }`}
              >
                {d.th}
              </button>
            ))}
          </div>

          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-500">
            เวลาที่มี
          </p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {DURATIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDuration(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
                  duration === m
                    ? "bg-[#004AAD] text-white"
                    : "bg-white/70 text-indigo-700 hover:bg-white"
                }`}
              >
                {m} นาที
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={roll}
            disabled={loading}
            className="w-full rounded-xl bg-[#004AAD] py-2.5 text-sm font-bold text-[#FFCC00] shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "กำลังสุ่ม…" : "🎲 สุ่มให้เลย"}
          </button>

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
                  <span>{item.emoji}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-indigo-400">→</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
