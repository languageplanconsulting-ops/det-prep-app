import Link from "next/link";
import { VocabRoundSetsPage } from "@/components/vocab/VocabRoundSetsPage";
import type { VocabRoundNum } from "@/types/vocab";

function parseRound(s: string): VocabRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

export default async function VocabRoundPage({ params }: { params: Promise<{ round: string }> }) {
  const { round: r } = await params;
  const round = parseRound(r);
  if (!round) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Round must be 1–5.</p>
        <Link href="/practice/comprehension/vocabulary" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <VocabRoundSetsPage round={round} />
    </main>
  );
}
