import { MockTestProcessingClient } from "@/components/mock-test/MockTestProcessingClient";

export default async function MockTestProcessingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MockTestProcessingClient sessionId={sessionId} />;
}
