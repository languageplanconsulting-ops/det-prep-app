import Link from "next/link";
import { DictationRoundDifficultyHub } from "@/components/dictation/DictationRoundDifficultyHub";
import type { DictationRoundNum } from "@/types/dictation";

function parseRound(s: string): DictationRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

export default async function DictationRoundPage({ params }: { params: Promise<{ round: string }> }) {
  const { round: r } = await params;
  const round = parseRound(r);
  if (!round) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Round must be 1–5.</p>
        <Link href="/practice/literacy/dictation" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <DictationRoundDifficultyHub round={round} />
    </main>
  );
}
