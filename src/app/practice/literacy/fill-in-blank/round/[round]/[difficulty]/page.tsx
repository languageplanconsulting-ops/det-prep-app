import Link from "next/link";
import { FitbDifficultySetsPage } from "@/components/fitb/FitbDifficultySetsPage";
import { FITB_DIFFICULTIES } from "@/lib/fitb-constants";
import type { FitbDifficulty, FitbRoundNum } from "@/types/fitb";

function parseRound(s: string): FitbRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

function isDifficulty(s: string): s is FitbDifficulty {
  return (FITB_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function FitbDifficultyPage({
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
        <Link href="/practice/literacy/fill-in-blank" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <FitbDifficultySetsPage round={round} difficulty={difficulty} />
    </main>
  );
}
