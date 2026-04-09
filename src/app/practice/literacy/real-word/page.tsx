import Link from "next/link";
import { RealWordRoundsHub } from "@/components/realword/RealWordRoundsHub";

export default function RealWordPracticePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/practice"
        className="text-sm font-bold text-ep-blue underline-offset-2 hover:underline"
      >
        ← Back to practice hub
      </Link>
      <RealWordRoundsHub />
    </main>
  );
}
