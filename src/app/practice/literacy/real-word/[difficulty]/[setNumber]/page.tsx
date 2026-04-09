import { redirect } from "next/navigation";
import { REALWORD_DIFFICULTIES, REALWORD_SET_COUNT } from "@/lib/realword-constants";
import type { RealWordDifficulty } from "@/types/realword";

function isDifficulty(s: string): s is RealWordDifficulty {
  return (REALWORD_DIFFICULTIES as readonly string[]).includes(s);
}

/** Legacy URL: redirects to round 1 (canonical path includes round). */
export default async function RealWordSetPageLegacy({
  params,
}: {
  params: Promise<{ difficulty: string; setNumber: string }>;
}) {
  const { difficulty: dRaw, setNumber: sRaw } = await params;
  const difficulty = dRaw.toLowerCase();
  const setNumber = Number.parseInt(sRaw, 10);

  if (!isDifficulty(difficulty) || !Number.isFinite(setNumber)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Invalid URL.</p>
      </main>
    );
  }

  if (setNumber < 1 || setNumber > REALWORD_SET_COUNT) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Set must be 1–{REALWORD_SET_COUNT}.</p>
      </main>
    );
  }

  redirect(`/practice/literacy/real-word/round/1/${difficulty}/${setNumber}`);
}
