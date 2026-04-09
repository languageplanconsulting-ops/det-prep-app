import { notFound } from "next/navigation";
import { VocabSessionGate } from "@/components/vocab/VocabSessionGate";
import {
  parsePassageNumberParam,
  parseSetNumberParam,
  parseVocabSessionParam,
} from "@/lib/vocab-constants";
import type { VocabRoundNum } from "@/types/vocab";

function parseRound(s: string): VocabRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

export default async function VocabExamPage({
  params,
}: {
  params: Promise<{
    round: string;
    setNumber: string;
    sessionLevel: string;
    passageNumber: string;
  }>;
}) {
  const { round: r, setNumber: sn, sessionLevel: sl, passageNumber: pn } = await params;
  const round = parseRound(r);
  const setNumber = parseSetNumberParam(sn);
  const sessionLevel = parseVocabSessionParam(sl);
  const passageNumber = parsePassageNumberParam(pn);
  if (!round || setNumber === null || !sessionLevel || passageNumber === null) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <VocabSessionGate
        round={round}
        sessionLevel={sessionLevel}
        setNumber={setNumber}
        passageNumber={passageNumber}
      />
    </main>
  );
}
