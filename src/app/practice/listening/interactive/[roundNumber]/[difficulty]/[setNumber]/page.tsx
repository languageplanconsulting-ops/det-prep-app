import { redirect } from "next/navigation";
import { ConversationSessionGate } from "@/components/conversation/ConversationSessionGate";
import { CONVERSATION_DIFFICULTIES, parseConversationRoundParam } from "@/lib/conversation-constants";
import type { ConversationDifficulty } from "@/types/conversation";

function isDifficulty(s: string): s is ConversationDifficulty {
  return (CONVERSATION_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function InteractiveConversationSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ roundNumber: string; difficulty: string; setNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { roundNumber: rRaw, difficulty: dRaw, setNumber: sRaw } = await params;
  const sp = await searchParams;
  const redeemRaw = sp.redeem;
  const redeem = redeemRaw === "1" || redeemRaw === "true";

  const round = parseConversationRoundParam(rRaw);
  const difficulty = dRaw.toLowerCase();
  const setNumber = Number.parseInt(sRaw, 10);

  if (round === null || !Number.isFinite(setNumber)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Invalid URL.</p>
      </main>
    );
  }

  if (difficulty === "hard") {
    redirect(`/practice/listening/interactive/${round}`);
  }

  if (!isDifficulty(difficulty)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Invalid URL.</p>
      </main>
    );
  }

  if (!Number.isInteger(setNumber) || setNumber < 1) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Set must be a positive whole number.</p>
      </main>
    );
  }

  return (
    <main className="ep-page-shell mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-8">
      <ConversationSessionGate
        round={round}
        difficulty={difficulty}
        setNumber={setNumber}
        startWithRedeem={redeem}
      />
    </main>
  );
}
