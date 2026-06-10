import { SpeakAboutPhotoSetList } from "@/components/photo-speak/SpeakAboutPhotoSetList";
import { AdminExamGuide } from "@/components/practice/GuideRevampContent";

export default function SpeakAboutPhotoPage() {
  return (
    <>
      <AdminExamGuide exam="speak-about-photo" />
      <SpeakAboutPhotoSetList />
    </>
  );
}
