import { PhotoSpeakSession } from "@/components/photo-speak/PhotoSpeakSession";

export default async function SpeakAboutPhotoSessionPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  return <PhotoSpeakSession itemId={itemId} />;
}
