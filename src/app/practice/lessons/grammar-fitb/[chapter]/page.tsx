import Link from "next/link";
import { GrammarChapterRunner } from "@/components/lessons/GrammarChapterRunner";
import { grammarChapter } from "@/lib/grammar-fitb";

export default async function GrammarChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  if (!grammarChapter(chapter)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">ไม่พบบทเรียนนี้</p>
        <Link href="/practice/lessons/grammar-fitb" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกบท
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-7 sm:px-6">
      <GrammarChapterRunner chapterId={chapter} />
    </main>
  );
}
