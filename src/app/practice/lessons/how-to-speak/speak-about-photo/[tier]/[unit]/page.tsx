import Link from "next/link";
import { SpeakPhotoLessonRunner } from "@/components/lessons/SpeakPhotoLessonRunner";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import type { SpeakPhotoTier } from "@/lib/speakphoto-lessons";

function isTier(s: string): s is SpeakPhotoTier {
  return s === "easy" || s === "medium" || s === "advanced";
}

export default async function SpeakPhotoUnitPage({
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
        <Link href="/practice/lessons/how-to-speak/speak-about-photo" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกด่าน
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-7 sm:px-6">
      <StudySessionBoundary
        skill="production"
        exerciseType="lesson_speak_about_photo"
        setId={`${tierRaw}:${unit}`}
      >
        <SpeakPhotoLessonRunner tier={tierRaw} unit={unit} />
      </StudySessionBoundary>
    </main>
  );
}
