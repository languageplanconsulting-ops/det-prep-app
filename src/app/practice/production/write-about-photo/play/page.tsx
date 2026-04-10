import { WriteAboutPhotoSession } from "@/components/photo-speak/WriteAboutPhotoSession";

export default async function WriteAboutPhotoPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.itemId;
  const itemId = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  return <WriteAboutPhotoSession itemId={itemId} />;
}
