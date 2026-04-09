import Link from "next/link";
import { DialogueSummaryRoundsHub } from "@/components/dialogue-summary/DialogueSummaryRoundsHub";

export default function DialogueSummaryHubPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link
        href="/practice"
        className="text-sm font-bold text-ep-blue underline-offset-2 hover:underline"
      >
        ← Back to practice hub
      </Link>
      <DialogueSummaryRoundsHub />
    </main>
  );
}
