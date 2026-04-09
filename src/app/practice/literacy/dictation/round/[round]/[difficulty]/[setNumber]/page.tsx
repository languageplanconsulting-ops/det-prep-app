import { DictationSessionGate } from "@/components/dictation/DictationSessionGate";
import { DICTATION_DIFFICULTIES, DICTATION_SET_COUNT } from "@/lib/dictation-constants";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";

function parseRound(s: string): DictationRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

function isDifficulty(s: string): s is DictationDifficulty {
  return (DICTATION_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function DictationSessionPage({
  params,
}: {
  params: Promise<{ round: string; difficulty: string; setNumber: string }>;
}) {
  const { round: r, difficulty: dRaw, setNumber: sRaw } = await params;

  const round = parseRound(r);
  const difficulty = dRaw.toLowerCase();
  const setNumber = Number.parseInt(sRaw, 10);

  if (!round || !isDifficulty(difficulty) || !Number.isFinite(setNumber)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Invalid URL.</p>
      </main>
    );
  }

  if (setNumber < 1 || setNumber > DICTATION_SET_COUNT) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Set must be 1–{DICTATION_SET_COUNT}.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-8">
      <DictationSessionGate round={round} difficulty={difficulty} setNumber={setNumber} />
    </main>
  );
}
