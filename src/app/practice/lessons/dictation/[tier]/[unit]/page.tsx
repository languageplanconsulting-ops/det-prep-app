import Link from "next/link";
import { DictationLessonRunner } from "@/components/lessons/DictationLessonRunner";
import type { DictationTier } from "@/lib/dictation-lessons";

function isTier(s: string): s is DictationTier {
  return s === "easy" || s === "medium" || s === "advanced";
}

export default async function DictationLessonUnitPage({
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
        <Link href="/practice/lessons/dictation" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกด่าน
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-7 sm:px-6">
      <DictationLessonRunner tier={tierRaw} unit={unit} />
    </main>
  );
}
