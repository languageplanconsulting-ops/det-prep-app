import Link from "next/link";
import { MissingParagraphLessonRunner } from "@/components/lessons/MissingParagraphLessonRunner";
import type { MissingParagraphTier } from "@/lib/missing-paragraph-lessons";

function isTier(s: string): s is MissingParagraphTier {
  return s === "easy" || s === "medium" || s === "advanced";
}

export default async function MissingParagraphUnitPage({
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
        <Link href="/practice/lessons/reading-skills/missing-paragraph" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกด่าน
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-7 sm:px-6">
      <MissingParagraphLessonRunner tier={tierRaw} unit={unit} />
    </main>
  );
}
