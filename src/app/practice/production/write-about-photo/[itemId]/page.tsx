import { WriteAboutPhotoSession } from "@/components/photo-speak/WriteAboutPhotoSession";

export default async function WriteAboutPhotoSessionPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  return <WriteAboutPhotoSession itemId={itemId} />;
}
