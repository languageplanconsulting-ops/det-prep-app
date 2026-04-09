import { ReadSpeakRoundTopicsPage } from "@/components/speaking/ReadSpeakRoundTopicsPage";

export default async function ReadAndSpeakRoundPage({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round } = await params;
  return <ReadSpeakRoundTopicsPage round={Number(round)} />;
}
