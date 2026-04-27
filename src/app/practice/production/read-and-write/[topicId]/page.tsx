import { ReadWriteSession } from "@/components/writing/ReadWriteSession";

export default async function ReadAndWriteSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ redeem?: string }>;
}) {
  const { topicId } = await params;
  const sp = await searchParams;
  const startWithRedeem = sp.redeem === "1" || sp.redeem === "true";
  return <ReadWriteSession topicId={topicId} startWithRedeem={startWithRedeem} />;
}
