import { MockTestSessionClient } from "@/components/mock-test/MockTestSessionClient";

export default async function MockTestSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MockTestSessionClient sessionId={sessionId} />;
}
