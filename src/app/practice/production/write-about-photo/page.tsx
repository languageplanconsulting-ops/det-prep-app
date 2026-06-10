import { WriteAboutPhotoSetList } from "@/components/photo-speak/WriteAboutPhotoSetList";
import { AdminExamGuide } from "@/components/practice/GuideRevampContent";

export default function WriteAboutPhotoPage() {
  return (
    <>
      <AdminExamGuide exam="write-about-photo" />
      <WriteAboutPhotoSetList />
    </>
  );
}
