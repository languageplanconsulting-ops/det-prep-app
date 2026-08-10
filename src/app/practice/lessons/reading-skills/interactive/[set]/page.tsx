import Link from "next/link";
import { InteractiveReadingRunner } from "@/components/reading/InteractiveReadingRunner";
import { irSetById } from "@/lib/interactive-reading";

export default async function InteractiveReadingSetPage({ params }: { params: Promise<{ set: string }> }) {
  const { set: id } = await params;
  const set = irSetById(id);
  if (!set) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">ไม่พบชุดนี้</p>
        <Link href="/practice/lessons/reading-skills" className="mt-4 inline-block text-[#004AAD]">
          กลับไปเลือกชุด
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6">
      <InteractiveReadingRunner sets={[set]} />
    </main>
  );
}
