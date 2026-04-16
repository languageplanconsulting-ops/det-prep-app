import { MockFixedSessionClient } from "@/components/mock-test/MockFixedSessionClient";

export default async function MockFixedSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MockFixedSessionClient sessionId={sessionId} />;
}
