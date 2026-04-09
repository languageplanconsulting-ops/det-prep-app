import Link from "next/link";
import { RealWordSessionGate } from "@/components/realword/RealWordSessionGate";
import { REALWORD_DIFFICULTIES, REALWORD_SET_COUNT } from "@/lib/realword-constants";
import type { RealWordDifficulty, RealWordRoundNum } from "@/types/realword";

function parseRound(s: string): RealWordRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

function isDifficulty(s: string): s is RealWordDifficulty {
  return (REALWORD_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function RealWordRoundSetPage({
  params,
}: {
  params: Promise<{ round: string; difficulty: string; setNumber: string }>;
}) {
  const { round: rRaw, difficulty: dRaw, setNumber: sRaw } = await params;
  const round = parseRound(rRaw);
  const difficulty = dRaw.toLowerCase();
  const setNumber = Number.parseInt(sRaw, 10);

  if (!round || !isDifficulty(difficulty) || !Number.isFinite(setNumber)) {
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

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-8">
      <RealWordSessionGate round={round} difficulty={difficulty} setNumber={setNumber} />
    </main>
  );
}
