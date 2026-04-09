import { notFound } from "next/navigation";
import { VocabSetPassageList } from "@/components/vocab/VocabSetPassageList";
import { parseSetNumberParam, parseVocabSessionParam } from "@/lib/vocab-constants";
import type { VocabRoundNum } from "@/types/vocab";

function parseRound(s: string): VocabRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

export default async function VocabPassageListPage({
  params,
}: {
  params: Promise<{ round: string; setNumber: string; sessionLevel: string }>;
}) {
  const { round: r, setNumber: sn, sessionLevel: sl } = await params;
  const round = parseRound(r);
  const setNumber = parseSetNumberParam(sn);
  const sessionLevel = parseVocabSessionParam(sl);
  if (!round || setNumber === null || !sessionLevel) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <VocabSetPassageList round={round} sessionLevel={sessionLevel} setNumber={setNumber} />
    </main>
  );
}
