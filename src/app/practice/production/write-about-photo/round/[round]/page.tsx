import { WriteAboutPhotoRoundGrid } from "@/components/photo-speak/WriteAboutPhotoRoundGrid";

export default async function WriteAboutPhotoRoundPage({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round } = await params;
  return <WriteAboutPhotoRoundGrid roundParam={round} />;
}
