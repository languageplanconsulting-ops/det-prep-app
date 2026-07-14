import Link from "next/link";
import { GrammarLevelRunner } from "@/components/lessons/GrammarLevelRunner";

const VALID_LEVELS = ["easy", "medium", "hard"];

export default async function GrammarLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!VALID_LEVELS.includes(level)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">ไม่พบด่านนี้</p>
        <Link href="/practice/lessons/grammar-fitb" className="mt-4 inline-block text-[#004AAD]">
          กลับไปหน้าเดินทาง
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-7 sm:px-6">
      <GrammarLevelRunner level={level} />
    </main>
  );
}
