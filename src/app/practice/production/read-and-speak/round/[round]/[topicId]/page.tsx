import { ReadSpeakSession } from "@/components/speaking/ReadSpeakSession";
import { isSpeakingRound } from "@/lib/speaking-constants";
import { notFound } from "next/navigation";

export default async function ReadAndSpeakRoundTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ round: string; topicId: string }>;
  searchParams: Promise<{ redeem?: string; questionId?: string }>;
}) {
  const { round: roundStr, topicId } = await params;
  const sp = await searchParams;
  const round = Number(roundStr);
  if (!isSpeakingRound(round)) notFound();
  const startWithRedeem = sp.redeem === "1" || sp.redeem === "true";
  const redeemQuestionId = typeof sp.questionId === "string" && sp.questionId.trim() ? sp.questionId : null;
  return (
    <ReadSpeakSession
      topicId={topicId}
      round={round}
      startWithRedeem={startWithRedeem}
      redeemQuestionId={redeemQuestionId}
    />
  );
}
