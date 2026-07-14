import Link from "next/link";

import { TimedRandomSession } from "@/components/practice/TimedRandomSession";
import { TIMED_SKILL_META, isTimedSkill, type TimedDifficulty } from "@/lib/practice-timed-random";

const VALID_DURATIONS = [5, 10, 15, 20, 30];

function parseDifficulty(v: string | undefined): TimedDifficulty {
  return v === "easy" || v === "medium" || v === "hard" ? v : "any";
}

export default async function TimedRandomPage({
  params,
  searchParams,
}: {
  params: Promise<{ skill: string }>;
  searchParams: Promise<{ d?: string; diff?: string }>;
}) {
  const { skill } = await params;
  const { d, diff } = await searchParams;

  if (!isTimedSkill(skill)) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-2xl">😕</p>
        <p className="mt-2 font-bold text-neutral-700">ไม่พบโหมดฝึกนี้</p>
        <Link href="/practice" className="mt-4 inline-block text-sm font-bold text-ep-blue hover:underline">
          ← กลับหน้าฝึก
        </Link>
      </main>
    );
  }

  const durationMin = VALID_DURATIONS.includes(Number(d)) ? Number(d) : 10;
  const difficulty = parseDifficulty(diff);
  const hubHref = TIMED_SKILL_META[skill].hubHref;

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl">
      <TimedRandomSession
        skill={skill}
        difficulty={difficulty}
        durationMin={durationMin}
        hubHref={hubHref}
      />
    </main>
  );
}
