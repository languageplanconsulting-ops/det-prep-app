import { WriteAboutPhotoRoundGrid } from "@/components/photo-speak/WriteAboutPhotoRoundGrid";

export default async function WriteAboutPhotoRoundPage({
  params,
}: {
  params: { round: string };
}) {
  const { round } = params;
  return <WriteAboutPhotoRoundGrid roundParam={round} />;
}
