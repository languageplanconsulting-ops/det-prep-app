import { MockFixedResultsLoadingClient } from "@/components/mock-test/MockFixedResultsLoadingClient";

export default async function MockFixedResultsLoadingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MockFixedResultsLoadingClient sessionId={sessionId} />;
}
