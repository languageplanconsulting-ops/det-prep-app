import { WritingReportPageClient } from "@/components/writing/WritingReportPageClient";

export default async function WritingReportRoutePage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <WritingReportPageClient attemptId={attemptId} />;
}
