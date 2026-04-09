import Link from "next/link";
import { DictationDifficultySetsPage } from "@/components/dictation/DictationDifficultySetsPage";
import { DICTATION_DIFFICULTIES } from "@/lib/dictation-constants";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";

function parseRound(s: string): DictationRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

function isDifficulty(s: string): s is DictationDifficulty {
  return (DICTATION_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function DictationDifficultyPage({
  params,
}: {
  params: Promise<{ round: string; difficulty: string }>;
}) {
  const { round: r, difficulty: dRaw } = await params;
  const round = parseRound(r);
  const difficulty = dRaw.toLowerCase();

  if (!round || !isDifficulty(difficulty)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Invalid round or difficulty.</p>
        <Link href="/practice/literacy/dictation" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <DictationDifficultySetsPage round={round} difficulty={difficulty} />
    </main>
  );
}
