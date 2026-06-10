import { ReadSpeakRoundsHub } from "@/components/speaking/ReadSpeakRoundsHub";
import { AdminExamGuide } from "@/components/practice/GuideRevampContent";

export default function ReadAndSpeakTopicsPage() {
  return (
    <>
      <AdminExamGuide exam="read-and-speak" />
      <ReadSpeakRoundsHub />
    </>
  );
}
