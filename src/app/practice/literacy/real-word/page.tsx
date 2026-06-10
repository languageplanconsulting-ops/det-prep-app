import { RealWordRoundsHub } from "@/components/realword/RealWordRoundsHub";
import { AdminExamGuide } from "@/components/practice/GuideRevampContent";

export default function RealWordPracticePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <AdminExamGuide exam="real-word" />
      <RealWordRoundsHub />
    </main>
  );
}
