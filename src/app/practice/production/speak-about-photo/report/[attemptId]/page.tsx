import { PhotoSpeakReportPageClient } from "@/components/photo-speak/PhotoSpeakReportPageClient";

export default async function PhotoSpeakReportRoutePage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <PhotoSpeakReportPageClient attemptId={attemptId} />;
}
