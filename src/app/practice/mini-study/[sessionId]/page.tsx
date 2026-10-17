import { notFound, redirect } from "next/navigation";
import { MiniStudySessionClient } from "@/components/mini-study/MiniStudySessionClient";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { getMiniStudySession } from "@/lib/mini-study/content";
import { canUseMiniStudy } from "@/lib/mini-study/access";

export default async function MiniStudySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = getMiniStudySession(sessionId);
  if (!session) notFound();
  if (!(await canUseMiniStudy())) redirect("/pricing");
  return (
    <StudySessionBoundary skill="comprehension" exerciseType="mini_study" setId={sessionId}>
      <MiniStudySessionClient session={session} />
    </StudySessionBoundary>
  );
}
