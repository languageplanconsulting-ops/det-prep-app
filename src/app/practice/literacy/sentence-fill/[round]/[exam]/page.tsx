import Link from "next/link";
import { SentenceFillRunner } from "@/components/sentence-fitb/SentenceFillRunner";
import { sfitbExam } from "@/lib/sentence-fitb";

export default async function SentenceFillExamPage({
  params,
}: {
  params: Promise<{ round: string; exam: string }>;
}) {
  const { round, exam } = await params;
  const data = sfitbExam(Number(round), Number(exam));
  if (!data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">ไม่พบชุดข้อสอบนี้</p>
        <Link href="/practice/literacy/sentence-fill" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกชุด
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <SentenceFillRunner key={data.id} exam={data} />
    </main>
  );
}
