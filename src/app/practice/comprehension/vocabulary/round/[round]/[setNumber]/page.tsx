import { notFound } from "next/navigation";
import { VocabSetLevelPicker } from "@/components/vocab/VocabSetLevelPicker";
import { parseSetNumberParam } from "@/lib/vocab-constants";
import type { VocabRoundNum } from "@/types/vocab";

function parseRound(s: string): VocabRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

export default async function VocabSetLevelsPage({
  params,
}: {
  params: Promise<{ round: string; setNumber: string }>;
}) {
  const { round: r, setNumber: sn } = await params;
  const round = parseRound(r);
  const setNumber = parseSetNumberParam(sn);
  if (!round || setNumber === null) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <VocabSetLevelPicker round={round} setNumber={setNumber} />
    </main>
  );
}
