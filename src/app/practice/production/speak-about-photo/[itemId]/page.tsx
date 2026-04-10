import { PhotoAssessmentSession } from "@/components/photo-speak/PhotoAssessmentSession";

export default async function SpeakAboutPhotoSessionPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  return <PhotoAssessmentSession mode="speak" itemId={itemId} />;
}
