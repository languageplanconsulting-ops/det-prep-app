import Link from "next/link";
import { notFound } from "next/navigation";
import { DialogueSummaryDifficultySetsPage } from "@/components/dialogue-summary/DialogueSummaryDifficultySetsPage";
import { DIALOGUE_SUMMARY_DIFFICULTIES, DIALOGUE_SUMMARY_ROUND_NUMBERS } from "@/lib/dialogue-summary-constants";
import type { DialogueSummaryDifficulty, DialogueSummaryRoundNum } from "@/types/dialogue-summary";

function parseRound(s: string): DialogueSummaryRoundNum | undefined {
  const n = Number(s);
  if (DIALOGUE_SUMMARY_ROUND_NUMBERS.includes(n as DialogueSummaryRoundNum)) return n as DialogueSummaryRoundNum;
  return undefined;
}

function isDifficulty(s: string): s is DialogueSummaryDifficulty {
  return (DIALOGUE_SUMMARY_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function DialogueSummaryDifficultyPage({
  params,
}: {
  params: Promise<{ round: string; difficulty: string }>;
}) {
  const { round: rRaw, difficulty: dRaw } = await params;
  const round = parseRound(rRaw);
  const difficulty = dRaw.toLowerCase();

  if (!round || !isDifficulty(difficulty)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href={`/practice/listening/dialogue-summary/round/${round}`}
        className="text-sm font-bold text-ep-blue underline-offset-2 hover:underline"
      >
        ← Round {round}
      </Link>
      <DialogueSummaryDifficultySetsPage round={round} difficulty={difficulty} />
    </main>
  );
}
