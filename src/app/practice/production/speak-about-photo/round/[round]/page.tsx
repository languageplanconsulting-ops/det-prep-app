import { SpeakAboutPhotoRoundGrid } from "@/components/photo-speak/SpeakAboutPhotoRoundGrid";

export default async function SpeakAboutPhotoRoundPage({
  params,
}: {
  params: { round: string };
}) {
  const { round } = params;
  return <SpeakAboutPhotoRoundGrid roundParam={round} />;
}
