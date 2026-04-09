import { ReadSpeakSession } from "@/components/speaking/ReadSpeakSession";
import { isSpeakingRound } from "@/lib/speaking-constants";
import { notFound } from "next/navigation";

export default async function ReadAndSpeakRoundTopicPage({
  params,
}: {
  params: Promise<{ round: string; topicId: string }>;
}) {
  const { round: roundStr, topicId } = await params;
  const round = Number(roundStr);
  if (!isSpeakingRound(round)) notFound();
  return <ReadSpeakSession topicId={topicId} round={round} />;
}
