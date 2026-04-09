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
  } | null;
  created_at: string;
};

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
        .select("overall_score, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      type H = { overall_score: number | null; created_at: string };
      const pts = (hist ?? [])
        .filter((h: H): h is H & { overall_score: number } =>
          typeof h.overall_score === "number",
        )
        .map((h: H & { overall_score: number }) => ({
          date: new Date(h.created_at).toLocaleDateString(),
          score: h.overall_score,
        }));
      setHistory(pts);
      if (pts.length >= 2) {
        setPrevScore(pts[pts.length - 2]!.score);
      }
    })();
  }, [sessionId]);

  if (!row || row.overall_score == null) {
    return (
      <div className="p-12 text-center font-bold text-neutral-600">
        กำลังโหลดผลคะแนน… หรือยังประมวลผลไม่เสร็จ
      </div>
    );
  }

  const overall = row.overall_score;
  const band = getScoreBand(overall);
  const delta = prevScore != null ? overall - prevScore : null;

  const skills = [
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

  const borderFor = (s: number) =>
    s < 70 ? "border-red-600" : s <= 100 ? "border-[#FFCC00]" : "border-green-600";

  const bullets = row.ai_feedback?.insights?.bullets ?? [];

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <section
        className={`${mt.border} ${mt.shadow} rounded-[4px] bg-[#004AAD] p-8 text-[#FFCC00]`}
      >
        <p className="text-sm font-bold opacity-90">Overall / คะแนนรวม</p>
        <p
          className="mt-2 text-7xl font-black tabular-nums"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          ~{overall}
        </p>
        <p className="mt-2 text-lg font-bold">
          {band.labelEn} / {band.labelTh}
        </p>
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
              {s.v}
            </p>
            <div className="mt-2 h-2 w-full border-2 border-black bg-neutral-200">
              <div
                className="h-full bg-[#004AAD]"
                style={{ width: `${(s.v / 160) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-mono text-neutral-500">
              CEFR ~{cefrFromScore(s.v)}
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
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-800">
          {bullets.map((b, i) => (
            <li key={i}>
              <span className="font-bold">{b.en}</span>
              <span className="block text-xs text-neutral-600">{b.th}</span>
            </li>
          ))}
        </ul>
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
          Adaptive journey / เส้นทางการปรับระดับ
          <span>{openJourney ? "−" : "+"}</span>
        </button>
        {openJourney ? (
          <div className="border-t-4 border-black p-4 text-sm text-neutral-700">
            <p>
              Detailed log stored in your session. / บันทึกละเอียดอยู่ในระบบ
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
