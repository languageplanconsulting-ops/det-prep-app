import { MockTestResultsClient } from "@/components/mock-test/MockTestResultsClient";

export default async function MockTestResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MockTestResultsClient sessionId={sessionId} />;
}
