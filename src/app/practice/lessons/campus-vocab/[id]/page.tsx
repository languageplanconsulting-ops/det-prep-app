import Link from "next/link";
import { CampusVocabLessonRunner } from "@/components/lessons/CampusVocabLessonRunner";
import { campusVocabScenario } from "@/lib/campus-vocab";

export default async function CampusVocabScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!campusVocabScenario(id)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">ไม่พบสถานการณ์นี้</p>
        <Link href="/practice/lessons/campus-vocab" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกเรื่อง
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-7 sm:px-6">
      <CampusVocabLessonRunner scenarioId={id} />
    </main>
  );
}
