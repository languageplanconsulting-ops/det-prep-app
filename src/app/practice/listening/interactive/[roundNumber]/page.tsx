import { notFound } from "next/navigation";
import { ConversationRoundLevelPicker } from "@/components/conversation/ConversationRoundLevelPicker";
import { parseConversationRoundParam } from "@/lib/conversation-constants";

export default async function InteractiveConversationRoundPage({
  params,
}: {
  params: Promise<{ roundNumber: string }>;
}) {
  const { roundNumber: raw } = await params;
  const round = parseConversationRoundParam(raw);
  if (round === null) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <ConversationRoundLevelPicker round={round} />
    </main>
  );
}
