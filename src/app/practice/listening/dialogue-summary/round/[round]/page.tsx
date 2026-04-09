import Link from "next/link";
import { notFound } from "next/navigation";
import { DialogueSummaryRoundDifficultyHub } from "@/components/dialogue-summary/DialogueSummaryRoundDifficultyHub";
import { DIALOGUE_SUMMARY_ROUND_NUMBERS } from "@/lib/dialogue-summary-constants";
import type { DialogueSummaryRoundNum } from "@/types/dialogue-summary";

function parseRound(s: string): DialogueSummaryRoundNum | undefined {
  const n = Number(s);
  if (DIALOGUE_SUMMARY_ROUND_NUMBERS.includes(n as DialogueSummaryRoundNum)) return n as DialogueSummaryRoundNum;
  return undefined;
}

export default async function DialogueSummaryRoundPage({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round: raw } = await params;
  const round = parseRound(raw);
  if (!round) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link
        href="/practice/listening/dialogue-summary"
        className="text-sm font-bold text-ep-blue underline-offset-2 hover:underline"
      >
        ← Dialogue summary hub
      </Link>
      <DialogueSummaryRoundDifficultyHub round={round} />
    </main>
  );
}
