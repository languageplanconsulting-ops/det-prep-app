"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { mt } from "@/lib/mock-test/mock-test-styles";

const TOTAL_MS = 10 * 60 * 1000;

const TIPS = [
  {
    en: "For Write About Photo, always cover 3 things: what is happening, where it is happening, and why it might be happening.",
    th: "Write About Photo ให้ครอบคลุม 3 อย่าง: เกิดอะไรขึ้น ที่ไหน และทำไม",
  },
  {
    en: "For Essay Writing, use Introduction → Point 1 + example → Point 2 + example → Conclusion.",
    th: "Essay ใช้ บทนำ → หัวข้อ 1 + ตัวอย่าง → หัวข้อ 2 + ตัวอย่าง → บทสรุป",
  },
  {
    en: "For Read Then Speak, read silently first — then read aloud at a natural pace.",
    th: "Read Then Speak อ่านเงียบๆ ก่อน แล้วค่อยอ่านออกเสียงในจังหวะธรรมชาติ",
  },
  {
    en: "For Summarize Conversation, focus on the main topic and the conclusion.",
    th: "Summarize เน้นหัวข้อหลักและบทสรุปของบทสนทนา",
  },
  {
    en: "For Speak About Photo, use present continuous: 'A woman is walking...'",
    th: "Speak About Photo ใช้ present continuous อธิบายสิ่งที่เห็น",
  },
  {
    en: "For Fill in the Blanks, read the full sentence before choosing.",
    th: "Fill in the Blanks อ่านทั้งประโยคก่อนเลือกคำ",
  },
  {
    en: "For Interactive Listening, listen for the main idea — not every word.",
    th: "Interactive Listening ฟังใจความหลัก ไม่ต้องจดทุกคำ",
  },
];

export function MockTestProcessingClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    void fetch(`/api/mock-test/process/${sessionId}`, { method: "POST", credentials: "same-origin" });
  }, [sessionId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed((e) => e + 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (elapsed >= TOTAL_MS) {
      router.push(`/mock-test/results/${sessionId}`);
    }
  }, [elapsed, router, sessionId]);

  const cardIndex = elapsed >= 540000 ? 6 : Math.min(5, Math.floor(elapsed / 90000));
  const tip = TIPS[sessionId.charCodeAt(0) % TIPS.length]!;

  const progress = Math.min(1, elapsed / TOTAL_MS);

  const checklist = useMemo(
    () => [
      "Vocabulary range / ช่วงคำศัพท์",
      "Grammar accuracy / ความถูกต้องของไวยากรณ์",
      "Pronunciation fluency / ความคล่องในการออกเสียง",
      "Reading comprehension / ความเข้าใจในการอ่าน",
      "Listening accuracy / ความแม่นยำในการฟัง",
      "Writing coherence / ความสอดคล้องในการเขียน",
      "Speaking clarity / ความชัดเจนในการพูด",
      "Response relevance / ความเกี่ยวข้องของคำตอบ",
      "Vocabulary + reading integration / การอ่านเชื่อมศัพท์",
      "Conversation & summary / บทสนทนาและการสรุป",
    ],
    [],
  );

  const tickCount = Math.min(checklist.length, Math.floor(elapsed / 3000) + 1);

  return (
    <div className="min-h-screen bg-[#004AAD] px-4 py-10 text-[#FFCC00]">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-3 w-full overflow-hidden border-4 border-black bg-black/20">
          <div
            className="h-full bg-[#FFCC00] transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div
          className="min-h-[320px] rounded-[4px] border-4 border-black bg-white p-6 text-neutral-900 shadow-[4px_4px_0_0_#000] transition-opacity duration-500"
        >
          {cardIndex === 0 && (
            <Card1 checklist={checklist} tickCount={tickCount} />
          )}
          {cardIndex === 1 && <Card2 />}
          {cardIndex === 2 && <Card3 />}
          {cardIndex === 3 && <Card4 />}
          {cardIndex === 4 && <Card5 />}
          {cardIndex === 5 && <Card6 tip={tip} />}
          {cardIndex === 6 && <Card7 />}
        </div>

        <p className="text-center text-xs font-mono text-[#FFCC00]/80">
          {Math.floor(elapsed / 1000)}s / 600s
        </p>
      </div>
    </div>
  );
}

function Card1({
  checklist,
  tickCount,
}: {
  checklist: string[];
  tickCount: number;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-[#004AAD]">
        Analyzing your English ability across 10 dimensions…
      </h2>
      <p className="text-sm font-bold text-neutral-700">
        วิเคราะห์ความสามารถภาษาอังกฤษของคุณใน 10 มิติ…
      </p>
      <p className="text-xs text-neutral-500">
        Your results will be ready in 10 minutes / ผลลัพธ์ของคุณจะพร้อมใน 10 นาที
      </p>
      <ul className="space-y-2 text-sm font-mono">
        {checklist.map((c, i) => (
          <li key={c} className={i < tickCount ? "text-green-700" : "text-neutral-400"}>
            {i < tickCount ? "✓ " : "○ "}
            {c}
          </li>
        ))}
        <li className="text-[#004AAD]">⟳ Generating your score… / กำลังสร้างคะแนนของคุณ…</li>
      </ul>
    </div>
  );
}

function Card2() {
  return (
    <div className="space-y-3 text-sm">
      <h2 className="text-lg font-black text-[#004AAD]">
        Your responses are being matched against our curated DET database
      </h2>
      <p className="font-bold text-neutral-700">
        คำตอบของคุณกำลังถูกเปรียบเทียบกับฐานข้อมูล DET ที่คัดสรรมาของเรา
      </p>
      <div className="grid gap-2 font-mono text-xs">
        <div className="border-4 border-black p-2">📊 4 ปีของข้อมูล DET</div>
        <div className="border-4 border-black p-2">📝 5,000+ graded responses</div>
        <div className="border-4 border-black p-2">🎯 Calibrated against real DET scores</div>
      </div>
      <p className="text-xs text-neutral-600">
        The platform trusted by 400+ Thai DET students / แพลตฟอร์มที่นักเรียน DET ชาวไทยกว่า 400 คนไว้วางใจ
      </p>
    </div>
  );
}

function Card3() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-[#004AAD]">Did you know? / คุณรู้หรือไม่?</h2>
      <p className="text-sm text-neutral-800">
        Most Thai students score between 70–95 on their first DET attempt.
      </p>
      <p className="text-sm text-neutral-600">
        นักเรียนไทยส่วนใหญ่ได้คะแนน 70–95 ในครั้งแรก
      </p>
    </div>
  );
}

function Card4() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-[#004AAD]">
        Students who train consistently on EnglishPlan…
      </h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className={`${mt.border} p-2 text-center text-xs font-mono font-bold`}>
          +18 points avg
        </div>
        <div className={`${mt.border} p-2 text-center text-xs font-mono font-bold`}>
          Many reach target
        </div>
        <div className={`${mt.border} p-2 text-center text-xs font-mono font-bold`}>
          ~60 days to goal
        </div>
      </div>
    </div>
  );
}

function Card5() {
  return (
    <div className="space-y-2 text-sm">
      <h2 className="text-lg font-black text-[#004AAD]">
        What&apos;s included in your EnglishPlan package
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-neutral-800">
        <li>Adaptive AI scoring</li>
        <li>240+ practice questions</li>
        <li>Personal notebook</li>
        <li>Score tracking</li>
      </ul>
      <p className="text-xs text-neutral-600">
        This score report would cost ฿2,000+ at a test prep center.
      </p>
    </div>
  );
}

function Card6({ tip }: { tip: { en: string; th: string } }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-[#004AAD]">
        A tip to boost your score / เคล็ดลับเพิ่มคะแนน
      </h2>
      <p className="text-sm text-neutral-800">{tip.en}</p>
      <p className="text-sm text-neutral-600">{tip.th}</p>
    </div>
  );
}

function Card7() {
  return (
    <div className="space-y-3 text-center">
      <h2 className="text-xl font-black text-[#004AAD]">Almost ready… / เกือบเสร็จแล้ว…</h2>
      <p className="text-sm text-neutral-700">
        Your personalized DET score report is being finalized.
      </p>
      <div className="mx-auto h-3 max-w-xs overflow-hidden border-4 border-black bg-neutral-200">
        <div className="h-full w-[95%] animate-pulse bg-[#FFCC00]" />
      </div>
    </div>
  );
}
