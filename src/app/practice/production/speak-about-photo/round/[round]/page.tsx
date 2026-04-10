import { SpeakAboutPhotoRoundGrid } from "@/components/photo-speak/SpeakAboutPhotoRoundGrid";

export default async function SpeakAboutPhotoRoundPage({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round } = await params;
  return <SpeakAboutPhotoRoundGrid roundParam={round} />;
}
