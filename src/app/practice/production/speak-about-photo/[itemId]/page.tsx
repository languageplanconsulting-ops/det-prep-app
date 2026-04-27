import { PhotoAssessmentSession } from "@/components/photo-speak/PhotoAssessmentSession";

export default async function SpeakAboutPhotoSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ redeem?: string }>;
}) {
  const { itemId } = await params;
  const sp = await searchParams;
  const startWithRedeem = sp.redeem === "1" || sp.redeem === "true";
  return <PhotoAssessmentSession mode="speak" itemId={itemId} startWithRedeem={startWithRedeem} />;
}
