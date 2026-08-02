"use client";

/**
 * Daily lecture-day warm-up: two DET fill-in-the-blank sets shuffled from the
 * practice bank (one per rung from fillBlankWarmup), run inline before the
 * session checklist. Previously the CTA only flipped a flag and never loaded
 * questions — this is the missing runner.
 */
import { useEffect, useState } from "react";

import { FitbSessionClient } from "@/components/fitb/FitbSessionClient";
import { FITB_ROUND_NUMBERS } from "@/lib/fitb-constants";
import {
  getFitbVisibleSet,
  hydrateFitbProgressFromServer,
  loadFitbProgressMap,
  loadFitbVisibleBank,
} from "@/lib/fitb-storage";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import type { RungLevel } from "@/lib/course-plan/rungs";
import type { FitbDifficulty, FitbRoundNum, FitbSet } from "@/types/fitb";

type QueueItem = {
  key: string;
  round: FitbRoundNum;
  difficulty: FitbDifficulty;
  setNumber: number;
};

type Candidate = QueueItem;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function poolFromLocal(difficulty: FitbDifficulty): Candidate[] {
  const bank = loadFitbVisibleBank();
  const out: Candidate[] = [];
  for (const round of FITB_ROUND_NUMBERS) {
    for (const s of bank[round][difficulty]) {
      out.push({
        key: `${round}:${difficulty}:${s.setNumber}`,
        round,
        difficulty,
        setNumber: s.setNumber,
      });
    }
  }
  return out;
}

async function fetchSetNumbers(round: number, difficulty: FitbDifficulty): Promise<number[]> {
  const res = await fetch(
    `/api/practice/content/set?skill=fitb&round=${round}&difficulty=${difficulty}&list=1`,
    { credentials: "same-origin" },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { setNumbers?: number[] };
  return json.setNumbers ?? [];
}

async function poolForDifficulty(difficulty: FitbDifficulty): Promise<Candidate[]> {
  const local = poolFromLocal(difficulty);
  if (local.length > 0) return local;

  // Logged-in sessions can list from the published snapshot when local cache is empty.
  const out: Candidate[] = [];
  for (const round of FITB_ROUND_NUMBERS) {
    const nums = await fetchSetNumbers(round, difficulty);
    for (const setNumber of nums) {
      out.push({
        key: `${round}:${difficulty}:${setNumber}`,
        round,
        difficulty,
        setNumber,
      });
    }
  }
  return out;
}

/**
 * One random set per requested level. Prefer sets the learner has never
 * finished (same progress map as /practice FITB random). Only reuse completed
 * sets when that level's pool is exhausted.
 */
async function pickWarmupQueue(levels: RungLevel[]): Promise<QueueItem[]> {
  const completed = new Set(Object.keys(loadFitbProgressMap()));
  const used = new Set<string>();
  const queue: QueueItem[] = [];

  for (const level of levels) {
    const difficulty = level as FitbDifficulty;
    const pool = await poolForDifficulty(difficulty);
    const fresh = shuffle(
      pool.filter((c) => !completed.has(c.key) && !used.has(c.key)),
    );
    const reuse = shuffle(pool.filter((c) => !used.has(c.key)));
    const pick = fresh[0] ?? reuse[0];
    if (pick) {
      used.add(pick.key);
      queue.push(pick);
    }
  }
  return queue;
}

async function loadSet(item: QueueItem): Promise<FitbSet | null> {
  const local = getFitbVisibleSet(item.round, item.difficulty, item.setNumber);
  if (local) return local;

  const res = await fetch(
    `/api/practice/content/set?skill=fitb&round=${item.round}&difficulty=${item.difficulty}&set=${item.setNumber}`,
    { credentials: "same-origin" },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { set?: FitbSet };
  return json.set ?? null;
}

export function WarmupFitbRunner({
  levels,
  onDone,
  onSkip,
}: {
  levels: RungLevel[];
  onDone: () => void;
  onSkip: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [set, setSet] = useState<FitbSet | null>(null);
  const levelKey = levels.join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([ensureCanonicalPracticeContent(), hydrateFitbProgressFromServer()]);
        const picked = await pickWarmupQueue(levels);
        if (cancelled) return;
        if (picked.length === 0) {
          setStatus("empty");
          return;
        }
        const first = picked[0]!;
        const loaded = await loadSet(first);
        if (cancelled) return;
        setQueue(picked);
        setIndex(0);
        setSet(loaded);
        setStatus(loaded ? "ready" : "empty");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // levels is derived from track; levelKey avoids re-shuffle on parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by levelKey
  }, [levelKey]);

  async function advance() {
    const next = index + 1;
    if (next >= queue.length) {
      onDone();
      return;
    }
    const item = queue[next]!;
    const loaded = await loadSet(item);
    setIndex(next);
    setSet(loaded);
    if (!loaded) onDone();
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <p className="text-sm font-bold text-slate-500">กำลังสุ่มข้อเติมคำจากคลัง…</p>
      </div>
    );
  }

  if (status === "empty" || status === "error" || !set || !queue[index]) {
    return (
      <div className="space-y-3 p-6">
        <p className="rounded-xl bg-amber-50 p-4 text-[13px] font-bold text-amber-900 ring-1 ring-amber-200">
          {status === "error"
            ? "โหลดคลังเติมคำไม่สำเร็จ"
            : "ยังไม่มีข้อเติมคำในคลังสำหรับระดับอุ่นเครื่องนี้ — ลองเปิดหน้า Fill in the blank ก่อนเพื่อซิงก์คลัง หรือล็อกอินด้วยบัญชีจริง"}
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-full bg-slate-900 py-3 text-sm font-black text-white"
        >
          ข้ามไปเรียนเลย
        </button>
      </div>
    );
  }

  const item = queue[index]!;

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-violet-600">
          อุ่นเครื่อง · ข้อ {index + 1}/{queue.length} · ระดับ
          {item.difficulty === "easy" ? "ง่าย" : item.difficulty === "medium" ? "กลาง" : "ยาก"}
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-3 py-1 text-[11px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ข้าม
        </button>
      </div>
      <FitbSessionClient
        key={item.key}
        set={set}
        round={item.round}
        difficulty={item.difficulty}
        setNumber={item.setNumber}
        startWithRedeem={false}
        hideRedeemLater
        onComplete={() => {
          /* score saved inside FitbSessionClient; advance via report CTA */
        }}
        onAdvance={() => {
          void advance();
        }}
      />
    </div>
  );
}
