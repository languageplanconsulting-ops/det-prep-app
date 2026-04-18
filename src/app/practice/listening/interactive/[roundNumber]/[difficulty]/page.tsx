import { notFound, redirect } from "next/navigation";
import { parseConversationRoundParam } from "@/lib/conversation-constants";

/**
 * Legacy path: `/interactive/{round}/{difficulty}` used to list sets per band.
 * All sets for a round live on the round question bank only.
 */
export default async function InteractiveConversationDifficultyPage({
  params,
}: {
  params: Promise<{ roundNumber: string; difficulty: string }>;
}) {
  const { roundNumber: rRaw } = await params;
  const round = parseConversationRoundParam(rRaw);
  if (round === null) {
    notFound();
  }
  redirect(`/practice/listening/interactive/${round}`);
}
