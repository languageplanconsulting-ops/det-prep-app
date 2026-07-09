"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { FixedMockScoredRow } from "@/lib/mock-test/fixed-mock-score-buckets";

import { MockFixedReportBrandedViewV2 } from "./MockFixedReportBrandedViewV2";

type FixedStepItem = {
  step_index: number;
  task_type: string;
  content?: Record<string, unknown> | null;
  correct_answer?: Record<string, unknown> | null;
};

type FixedResult = {
  target_total: number;
  target_listening: number;
  target_speaking: number;
  target_reading: number;
  target_writing: number;
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  deltas: Record<string, number>;
  created_at?: string;
  /** When set, this report is pinned on `/mock-test/start`. */
  dashboard_saved_at?: string | null;
  report_payload?: {
    responses?: FixedMockScoredRow[];
  };
};

function avg(list: number[]): number {
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

/** Detailed, technique-level Thai coaching copy per fixed-mock task type — พี่ดอย's voice. */
const TASK_ADVICE_TH: Record<string, { emoji: string; label: string; tip: string }> = {
  fill_in_blanks: {
    emoji: "📝",
    label: "เติมคำในช่องว่าง",
    tip: "ส่วนใหญ่พลาดเพราะไวยากรณ์ ไม่ใช่คำศัพท์ — เช็กรูปกริยา (-ed, -s, -ing), การใช้ comma, และคำเชื่อมประโยคให้ดี อ่านทั้งประโยคก่อนเดาคำเสมอ อย่าตัดสินจากคำใกล้เคียงตัวเดียว",
  },
  dictation: {
    emoji: "🎧",
    label: "ฟังแล้วพิมพ์ตาม (Dictation)",
    tip: "เก็บคะแนนง่ายที่สุดถ้าระวัง 3 จุด: การเติม -ed/-es ท้ายคำกริยา, ตำแหน่ง comma ตรงจังหวะที่ผู้พูดหยุด, และคำที่ออกเสียงคล้ายกันแต่สะกดต่างกัน (there/their, its/it's)",
  },
  real_english_word: {
    emoji: "🔤",
    label: "แยกคำจริง/คำปลอม",
    tip: "อาศัยคลังคำศัพท์ที่คุ้นตาเป็นหลัก ยิ่งเจอคำหลากหลายมากเท่าไหร่ ยิ่งแยกคำปลอมได้ไวขึ้น ฝึกอ่านคำศัพท์ใหม่ ๆ ทุกวัน แม้เป็นคำที่ไม่คุ้น จะช่วยให้สายตาจับความผิดปกติของคำปลอมได้เร็วขึ้น",
  },
  vocabulary_reading: {
    emoji: "📖",
    label: "คำศัพท์ + การอ่าน",
    tip: "ฝึกแยก main idea (ใจความหลัก) ออกจาก specific idea (รายละเอียดย่อย) ในแต่ละย่อหน้าให้ได้ก่อน แล้วค่อยโฟกัสคำศัพท์ที่ไม่รู้จัก คำศัพท์อังกฤษมีมากกว่า 100,000 คำ เก็บทีละนิดทุกวันจะส่งผลบวกกับทุกทักษะ ไม่ใช่แค่ส่วนนี้",
  },
  write_about_photo: {
    emoji: "📸",
    label: "เขียนบรรยายภาพ",
    tip: "เตรียมโครงประโยคที่ใช้ซ้ำได้ไว้ล่วงหน้า เช่น บอกว่ามีใคร/อะไรอยู่ตรงไหน กำลังทำอะไร บรรยากาศเป็นอย่างไร — มีโครงพร้อมจะเขียนได้เร็วและครบใจความภายในเวลาจำกัด",
  },
  speak_about_photo: {
    emoji: "🎤",
    label: "พูดบรรยายภาพ",
    tip: "หลักการเดียวกับเขียนบรรยายภาพ แต่ต้องพูดให้ลื่นไหลใน 1 นาที เตรียมโครงประโยคที่คุ้นปาก แล้วฝึกพูดจับเวลาจริงบ่อย ๆ จะช่วยลดอาการติดขัดตอนสอบจริง",
  },
  read_and_write: {
    emoji: "📄",
    label: "อ่านแล้วเขียนสรุป",
    tip: "ต้องจับใจความให้ไวแล้วเรียบเรียงเป็นคำพูดของตัวเอง ไม่ใช่ก็อปประโยคจากโจทย์มาตรง ๆ ฝึกอ่านจบแล้วสรุปเป็นประโยคสั้น ๆ ของตัวเองทันทีทุกครั้งจะช่วยให้ทำได้เร็วขึ้น",
  },
  read_then_speak: {
    emoji: "📑",
    label: "อ่านแล้วพูดด้วยคำตัวเอง",
    tip: "เหมือนอ่านแล้วเขียน แต่ต้องพูดออกมาแทน ระวังอย่าท่องประโยคจากโจทย์ตรง ๆ เพราะระบบจะให้คะแนนต่ำ ฝึกจับใจความแล้วพูดด้วยคำศัพท์ของตัวเองให้เป็นธรรมชาติ",
  },
  interactive_conversation_mcq: {
    emoji: "💬",
    label: "บทสนทนาโต้ตอบ (เลือกตอบ)",
    tip: "เน้นจำ scenario และคำศัพท์ที่ใช้บ่อยในชีวิตมหาวิทยาลัยหรือที่ทำงาน ฟังให้เข้าใจสถานการณ์ทั้งหมดก่อน แล้วเลือกคำตอบที่เข้ากับบริบทที่สุด ไม่ใช่แค่คำตอบที่ฟังดูถูกหลักไวยากรณ์อย่างเดียว",
  },
  interactive_speaking: {
    emoji: "🎙️",
    label: "พูดโต้ตอบสด",
    tip: "ต้องตอบให้เป็นธรรมชาติและต่อเนื่อง ไม่ใช่ตอบสั้น ๆ ประโยคเดียวจบ ฝึกขยายความอย่างน้อย 2-3 ประโยคทุกคำถามพร้อมยกตัวอย่างประกอบ จะช่วยให้ระบบประเมินได้แม่นยำขึ้นมาก",
  },
  conversation_summary: {
    emoji: "🧾",
    label: "สรุปบทสนทนา",
    tip: "ต้องจับให้ครบ 3 อย่าง: ใจความหลักของบทสนทนา รายละเอียดสำคัญ และข้อสรุป/คำแนะนำท้ายบทสนทนา ฝึกฟังแล้วจดสั้น ๆ ทั้ง 3 จุดนี้ทุกครั้งจะช่วยสรุปได้ครบไม่หลุดประเด็น",
  },
};

export function MockFixedResultsClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [row, setRow] = useState<FixedResult | null>(null);
  const [stepItems, setStepItems] = useState<FixedStepItem[]>([]);
  const [dashboardSavedAt, setDashboardSavedAt] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/mock-test/fixed/results/${sessionId}/report`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (cancelled) return;
      if (!res.ok) {
        // Result row doesn't exist yet (e.g. a bookmarked/shared link, back
        // navigation, or a second tab landing here before grading committed)
        // — results-loading knows how to poll/wait, so send the user there
        // instead of stranding them on an infinite "Loading result...".
        router.replace(`/mock-test/fixed/results-loading/${sessionId}`);
        return;
      }
      const json = (await res.json()) as { result?: FixedResult; stepItems?: FixedStepItem[] };
      const next = (json.result ?? null) as FixedResult | null;
      setRow(next);
      setStepItems(json.stepItems ?? []);
      setDashboardSavedAt(next?.dashboard_saved_at ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  if (!row) return <div className="p-8 text-center font-bold">Loading result...</div>;

  const desiredScore = Math.round(Number(row.target_total ?? 0));
  const totalScore = Math.round(Number(row.actual_total ?? 0));

  const responses = (row.report_payload?.responses ?? []) as FixedMockScoredRow[];
  const byTask = new Map<string, number[]>();
  for (const r of responses) {
    const prev = byTask.get(r.task_type) ?? [];
    prev.push(Number(r.score ?? 0));
    byTask.set(r.task_type, prev);
  }
  const taskAverages = [...byTask.entries()].map(([task, scores]) => ({
    task,
    average: Math.round(avg(scores)),
  }));
  const sortedHigh = [...taskAverages].sort((a, b) => b.average - a.average).slice(0, 3);
  const sortedLow = [...taskAverages].sort((a, b) => a.average - b.average).slice(0, 3);

  const recommendations: string[] = [];
  const scoreGap = desiredScore - totalScore;
  if (scoreGap > 0) {
    recommendations.push(
      `ตอนนี้คุณได้ ${totalScore} คะแนน ห่างจากเป้าหมาย ${desiredScore} อยู่ ${scoreGap} คะแนน — เก็บ 2 จุดที่อ่อนที่สุดให้ได้ก่อน คะแนนรวมจะขยับขึ้นเร็วที่สุดครับ`,
    );
  } else {
    recommendations.push(
      `ทำได้ถึงเป้าหมาย ${desiredScore} คะแนนแล้วครับ เก่งมาก! ลองตั้งเป้าใหม่ให้สูงขึ้นอีกนิดเพื่อพัฒนาต่อไป`,
    );
  }
  for (const { task, average } of sortedLow.slice(0, 2)) {
    const advice = TASK_ADVICE_TH[task];
    if (!advice) continue;
    recommendations.push(`${advice.emoji} ${advice.label} (เฉลี่ย ${average}/160) — ${advice.tip}`);
  }
  if (recommendations.length <= 1) {
    recommendations.push(
      "คะแนนค่อนข้างสมดุลทุกทักษะแล้ว ลองฝึกแบบสุ่มทุกประเภทต่อไปเรื่อย ๆ เพื่อรักษาระดับและขยับขึ้นทีละนิดครับ",
    );
  }

  const listening = Math.round(Number(row.actual_listening ?? 0));
  const speaking = Math.round(Number(row.actual_speaking ?? 0));
  const reading = Math.round(Number(row.actual_reading ?? 0));
  const writing = Math.round(Number(row.actual_writing ?? 0));

  return (
    <>
      <MockFixedReportBrandedViewV2
        sessionId={sessionId}
        total={totalScore}
        listening={listening}
        speaking={speaking}
        reading={reading}
        writing={writing}
        targets={{
          total: Math.round(Number(row.target_total ?? 0)),
          listening: Math.round(Number(row.target_listening ?? 0)),
          speaking: Math.round(Number(row.target_speaking ?? 0)),
          reading: Math.round(Number(row.target_reading ?? 0)),
          writing: Math.round(Number(row.target_writing ?? 0)),
        }}
        responses={responses}
        stepItems={stepItems}
        completedAt={row.created_at ?? null}
        recommendations={recommendations}
      />
      <div className="mx-auto max-w-[720px] space-y-2 px-4 pb-12">
        <button
          type="button"
          disabled={dashboardLoading}
          onClick={() => {
            void (async () => {
              setDashboardError(null);
              setDashboardLoading(true);
              const wantSave = !dashboardSavedAt;
              try {
                const res = await fetch(`/api/mock-test/fixed/results/${sessionId}/dashboard`, {
                  method: "PATCH",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ saved: wantSave }),
                });
                const json = (await res.json().catch(() => ({}))) as {
                  error?: string;
                  dashboard_saved_at?: string | null;
                };
                if (!res.ok) {
                  setDashboardError(json.error ?? "Could not update dashboard.");
                  return;
                }
                setDashboardSavedAt(json.dashboard_saved_at ?? null);
              } finally {
                setDashboardLoading(false);
              }
            })();
          }}
          className="w-full border-[3px] border-black bg-white px-4 py-3 text-center text-[0.7rem] font-extrabold uppercase tracking-wide text-neutral-900 shadow-[2px_2px_0_0_#111827] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827] disabled:opacity-50"
        >
          {dashboardLoading
            ? "Updating…"
            : dashboardSavedAt
              ? "Saved on mock test dashboard — tap to remove"
              : "Save report to mock test dashboard"}
        </button>
        {dashboardError ? (
          <p className="text-center text-xs font-bold text-red-700">{dashboardError}</p>
        ) : null}
        <p className="text-center text-[11px] font-semibold text-neutral-600">
          Pinned reports appear at the top of your list on{" "}
          <Link href="/mock-test/start" className="font-bold text-[#004aad] underline underline-offset-2">
            Mock test
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const supabase = getBrowserSupabase();
              if (!supabase) return;
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;
              await supabase.from("notebook_entries").insert({
                user_id: user.id,
                type: "production",
                content: [
                  "DET fixed mock (20 steps) — full report snapshot",
                  `Total: ${totalScore}/160 (target ${desiredScore}/160)`,
                  `Listening ${listening}/160 · Speaking ${speaking}/160 · Reading ${reading}/160 · Writing ${writing}/160`,
                  "",
                  "Strength (top 3 task averages):",
                  ...sortedHigh.map((x) => `- ${x.task.replaceAll("_", " ")}: ${x.average}`),
                  "",
                  "Weakest (lowest 3):",
                  ...sortedLow.map((x) => `- ${x.task.replaceAll("_", " ")}: ${x.average}`),
                  "",
                  "Coach tips:",
                  ...recommendations.map((x) => `- ${x}`),
                ].join("\n"),
                source_exercise_type: "mock_test",
                source_skill: "production",
                score_at_save: totalScore,
              });
              router.push("/notebook");
            })();
          }}
          className="w-full border-[3px] border-black bg-[#ffcc00] px-4 py-3 text-center text-[0.7rem] font-extrabold uppercase tracking-wide text-black shadow-[2px_2px_0_0_#111827] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827]"
        >
          Save report to notebook
        </button>
      </div>
    </>
  );
}
