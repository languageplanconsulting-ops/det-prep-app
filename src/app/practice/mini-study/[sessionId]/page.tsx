import { notFound } from "next/navigation";
import { MiniStudySessionClient } from "@/components/mini-study/MiniStudySessionClient";
import { getMiniStudySession } from "@/lib/mini-study/content";

export default async function MiniStudySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = getMiniStudySession(sessionId);
  if (!session) notFound();
  return <MiniStudySessionClient session={session} />;
}
