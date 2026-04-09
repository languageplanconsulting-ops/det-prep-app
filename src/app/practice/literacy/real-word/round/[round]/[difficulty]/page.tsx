import Link from "next/link";
import { RealWordDifficultySetsPage } from "@/components/realword/RealWordDifficultySetsPage";
import { REALWORD_DIFFICULTIES } from "@/lib/realword-constants";
import type { RealWordDifficulty, RealWordRoundNum } from "@/types/realword";

function parseRound(s: string): RealWordRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

function isDifficulty(s: string): s is RealWordDifficulty {
  return (REALWORD_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function RealWordRoundDifficultyPage({
  params,
}: {
  params: Promise<{ round: string; difficulty: string }>;
}) {
  const { round: rRaw, difficulty: dRaw } = await params;
  const round = parseRound(rRaw);
  const difficulty = dRaw.toLowerCase();

  if (!round || !isDifficulty(difficulty)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Invalid round or difficulty.</p>
        <Link href="/practice/literacy/real-word" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <RealWordDifficultySetsPage round={round} difficulty={difficulty} />
    </main>
  );
}
