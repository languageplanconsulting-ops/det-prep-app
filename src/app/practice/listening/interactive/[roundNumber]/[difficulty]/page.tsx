import { notFound } from "next/navigation";
import { ConversationSetList } from "@/components/conversation/ConversationSetList";
import {
  CONVERSATION_DIFFICULTIES,
  parseConversationRoundParam,
} from "@/lib/conversation-constants";
import type { ConversationDifficulty } from "@/types/conversation";

function isDifficulty(s: string): s is ConversationDifficulty {
  return (CONVERSATION_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function InteractiveConversationDifficultyPage({
  params,
}: {
  params: Promise<{ roundNumber: string; difficulty: string }>;
}) {
  const { roundNumber: rRaw, difficulty: dRaw } = await params;
  const round = parseConversationRoundParam(rRaw);
  const difficulty = dRaw.toLowerCase();
  if (round === null || !isDifficulty(difficulty)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ConversationSetList round={round} difficulty={difficulty} />
    </main>
  );
}
