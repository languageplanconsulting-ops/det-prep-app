import { PhotoAssessmentSession } from "@/components/photo-speak/PhotoAssessmentSession";

export default async function WriteAboutPhotoSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ redeem?: string }>;
}) {
  const { itemId } = await params;
  const sp = await searchParams;
  const startWithRedeem = sp.redeem === "1" || sp.redeem === "true";
  return <PhotoAssessmentSession mode="write" itemId={itemId} startWithRedeem={startWithRedeem} />;
}
