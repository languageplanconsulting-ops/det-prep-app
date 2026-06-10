import { DialogueSummaryRoundsHub } from "@/components/dialogue-summary/DialogueSummaryRoundsHub";
import { AdminExamGuide } from "@/components/practice/GuideRevampContent";

export default function DialogueSummaryHubPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <AdminExamGuide exam="dialogue-summary" />
      <DialogueSummaryRoundsHub />
    </main>
  );
}
