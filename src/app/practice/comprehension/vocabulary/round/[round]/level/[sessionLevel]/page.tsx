import Link from "next/link";
import { VocabDifficultyQuestionsPage } from "@/components/vocab/VocabDifficultyQuestionsPage";
import { parseVocabSessionParam } from "@/lib/vocab-constants";
import type { VocabRoundNum } from "@/types/vocab";

function parseRound(s: string): VocabRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

export default async function VocabRoundDifficultyPage({
  params,
}: {
  params: Promise<{ round: string; sessionLevel: string }>;
}) {
  const { round: r, sessionLevel: sl } = await params;
  const round = parseRound(r);
  const sessionLevel = parseVocabSessionParam(sl);
  if (!round || !sessionLevel) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Invalid round or difficulty.</p>
        <Link href="/practice/comprehension/vocabulary" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <VocabDifficultyQuestionsPage round={round} sessionLevel={sessionLevel} />
    </main>
  );
}

