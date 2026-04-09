import Link from "next/link";
import { notFound } from "next/navigation";
import { DialogueSummarySessionGate } from "@/components/dialogue-summary/DialogueSummarySessionGate";
import {
  DIALOGUE_SUMMARY_DIFFICULTIES,
  DIALOGUE_SUMMARY_ROUND_NUMBERS,
  DIALOGUE_SUMMARY_SET_COUNT,
} from "@/lib/dialogue-summary-constants";
import type { DialogueSummaryDifficulty, DialogueSummaryRoundNum } from "@/types/dialogue-summary";

function parseRound(s: string): DialogueSummaryRoundNum | undefined {
  const n = Number(s);
  if (DIALOGUE_SUMMARY_ROUND_NUMBERS.includes(n as DialogueSummaryRoundNum)) return n as DialogueSummaryRoundNum;
  return undefined;
}

function isDifficulty(s: string): s is DialogueSummaryDifficulty {
  return (DIALOGUE_SUMMARY_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function DialogueSummarySessionPage({
  params,
}: {
  params: Promise<{ round: string; difficulty: string; setNumber: string }>;
}) {
  const { round: rRaw, difficulty: dRaw, setNumber: sRaw } = await params;
  const round = parseRound(rRaw);
  const difficulty = dRaw.toLowerCase();
  const setNumber = Number.parseInt(sRaw, 10);

  if (!round || !isDifficulty(difficulty) || !Number.isFinite(setNumber)) {
    notFound();
  }

  if (setNumber < 1 || setNumber > DIALOGUE_SUMMARY_SET_COUNT) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Set must be 1–{DIALOGUE_SUMMARY_SET_COUNT}.</p>
        <Link href="/practice/listening/dialogue-summary" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <DialogueSummarySessionGate round={round} difficulty={difficulty} setNumber={setNumber} />
    </main>
  );
}
