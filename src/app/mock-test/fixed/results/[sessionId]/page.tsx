import { MockFixedResultsClient } from "@/components/mock-test/MockFixedResultsClient";

export default async function MockFixedResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MockFixedResultsClient sessionId={sessionId} />;
}
