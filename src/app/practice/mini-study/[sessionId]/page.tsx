import { notFound } from "next/navigation";
import { MiniStudySessionClient } from "@/components/mini-study/MiniStudySessionClient";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { getMiniStudySession } from "@/lib/mini-study/content";

export default async function MiniStudySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = getMiniStudySession(sessionId);
  if (!session) notFound();
  return (
    <StudySessionBoundary skill="comprehension" exerciseType="mini_study" setId={sessionId}>
      <MiniStudySessionClient session={session} />
    </StudySessionBoundary>
  );
}
