"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getScoreBand, cefrFromScore } from "@/lib/mock-test/scoring";
import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { V2PlacementResult } from "@/lib/mock-test/v2/types";

type ResultRow = {
  id: string;
  session_id: string;
  overall_score: number | null;
  literacy_score: number | null;
  comprehension_score: number | null;
  conversation_score: number | null;
  production_score: number | null;
  adaptive_log: unknown;
  ai_feedback: {
    insights?: { bullets?: { en: string; th: string }[] };
    placement?: V2PlacementResult;
  } | null;
  created_at: string;
  /** Engine v2: continuous DET-like placement (main score). */
  final_score_raw: number | null;
  final_score_rounded_5: number | null;
  cefr_level: string | null;
  routing_band: number | null;
  stage1_raw_100: number | null;
  stage1_det_like: number | null;
  reading_subscore_v2: number | null;
  listening_subscore_v2: number | null;
  writing_subscore_v2: number | null;
  speaking_subscore_v2: number | null;
  overall_raw_0_to_100: number | null;
  placement_payload: V2PlacementResult | null;
};

function isV2Result(row: ResultRow): boolean {
  return typeof row.final_score_raw === "number" && Number.isFinite(row.final_score_raw);
}

function routingBandNote(band: number | null): string {
  if (band === 85 || band === 125 || band === 150) return String(band);
  return "—";
}

export function MockTestResultsClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [row, setRow] = useState<ResultRow | null>(null);
  const [history, setHistory] = useState<{ date: string; score: number }[]>(
    [],
  );
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [openJourney, setOpenJourney] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: r } = await supabase
        .from("mock_test_results")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      setRow(r as ResultRow | null);

      const { data: hist } = await supabase
        .from("mock_test_results")
        .select("overall_score, final_score_raw, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      type H = {
        overall_score: number | null;
        final_score_raw: number | null;
        created_at: string;
      };
      type HistoryPoint = { date: string; score: number };
      const rawHist = (hist ?? []) as H[];
      const pts = rawHist
        .map((h): HistoryPoint | null => {
          const score =
            typeof h.final_score_raw === "number" && Number.isFinite(h.final_score_raw)
              ? h.final_score_raw
              : typeof h.overall_score === "number"
                ? h.overall_score
                : null;
          if (score == null) return null;
          return {
            date: new Date(h.created_at).toLocaleDateString(),
            score,
          };
        })
        .filter((p: HistoryPoint | null): p is HistoryPoint => p != null);
      setHistory(pts);
      if (pts.length >= 2) {
        setPrevScore(pts[pts.length - 2]!.score);
      }
    })();
  }, [sessionId]);

  if (!row || (!isV2Result(row) && row.overall_score == null)) {
    return (
      <div className="p-12 text-center font-bold text-neutral-600">
        กำลังโหลดผลคะแนน… หรือยังประมวลผลไม่เสร็จ
      </div>
    );
  }

  const v2 = isV2Result(row);
  const overall = v2 ? row.final_score_raw! : row.overall_score!;
  const scoreBand = getScoreBand(overall);
  const delta = prevScore != null ? overall - prevScore : null;

  const skillsV1 = [
    {
      key: "literacy",
      en: "Literacy",
      th: "การอ่านและการเขียนเชิงตัวอักษร",
      v: row.literacy_score ?? 0,
    },
    {
      key: "comprehension",
      en: "Comprehension",
      th: "ความเข้าใจในการอ่านและฟัง",
      v: row.comprehension_score ?? 0,
    },
    {
      key: "conversation",
      en: "Conversation",
      th: "การสนทนา",
      v: row.conversation_score ?? 0,
    },
    {
      key: "production",
      en: "Production",
      th: "การผลิตภาษา",
      v: row.production_score ?? 0,
    },
  ];

  const skillsV2 = [
    {
      key: "reading",
      en: "Reading",
      th: "ทักษะการอ่าน (รวมย่อย)",
      v: row.reading_subscore_v2 ?? 0,
    },
    {
      key: "listening",
      en: "Listening",
      th: "ทักษะการฟัง (รวมย่อย)",
      v: row.listening_subscore_v2 ?? 0,
    },
    {
      key: "writing",
      en: "Writing",
      th: "ทักษะการเขียน (รวมย่อย)",
      v: row.writing_subscore_v2 ?? 0,
    },
    {
      key: "speaking",
      en: "Speaking",
      th: "ทักษะการพูด (รวมย่อย)",
      v: row.speaking_subscore_v2 ?? 0,
    },
  ];

  const skills = v2 ? skillsV2 : skillsV1;

  const borderFor = (s: number) =>
    s < 70 ? "border-red-600" : s <= 100 ? "border-[#FFCC00]" : "border-green-600";

  const bullets = row.ai_feedback?.insights?.bullets ?? [];

  const placement =
    row.placement_payload ?? row.ai_feedback?.placement ?? null;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <section
        className={`${mt.border} ${mt.shadow} rounded-[4px] bg-[#004AAD] p-8 text-[#FFCC00]`}
      >
        <p className="text-sm font-bold opacity-90">
          {v2
            ? "Placement score (continuous) / คะแนนจัดระดับแบบต่อเนื่อง"
            : "Overall / คะแนนรวม"}
        </p>
        <p
          className="mt-2 text-7xl font-black tabular-nums"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          {v2 ? overall.toFixed(1) : `~${overall}`}
        </p>
        {v2 ? (
          <>
            <p className="mt-2 text-lg font-bold">
              CEFR {row.cefr_level ?? "—"} (from placement score / จากคะแนนจัดระดับ)
            </p>
            {typeof row.final_score_rounded_5 === "number" ? (
              <p className="mt-1 text-sm font-mono opacity-90">
                Rounded to nearest 5 (display helper) / ปัดเป็นช่วง 5:{" "}
                {row.final_score_rounded_5}
              </p>
            ) : null}
            <p className="mt-3 text-xs font-mono leading-relaxed opacity-90">
              Internal routing band / แบนด์ภายใน (ไม่ใช่คะแนนสุดท้าย):{" "}
              {routingBandNote(row.routing_band)} — Stage 1 anchor det-like / ดัชนี Stage 1:{" "}
              {row.stage1_det_like != null
                ? Number(row.stage1_det_like).toFixed(1)
                : "—"}
            </p>
          </>
        ) : (
          <p className="mt-2 text-lg font-bold">
            {scoreBand.labelEn} / {scoreBand.labelTh}
          </p>
        )}
        {delta != null ? (
          <p className="mt-2 text-sm font-mono">
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} points from last test /{" "}
            {delta >= 0 ? "+" : "-"}
            {Math.abs(delta)} คะแนนจากครั้งก่อน
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {skills.map((s) => (
          <div
            key={s.key}
            className={`${mt.border} ${mt.shadow} border-4 bg-white p-4 ${borderFor(s.v)}`}
          >
            <p className="text-sm font-bold text-neutral-900">{s.en}</p>
            <p className="text-xs text-neutral-600">{s.th}</p>
            <p
              className="mt-2 text-3xl font-black text-[#004AAD]"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              {v2 ? s.v.toFixed(1) : s.v}
            </p>
            <div className="mt-2 h-2 w-full border-2 border-black bg-neutral-200">
              <div
                className="h-full bg-[#004AAD]"
                style={{
                  width: `${(v2 ? Math.min(100, s.v) / 100 : s.v / 160) * 100}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs font-mono text-neutral-500">
              {v2 ? "Subscore 0–100 / คะแนนย่อย" : `CEFR ~${cefrFromScore(s.v)}`}
            </p>
          </div>
        ))}
      </section>

      <section
        className={`${mt.border} ${mt.shadow} border-l-8 border-l-[#FFCC00] bg-white p-6`}
      >
        <h2 className="text-lg font-black text-[#004AAD]">
          Your personalized recommendations / คำแนะนำส่วนตัว
        </h2>
        {bullets.length > 0 ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-800">
            {bullets.map((b, i) => (
              <li key={i}>
                <span className="font-bold">{b.en}</span>
                <span className="block text-xs text-neutral-600">{b.th}</span>
              </li>
            ))}
          </ul>
        ) : v2 ? (
          <p className="mt-3 text-sm text-neutral-700">
            This attempt used the adaptive pool engine (v2). Your placement is summarized above;
            open “Placement details” below for the full payload. / แบบทดสอบนี้ใช้ระบบจัดชุดข้อสอบแบบปรับระดับ
            (v2) สรุปอยู่ด้านบน เปิดรายละเอียดด้านล่างได้
          </p>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">—</p>
        )}
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <h2 className="text-lg font-black text-[#004AAD]">Score history</h2>
        {history.length < 2 ? (
          <p className="mt-2 text-sm text-neutral-600">
            Take more mock tests to see progress / ทำแบบทดสอบเพิ่มเติมเพื่อดูความก้าวหน้า
          </p>
        ) : (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="date" />
                <YAxis domain={[10, 160]} />
                <Tooltip />
                <ReferenceLine y={120} stroke="#ccc" />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#004AAD"
                  strokeWidth={3}
                  dot={{ fill: "#FFCC00", stroke: "#000", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white`}>
        <button
          type="button"
          onClick={() => setOpenJourney((o) => !o)}
          className="flex w-full items-center justify-between p-4 text-left font-black text-[#004AAD]"
        >
          {v2
            ? "Placement details & response log / รายละเอียดการจัดระดับและบันทึกคำตอบ"
            : "Adaptive journey / เส้นทางการปรับระดับ"}
          <span>{openJourney ? "−" : "+"}</span>
        </button>
        {openJourney ? (
          <div className="border-t-4 border-black p-4 text-sm text-neutral-700">
            {v2 && placement ? (
              <>
                <p className="font-bold text-[#004AAD]">placement_payload</p>
                <pre className="mt-2 max-h-56 overflow-auto rounded-[4px] border-2 border-black bg-neutral-50 p-2 text-xs">
                  {JSON.stringify(placement, null, 2)}
                </pre>
                {row.overall_raw_0_to_100 != null ? (
                  <p className="mt-3 text-xs font-mono text-neutral-600">
                    overall_raw_0_to_100: {Number(row.overall_raw_0_to_100).toFixed(2)} (before DET-like
                    10 + ×1.5) / ก่อนแปลงเป็นสเกล DET-like
                  </p>
                ) : null}
              </>
            ) : null}
            <p className={v2 ? "mt-4 font-bold text-[#004AAD]" : ""}>
              {v2
                ? "Per-task response log (v2) / บันทึกรายข้อ"
                : "Detailed log stored in your session. / บันทึกละเอียดอยู่ในระบบ"}
            </p>
            <pre className="mt-2 max-h-48 overflow-auto rounded-[4px] border-2 border-black bg-neutral-50 p-2 text-xs">
              {JSON.stringify(row.adaptive_log, null, 2)}
            </pre>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/practice"
          className={`${mt.border} bg-[#004AAD] px-4 py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]`}
        >
          Practice weak areas
        </Link>
        <Link
          href="/mock-test/start"
          className={`${mt.border} bg-white px-4 py-3 text-sm font-bold shadow-[4px_4px_0_0_#000]`}
        >
          Retake mock test
        </Link>
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
                content: bullets.map((b) => b.en).join("\n"),
                source_exercise_type: "mock_test",
                source_skill: "production",
                score_at_save: overall,
              });
              router.push("/notebook");
            })();
          }}
          className={`${mt.border} bg-[#FFCC00] px-4 py-3 text-sm font-black text-black shadow-[4px_4px_0_0_#000]`}
        >
          Save to Notebook
        </button>
      </div>
    </main>
  );
}
