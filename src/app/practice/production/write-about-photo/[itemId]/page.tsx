import { PhotoAssessmentSession } from "@/components/photo-speak/PhotoAssessmentSession";

export default async function WriteAboutPhotoSessionPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  return <PhotoAssessmentSession mode="write" itemId={itemId} />;
}
