"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { mt } from "@/lib/mock-test/mock-test-styles";

const TEN_MINUTES_SEC = 10 * 60;
const SLIDE_MS = 3500;

type LoadingLine = {
  phase: string;
  en: string;
  th: string;
};

const LOADING_LINES: LoadingLine[] = [
  { phase: "Phase 1", en: "Analyzing your grammar accuracy patterns...", th: "กำลังวิเคราะห์รูปแบบความแม่นยำทางไวยากรณ์ของคุณ..." },
  { phase: "Phase 1", en: "Evaluating your vocabulary range and flexibility...", th: "กำลังประเมินช่วงและความยืดหยุ่นของคำศัพท์ของคุณ..." },
  { phase: "Phase 1", en: "Measuring your sentence complexity and structure...", th: "กำลังวัดความซับซ้อนและโครงสร้างประโยคของคุณ..." },
  { phase: "Phase 1", en: "Reviewing your speaking coherence and fluency...", th: "กำลังตรวจสอบความต่อเนื่องและความคล่องในการพูด..." },
  { phase: "Phase 1", en: "Detecting patterns in your common mistakes...", th: "กำลังตรวจจับรูปแบบข้อผิดพลาดที่พบบ่อยของคุณ..." },
  { phase: "Phase 1", en: "Mapping your strengths and weaknesses...", th: "กำลังวิเคราะห์จุดแข็งและจุดอ่อนของคุณ..." },
  { phase: "Phase 2", en: "Using performance data collected over 4 years at English Plan...", th: "ใช้ข้อมูลผลการเรียนที่สะสมมากกว่า 4 ปีจาก English Plan..." },
  { phase: "Phase 2", en: "Comparing your performance with thousands of learners in Thailand...", th: "กำลังเปรียบเทียบผลของคุณกับผู้เรียนหลายพันคนในประเทศไทย..." },
  { phase: "Phase 2", en: "Applying our internal scoring model based on real student data...", th: "ใช้โมเดลการให้คะแนนภายในที่อิงจากข้อมูลนักเรียนจริง..." },
  { phase: "Phase 2", en: "Calibrating your estimated score using historical trends...", th: "กำลังปรับคะแนนโดยอ้างอิงแนวโน้มข้อมูลในอดีต..." },
  { phase: "Phase 2", en: "Matching your responses to real exam difficulty levels...", th: "กำลังจับคู่คำตอบของคุณกับระดับความยากของข้อสอบจริง..." },
  { phase: "Phase 3", en: "Personalizing your score based on your unique performance profile...", th: "ปรับคะแนนให้เหมาะกับรูปแบบการทำข้อสอบเฉพาะตัวของคุณ..." },
  { phase: "Phase 3", en: "Creating a personalized feedback report for you...", th: "กำลังสร้างรายงานวิเคราะห์เฉพาะสำหรับคุณ..." },
  { phase: "Phase 3", en: "Identifying areas that can boost your score fastest...", th: "กำลังหาจุดที่สามารถเพิ่มคะแนนของคุณได้เร็วที่สุด..." },
  { phase: "Phase 3", en: "Tailoring insights specifically for learners in Thailand...", th: "ปรับคำแนะนำให้เหมาะกับผู้เรียนในประเทศไทยโดยเฉพาะ..." },
  { phase: "Phase 4", en: "Tip: Vocabulary variety can significantly impact your score.", th: "เคล็ดลับ: ความหลากหลายของคำศัพท์ส่งผลต่อคะแนนอย่างมาก" },
  { phase: "Phase 4", en: "Tip: Short, clear sentences are often better than long, unclear ones.", th: "เคล็ดลับ: ประโยคสั้นและชัดเจนมักดีกว่าประโยคยาวที่ไม่ชัด" },
  { phase: "Phase 4", en: "Did you know? The test adapts its difficulty based on your answers.", th: "รู้หรือไม่? ข้อสอบจะปรับความยากตามคำตอบของคุณ" },
  { phase: "Phase 4", en: "Tip: Fluency is more important than perfection in speaking tasks.", th: "เคล็ดลับ: ความคล่องสำคัญกว่าความสมบูรณ์แบบในการพูด" },
  { phase: "Phase 4", en: "Did you know? Clarity matters more than occasional strong answers.", th: "รู้หรือไม่? ความเคลียร์เวลาเขียนหรือพูดสำคัญกว่าการตอบดีเป็นบางข้อ" },
  { phase: "Phase 5", en: "Running multi-factor scoring across grammar, vocab, and coherence...", th: "กำลังประมวลผลคะแนนหลายปัจจัย เช่น ไวยากรณ์ คำศัพท์ และความต่อเนื่อง..." },
  { phase: "Phase 5", en: "Cross-checking your responses with internal benchmarks...", th: "กำลังตรวจสอบคำตอบของคุณกับเกณฑ์มาตรฐานภายใน..." },
  { phase: "Phase 5", en: "Simulating adaptive scoring similar to real test conditions...", th: "จำลองระบบการให้คะแนนแบบปรับระดับเหมือนข้อสอบจริง..." },
  { phase: "Phase 6", en: "This is an estimated score, not an official test result.", th: "นี่เป็นคะแนนประมาณการ ไม่ใช่ผลสอบจริง" },
  { phase: "Phase 6", en: "The real exam does not publicly disclose its exact scoring formula.", th: "ข้อสอบจริงไม่ได้เปิดเผยสูตรการให้คะแนนอย่างละเอียด" },
  { phase: "Phase 6", en: "Your actual score may vary depending on test conditions.", th: "คะแนนจริงของคุณอาจแตกต่างขึ้นอยู่กับสภาพการสอบ" },
  { phase: "Phase 6", en: "This report is designed to guide your preparation effectively.", th: "รายงานนี้ออกแบบมาเพื่อช่วยให้คุณเตรียมตัวได้อย่างมีประสิทธิภาพ" },
  { phase: "Phase 7", en: "Finalizing your personalized performance report...", th: "กำลังสรุปรายงานผลเฉพาะของคุณ..." },
  { phase: "Phase 7", en: "Almost ready. Preparing your final score...", th: "ใกล้เสร็จแล้ว กำลังเตรียมคะแนนของคุณ..." },
  { phase: "Phase 7", en: "Your results are ready. Let's see how you did.", th: "ผลลัพธ์ของคุณพร้อมแล้ว ไปดูกันเลย" },
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fmt(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

export function MockFixedResultsLoadingClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(TEN_MINUTES_SEC);
  const [lineIndex, setLineIndex] = useState(0);
  const [adminPreviewMode, setAdminPreviewMode] = useState(false);
  const [reportReadyEarly, setReportReadyEarly] = useState(false);

  const storageKey = useMemo(() => `mock-fixed-report-countdown:${sessionId}`, [sessionId]);
  const current = LOADING_LINES[lineIndex] ?? LOADING_LINES[0]!;
  const processingPct = Math.round((remaining / TEN_MINUTES_SEC) * 100);

  useEffect(() => {
    const now = Date.now();
    const existing = window.localStorage.getItem(storageKey);
    const startedAt = existing ? Number(existing) : now;
    if (!existing) window.localStorage.setItem(storageKey, String(now));

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = Math.max(0, TEN_MINUTES_SEC - elapsed);
      setRemaining(next);
      if (next <= 0) {
        window.localStorage.removeItem(storageKey);
        router.replace(`/mock-test/fixed/results/${sessionId}`);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [router, sessionId, storageKey]);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/mock-test/fixed/results/${sessionId}/status`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const json = (await res.json()) as { ready?: boolean; adminPreviewMode?: boolean };
        if (!mounted || !res.ok) return;
        if (json.adminPreviewMode === true) setAdminPreviewMode(true);
        if (json.ready === true) {
          if (json.adminPreviewMode === true && remaining > 0) {
            setReportReadyEarly(true);
          } else {
            window.localStorage.removeItem(storageKey);
            router.replace(`/mock-test/fixed/results/${sessionId}`);
          }
        }
      } catch {
        // ignore polling errors on loading screen
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 5000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [remaining, router, sessionId, storageKey]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % LOADING_LINES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center px-4 py-10">
      <section className={`${mt.border} ${mt.shadow} ${mt.gridBg} w-full rounded-[4px] bg-[#fffdf2] p-6 sm:p-8`}>
        <p className="text-xs font-black uppercase tracking-wide text-[#004AAD]">
          Mock Report Processing
        </p>
        <h1 className="mt-2 text-2xl font-black text-neutral-900 sm:text-3xl">
          ระบบกำลังคำนวณผลสอบและสร้างรายงาน
        </h1>
        <p className="mt-2 text-sm font-bold text-neutral-700">
          The system is calculating your score and preparing your report.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-5 text-center text-[#FFCC00]">
            <p className="text-xs font-bold uppercase tracking-wide">Countdown</p>
            <p className="mt-1 text-5xl font-black tabular-nums">{fmt(remaining)}</p>
            <p className="mt-2 text-xs font-bold text-[#FFCC00]/90">Approximate processing window</p>
          </div>
          <div className="rounded-[4px] border-4 border-black bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#004AAD]">What to do now</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700">
              <li>Keep this page open while we prepare your report.</li>
              <li>You do not need to click anything while the system is working.</li>
              <li>Your final screen will open automatically when it is ready.</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[4px] border-2 border-black bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">
            {current.phase} - Sliding analysis
          </p>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-neutral-500">
            <span>Live processing update</span>
            <span>{processingPct}% time remaining</span>
          </div>
          <div
            key={lineIndex}
            className="mt-2 animate-[fadein_300ms_ease-out] space-y-1"
          >
            <p className="text-sm font-bold text-neutral-900">{current.en}</p>
            <p className="text-sm text-neutral-700">{current.th}</p>
          </div>
          <div className="mt-3 h-1.5 w-full rounded bg-neutral-200">
            <div
              className="h-full rounded bg-[#004AAD] transition-all duration-300"
              style={{ width: `${((lineIndex + 1) / LOADING_LINES.length) * 100}%` }}
            />
          </div>
        </div>
        {adminPreviewMode && reportReadyEarly ? (
          <div className="mt-4 rounded-[4px] border-4 border-black bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-900">
              Admin preview: report is ready before 10 minutes.
            </p>
            <button
              type="button"
              onClick={() => router.replace(`/mock-test/fixed/results/${sessionId}`)}
              className="mt-2 rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#000]"
            >
              View report now
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
