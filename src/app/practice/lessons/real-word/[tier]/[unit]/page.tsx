import Link from "next/link";
import { RealWordLessonRunner } from "@/components/lessons/RealWordLessonRunner";
import type { RealWordTier } from "@/lib/realword-lesson";

function isTier(s: string): s is RealWordTier {
  return s === "easy" || s === "medium" || s === "advanced";
}

export default async function RealWordLessonUnitPage({
  params,
}: {
  params: Promise<{ tier: string; unit: string }>;
}) {
  const { tier: tierRaw, unit: unitRaw } = await params;
  const unit = Number(unitRaw);

  if (!isTier(tierRaw) || !Number.isInteger(unit) || unit < 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">ด่านไม่ถูกต้อง</p>
        <Link href="/practice/lessons/real-word" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกด่าน
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-7 sm:px-6">
      <RealWordLessonRunner tier={tierRaw} unit={unit} />
    </main>
  );
}
