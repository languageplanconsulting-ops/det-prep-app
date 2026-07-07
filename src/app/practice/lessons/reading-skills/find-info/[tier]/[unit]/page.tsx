import Link from "next/link";
import { FindInfoLessonRunner } from "@/components/lessons/FindInfoLessonRunner";
import type { FindInfoTier } from "@/lib/find-info-lessons";

function isTier(s: string): s is FindInfoTier {
  return s === "easy" || s === "medium" || s === "advanced";
}

export default async function FindInfoUnitPage({
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
        <Link href="/practice/lessons/reading-skills/find-info" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกด่าน
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-7 sm:px-6">
      <FindInfoLessonRunner tier={tierRaw} unit={unit} />
    </main>
  );
}
