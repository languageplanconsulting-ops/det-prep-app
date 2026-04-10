import { PhotoAssessmentSession } from "@/components/photo-speak/PhotoAssessmentSession";

export default async function WriteAboutPhotoPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.itemId;
  const itemId = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  return <PhotoAssessmentSession mode="write" itemId={itemId} />;
}
