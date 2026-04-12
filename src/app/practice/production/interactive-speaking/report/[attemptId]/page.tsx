import { InteractiveSpeakingReportPageClient } from "@/components/interactive-speaking/InteractiveSpeakingReportPageClient";

export default async function InteractiveSpeakingReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <InteractiveSpeakingReportPageClient attemptId={attemptId} />;
}
