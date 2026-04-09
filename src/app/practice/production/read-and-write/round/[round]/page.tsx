import { ReadWriteRoundTopicsPage } from "@/components/writing/ReadWriteRoundTopicsPage";

export default async function ReadAndWriteRoundPage({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round } = await params;
  return <ReadWriteRoundTopicsPage round={Number(round)} />;
}
