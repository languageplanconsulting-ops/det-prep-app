import { SpeakingReportPageClient } from "@/components/speaking/SpeakingReportPageClient";

export default async function SpeakingReportRoutePage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <SpeakingReportPageClient attemptId={attemptId} />;
}
