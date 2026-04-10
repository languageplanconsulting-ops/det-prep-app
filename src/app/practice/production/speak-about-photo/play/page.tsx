import { PhotoSpeakSession } from "@/components/photo-speak/PhotoSpeakSession";

export default async function SpeakAboutPhotoPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.itemId;
  const itemId = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  return <PhotoSpeakSession itemId={itemId} />;
}
