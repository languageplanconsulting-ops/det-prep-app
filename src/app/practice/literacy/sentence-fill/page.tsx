import { SentenceFillHub } from "@/components/sentence-fitb/SentenceFillHub";
import { sfitbExams } from "@/lib/sentence-fitb";

export default function SentenceFillPage() {
  const exams = sfitbExams().map((e) => ({ exam: e.exam, levels: e.items.map((i) => i.level) }));
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <SentenceFillHub round={1} exams={exams} />
    </main>
  );
}
