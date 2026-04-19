"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONVERSATION_FULL_SCORE,
  CONVERSATION_ROUND_COUNT,
  CONVERSATION_DIFFICULTIES,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";
import { filterConversationExamsForPractice } from "@/lib/conversation-practice-filter";
import {
  conversationMaxForExam,
  getConversationProgress,
  getConversationRoundStats,
  loadConversationBank,
} from "@/lib/conversation-storage";

function isComplete(
  prog: ReturnType<typeof getConversationProgress>,
  maxScore: number,
): boolean {
  if (!prog) return false;
  if (Math.round(prog.bestScore) >= maxScore) return true;
  const ok = prog.lastItemOk;
  return !!ok && ok.length === CONVERSATION_TOTAL_STEPS && ok.every(Boolean);
}

function roundCompletionCount(round: number): { done: number; total: number } {
  const bank = loadConversationBank();
  let total = 0;
  let done = 0;
  for (const d of CONVERSATION_DIFFICULTIES) {
    const exams = filterConversationExamsForPractice(bank[round]?.[d]);
    for (const exam of exams) {
      total++;
      const maxScore = conversationMaxForExam(exam);
      const prog = getConversationProgress(round, d, exam.setNumber);
      if (isComplete(prog, maxScore)) done++;
    }
  }
  return { done, total };
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "No data";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "No data";
  }
}

export function ConversationHub() {
  const [bankVersion, setBankVersion] = useState(0);

  useEffect(() => {
    const bump = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", bump);
    window.addEventListener("ep-conversation-storage", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener("ep-conversation-storage", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  return (
    <div
      className="space-y-10"
      style={{
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, 'Anuphan', sans-serif",
      }}
    >
      <Link
        href="/practice"
        className="font-mono text-xs font-black text-[#004aad] hover:underline"
      >
        ← BACK TO PRACTICE HUB / กลับหน้าหลัก
      </Link>

      <header
        className="relative overflow-hidden border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#111] md:p-8"
        style={{
          backgroundImage: "radial-gradient(#111 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          backgroundColor: "#f3f4f6",
        }}
      >
        <div className="absolute right-0 top-0 border-b-4 border-l-4 border-black bg-[#004aad] px-4 py-1 font-mono text-[10px] text-white">
          LISTENING · INTERACTIVE CONVERSATION
        </div>

        <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter md:text-5xl">
          บทสนทนาโต้ตอบ <br />
          <span className="not-italic text-[#004aad]">Interactive Conversation</span>
        </h1>

        <div className="mt-6 grid gap-6 border-t-4 border-black pt-6 md:grid-cols-2 md:items-center">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase text-gray-400">
              วิธีฝึกทักษะการฟังโต้ตอบ:
            </p>
            <ul className="space-y-2 text-sm font-bold">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">1</span>
                <span>ฟังสถานการณ์ (Scenario) เพื่อทำความเข้าใจบริบท</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">2</span>
                <span>ฟังคำพูดและเลือกประโยคตอบโต้ที่เหมาะสมที่สุด</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">3</span>
                <span>เขียนสรุปใจความสำคัญจากบทสนทนาทั้งหมด</span>
              </li>
            </ul>
          </div>
          <div className="border-2 border-dashed border-black bg-gray-50 p-4">
            <p className="mb-2 text-[11px] font-bold italic leading-tight text-gray-500">
              &quot;Test your ability to follow academic dialogue. Each set uses scenario listening with realistic TTS. Score improves your Conversation &amp; Listening sub-scores.&quot;
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="border-2 border-black bg-[#ffcc00] px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase">
                Graded /160
              </span>
              <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase">
                Academic Context
              </span>
            </div>
          </div>
        </div>
      </header>

      <RoundGrid key={bankVersion} />

      <footer className="relative border-4 border-black bg-black p-5 text-white shadow-[8px_8px_0_0_#111]">
        <div className="absolute -top-3 left-4 border-2 border-black bg-[#ffcc00] px-2 py-0.5 text-[10px] font-black text-black">
          PRO TIP
        </div>
        <p className="mt-1 text-xs font-bold italic leading-tight">
          หัวใจสำคัญของ Interactive Listening คือ <span className="text-[#ffcc00]">Scenario Memory</span> —
          ต้องจำให้ได้ว่าตอนเริ่มเรื่องคุยกันที่ไหนและใครคุยกับใคร จะช่วยให้เลือกคำตอบได้แม่นยำ 100%!
        </p>
      </footer>
    </div>
  );
}

function RoundGrid() {
  const bank = loadConversationBank();

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: CONVERSATION_ROUND_COUNT }, (_, i) => i + 1).map((round) => {
        const { done, total } = roundCompletionCount(round);
        const easyN = filterConversationExamsForPractice(bank[round]?.easy).length;
        const medN = filterConversationExamsForPractice(bank[round]?.medium).length;
        const setCount = easyN + medN;
        const href = `/practice/listening/interactive/${round}`;
        const stats = getConversationRoundStats(round);
        const progressPercent = total > 0 ? Math.max(5, Math.round((done / total) * 100)) : 0;
        const hasSets = setCount > 0;
        const avgLabel = stats.avgPercent != null ? `${stats.avgPercent}%` : "—";
        const statusLabel = hasSets ? (done > 0 ? "In progress" : "Open") : "Empty";

        const cardBody = (
          <>
            <div className="mb-4 flex items-start justify-between">
              <span
                className={`border-2 border-black px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase ${
                  hasSets ? "bg-white text-black" : "border-gray-200 bg-gray-100 text-gray-400"
                }`}
              >
                {statusLabel}
              </span>
              <span className={`font-mono text-[10px] font-black ${hasSets ? "opacity-40" : "opacity-20"}`}>
                BANK 0{round}
              </span>
            </div>

            <h3 className={`mb-1 text-3xl font-black uppercase italic ${hasSets ? "" : "opacity-30"}`}>
              Round {round}
            </h3>

            {hasSets ? (
              <p className="mb-4 text-[11px] font-black leading-tight">
                {setCount} ชุดในคลังข้อสอบ <br />
                <span className="text-[#004aad]">({setCount} SET{setCount === 1 ? "" : "S"} IN BANK)</span>
              </p>
            ) : (
              <p className="mb-4 text-[11px] font-bold italic opacity-30">
                ยังไม่มีชุดข้อสอบในรอบนี้ <br />
                (No sets yet)
              </p>
            )}

            {hasSets ? (
              <div className="mt-auto space-y-4">
                <div>
                  <div className="mb-1 flex justify-between font-mono text-[9px] font-black uppercase">
                    <span>Progress</span>
                    <span>
                      {done}/{total}
                    </span>
                  </div>
                  <div className="h-2 border-2 border-black bg-[#eee]">
                    <div className="h-full bg-[#004aad]" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="border-2 border-black bg-white p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-black uppercase opacity-50">Avg score</span>
                    <span className="text-sm font-black text-[#004aad]">{avgLabel}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-[9px] font-black uppercase opacity-50">Latest</span>
                    <span className="text-[10px] font-bold">{formatShortDate(stats.latestAttemptDate)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-2 border-black bg-white p-2">
                  <span className="font-mono text-[9px] font-black uppercase opacity-50">Full score</span>
                  <span className="font-black">{CONVERSATION_FULL_SCORE} pts</span>
                </div>
              </div>
            ) : (
              <div className="mt-auto">
                <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-2 text-center">
                  <span className="font-mono text-[9px] font-black uppercase text-gray-300">
                    Coming Soon
                  </span>
                </div>
              </div>
            )}
          </>
        );

        if (!hasSets) {
          return (
            <div key={round} className="flex h-full flex-col border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111]">
              {cardBody}
            </div>
          );
        }

        return (
          <Link
            key={round}
            href={href}
            className="flex h-full flex-col border-4 border-black bg-[#ffcc00] p-5 shadow-[8px_8px_0_0_#111] transition duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#111]"
          >
            {cardBody}
          </Link>
        );
      })}
    </div>
  );
}
