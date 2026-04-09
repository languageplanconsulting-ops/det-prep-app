import { ReadWriteSession } from "@/components/writing/ReadWriteSession";

export default async function ReadAndWriteSessionPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  return <ReadWriteSession topicId={topicId} />;
}
