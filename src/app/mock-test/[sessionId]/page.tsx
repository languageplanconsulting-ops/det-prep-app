import { MockTestSessionRouter } from "@/components/mock-test/MockTestSessionRouter";

export default async function MockTestSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MockTestSessionRouter sessionId={sessionId} />;
}
