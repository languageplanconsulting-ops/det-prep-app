import { notFound } from "next/navigation";
import { ReadingSetExamList } from "@/components/reading/ReadingSetExamList";
import { READING_DIFFICULTIES, parseDifficultyParam } from "@/lib/reading-constants";
import type { ReadingRoundNum } from "@/types/reading";

function parseRound(s: string): ReadingRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

export default async function ReadingSetPickerPage({
  params,
}: {
  params: Promise<{ round: string; difficulty: string; setNumber: string }>;
}) {
  const { round: r, difficulty: d, setNumber: sn } = await params;
  const round = parseRound(r);
  const difficulty = parseDifficultyParam(d);
  const setNumber = Number.parseInt(sn, 10);
  if (!round || !difficulty || !Number.isInteger(setNumber) || setNumber < 1) {
    notFound();
  }
  if (!(READING_DIFFICULTIES as readonly string[]).includes(difficulty)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <ReadingSetExamList round={round} difficulty={difficulty} setNumber={setNumber} />
    </main>
  );
}
