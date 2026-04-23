"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StepItem = {
  step_index: number;
  task_type: string;
  content?: Record<string, unknown> | null;
  correct_answer?: Record<string, unknown> | null;
};

type ResponseRow = {
  step_index: number;
  task_type: string;
  score: number;
  answer?: unknown;
  review?: Record<string, unknown> | null;
};

type ResultRow = {
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  level_label?: string | null;
  strengths?: Array<{ key: string; score: number }>;
  weaknesses?: Array<{ key: string; score: number }>;
  report_payload?: {
    responses?: ResponseRow[];
    scoreBreakdown?: {
      total?: Record<string, number>;
      listening?: Record<string, number>;
      speaking?: Record<string, number>;
      reading?: Record<string, number>;
      writing?: Record<string, number>;
      supporting?: Record<string, number>;
    };
  };
  created_at?: string;
};

function breakdownLabel(key: string) {
  const labels: Record<string, string> = {
    dictation: "Dictation / ฟังแล้วพิมพ์",
    interactive_listening: "Listening Mini Test / มินิเทสต์การฟัง",
    read_then_speak: "Read Then Speak / อ่านแล้วพูด",
    fill_in_blanks: "Fill in the Blank / เติมคำ",
    vocabulary_reading: "Vocabulary Reading / คำศัพท์ + การอ่าน",
    write_about_photo: "Write About Photo / เขียนจากภาพ",
    reading: "Reading",
    listening: "Listening",
    speaking: "Speaking",
    writing: "Writing",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function breakdownPctLabel(skill: string, part: string) {
  const map: Record<string, Record<string, string>> = {
    listening: {
      dictation: "50%",
      interactive_listening: "50%",
    },
    speaking: {
      read_then_speak: "100%",
    },
    reading: {
      fill_in_blanks: "50%",
      vocabulary_reading: "50%",
    },
    writing: {
      write_about_photo: "55%",
      dictation: "30%",
      fill_in_blanks: "15%",
    },
  };
  return map[skill]?.[part] ?? "";
}

function taskLabel(taskType: string) {
  const labels: Record<string, string> = {
    dictation: "Dictation / ฟังแล้วพิมพ์",
    real_english_word: "Real English Word / คำอังกฤษจริง",
    vocabulary_reading: "Vocabulary Reading / คำศัพท์ + การอ่าน",
    fill_in_blanks: "Fill in the Blank / เติมคำ",
    interactive_listening: "Listening Mini Test / มินิเทสต์การฟัง",
    write_about_photo: "Write About Photo / เขียนจากภาพ",
    read_then_speak: "Read Then Speak / อ่านแล้วพูด",
  };
  return labels[taskType] ?? taskType;
}

function extractFitbAnswers(answer: unknown): string[] {
  if (Array.isArray((answer as { answers?: unknown[] })?.answers)) {
    return ((answer as { answers?: unknown[] }).answers ?? []).map((item) => String(item ?? ""));
  }
  if (Array.isArray((answer as { answer?: { answers?: unknown[] } })?.answer?.answers)) {
    return (((answer as { answer?: { answers?: unknown[] } }).answer?.answers ?? []).map((item) =>
      String(item ?? "")));
  }
  return [];
}

function renderObjectiveReview(taskType: string, answer: unknown, item: StepItem) {
  if (taskType === "dictation") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="border-4 border-black bg-white p-4">
          <p className="font-black uppercase text-[#004AAD]">Your answer / คำตอบของคุณ</p>
          <p className="mt-3 text-sm font-bold text-neutral-700">
            {String((answer as { answer?: unknown })?.answer ?? answer ?? "") || "—"}
          </p>
        </div>
        <div className="border-4 border-black bg-[#ecfeff] p-4">
          <p className="font-black uppercase text-[#004AAD]">Reference script / เฉลย</p>
          <p className="mt-3 text-sm font-bold text-neutral-700">
            {String((item.content as { reference_sentence?: unknown } | null)?.reference_sentence ?? "") || "—"}
          </p>
        </div>
      </div>
    );
  }

  if (taskType === "fill_in_blanks") {
    const yourAnswers = extractFitbAnswers(answer);
    const correctAnswers = Array.isArray((item.correct_answer as { answers?: unknown[] } | null)?.answers)
      ? (((item.correct_answer as { answers?: unknown[] }).answers ?? []).map((value) => String(value ?? "")))
      : [];
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="border-4 border-black bg-white p-4">
          <p className="font-black uppercase text-[#004AAD]">Your blanks / คำตอบของคุณ</p>
          <div className="mt-3 space-y-2">
            {yourAnswers.map((value, idx) => (
              <div key={idx} className="border-2 border-black bg-neutral-50 px-3 py-2 text-sm font-bold">
                Blank {idx + 1}: {value || "—"}
              </div>
            ))}
          </div>
        </div>
        <div className="border-4 border-black bg-[#ecfeff] p-4">
          <p className="font-black uppercase text-[#004AAD]">Correct blanks / เฉลย</p>
          <div className="mt-3 space-y-2">
            {correctAnswers.map((value, idx) => (
              <div key={idx} className="border-2 border-black bg-white px-3 py-2 text-sm font-bold">
                Blank {idx + 1}: {value || "—"}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (taskType === "vocabulary_reading" || taskType === "interactive_listening") {
    const selectedAnswers = Array.isArray((answer as { selected_answers?: unknown[] })?.selected_answers)
      ? ((answer as { selected_answers?: unknown[] }).selected_answers ?? []).map((value) => String(value ?? ""))
      : [];
    const correctAnswers = Array.isArray((answer as { correct_answers?: unknown[] })?.correct_answers)
      ? ((answer as { correct_answers?: unknown[] }).correct_answers ?? []).map((value) => String(value ?? ""))
      : [];
    const prompts = Array.isArray((answer as { question_prompts?: unknown[] })?.question_prompts)
      ? ((answer as { question_prompts?: unknown[] }).question_prompts ?? []).map((value) => String(value ?? ""))
      : [];
    return (
      <div className="space-y-3">
        {prompts.map((prompt, idx) => {
          const picked = selectedAnswers[idx] ?? "";
          const correct = correctAnswers[idx] ?? "";
          const match = picked === correct;
          return (
            <div key={idx} className="grid gap-3 rounded-[4px] border-4 border-black bg-white p-4 md:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="font-black text-[#004AAD]">Q{idx + 1}</p>
                <p className="mt-2 text-sm font-bold text-neutral-700">{prompt}</p>
              </div>
              <div className={`border-2 border-black px-3 py-2 text-sm font-bold ${match ? "bg-[#ecfdf5]" : "bg-[#fef2f2]"}`}>
                Your answer: {picked || "—"}
              </div>
              <div className="border-2 border-black bg-[#ecfeff] px-3 py-2 text-sm font-bold">
                Correct: {correct || "—"}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (taskType === "real_english_word") {
    const rounds = Array.isArray((answer as { round_selections?: unknown[] })?.round_selections)
      ? ((answer as { round_selections?: Array<Record<string, unknown>> }).round_selections ?? [])
      : [];
    return (
      <div className="space-y-3">
        {rounds.map((round, idx) => {
          const selected = Array.isArray(round.selected) ? round.selected.map((value) => String(value ?? "")) : [];
          const realWords = Array.isArray(round.realWords) ? round.realWords.map((value) => String(value ?? "")) : [];
          const fakeWords = Array.isArray(round.fakeWords) ? round.fakeWords.map((value) => String(value ?? "")) : [];
          const missedReal = realWords.filter((word) => !selected.includes(word));
          const pickedFake = selected.filter((word) => fakeWords.includes(word));
          return (
            <div key={idx} className="grid gap-3 rounded-[4px] border-4 border-black bg-white p-4 md:grid-cols-2">
              <div className="border-2 border-black bg-[#ecfeff] p-3">
                <p className="font-black text-[#004AAD]">Missed real words / คำจริงที่พลาด</p>
                <p className="mt-2 text-sm font-bold text-neutral-700">{missedReal.join(", ") || "None / ไม่มี"}</p>
              </div>
              <div className="border-2 border-black bg-[#fef2f2] p-3">
                <p className="font-black text-[#004AAD]">Fake words picked / คำปลอมที่กด</p>
                <p className="mt-2 text-sm font-bold text-neutral-700">{pickedFake.join(", ") || "None / ไม่มี"}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="border-4 border-black bg-white p-4">
        <p className="font-black uppercase text-[#004AAD]">Answer / คำตอบ</p>
        <pre className="mt-3 whitespace-pre-wrap text-sm font-bold text-neutral-700">
          {JSON.stringify(answer ?? null, null, 2)}
        </pre>
      </div>
      <div className="border-4 border-black bg-[#ecfeff] p-4">
        <p className="font-black uppercase text-[#004AAD]">Correct / เฉลย</p>
        <pre className="mt-3 whitespace-pre-wrap text-sm font-bold text-neutral-700">
          {JSON.stringify(item.correct_answer ?? item.content ?? null, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export function MiniDiagnosisResultsClient({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<ResultRow | null>(null);
  const [stepItems, setStepItems] = useState<StepItem[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/mini-diagnosis/results/${sessionId}/report`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { result?: ResultRow; stepItems?: StepItem[] };
      setResult(json.result ?? null);
      setStepItems(json.stepItems ?? []);
    })();
  }, [sessionId]);

  const responses = useMemo(() => result?.report_payload?.responses ?? [], [result]);
  const scoreBreakdown = useMemo(() => result?.report_payload?.scoreBreakdown ?? {}, [result]);
  const merged = useMemo(
    () =>
      stepItems.map((item) => ({
        item,
        response: responses.find((row) => row.step_index === item.step_index) ?? null,
      })),
    [responses, stepItems],
  );

  if (!result) return <div className="p-8 text-center font-black">Loading diagnosis report…</div>;

  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_#111111]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#004AAD]">
                Mini diagnosis result
              </p>
              <h1 className="text-4xl font-black italic uppercase leading-none text-[#111111] md:text-5xl">
                คะแนนและจุดอ่อน
                <br />
                <span className="not-italic text-[#004AAD]">Your level snapshot</span>
              </h1>
              <p className="mt-4 text-sm font-bold text-neutral-600">
                {result.level_label ?? "Mini diagnosis complete"}
              </p>
            </div>
            <div className="border-4 border-black bg-[#FFCC00] p-5 text-center shadow-[8px_8px_0_0_#111111]">
              <p className="font-mono text-[10px] font-black uppercase">Total</p>
              <p className="text-5xl font-black text-[#004AAD]">{Math.round(result.actual_total ?? 0)}</p>
              <p className="text-xs font-bold uppercase text-neutral-700">out of 160</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Reading", result.actual_reading],
              ["Listening", result.actual_listening],
              ["Speaking", result.actual_speaking],
              ["Writing", result.actual_writing],
            ].map(([label, value]) => (
              <div key={String(label)} className="border-4 border-black bg-neutral-50 p-4">
                <p className="font-mono text-[10px] font-black uppercase text-neutral-500">{label}</p>
                <p className="mt-2 text-3xl font-black text-[#004AAD]">{Math.round(Number(value ?? 0))}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111111]">
            <p className="font-black uppercase text-[#004AAD]">Top strengths / จุดแข็ง</p>
            <div className="mt-4 space-y-3">
              {(result.strengths ?? []).map((row) => (
                <div key={row.key} className="border-4 border-black bg-[#ecfdf5] p-4">
                  <p className="font-black capitalize">{row.key}</p>
                  <p className="text-sm font-bold text-neutral-600">Score {Math.round(Number(row.score ?? 0))}/160</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111111]">
            <p className="font-black uppercase text-[#004AAD]">Main weaknesses / จุดอ่อนหลัก</p>
            <div className="mt-4 space-y-3">
              {(result.weaknesses ?? []).map((row) => (
                <div key={row.key} className="border-4 border-black bg-[#fef2f2] p-4">
                  <p className="font-black capitalize">{row.key}</p>
                  <p className="text-sm font-bold text-neutral-600">Score {Math.round(Number(row.score ?? 0))}/160</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111111]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-2xl font-black uppercase text-[#004AAD]">Score breakdown / ที่มาของคะแนน</p>
              <p className="mt-2 text-sm font-bold text-neutral-600">
                ทุกสกิลคิดเต็ม 160 ตามสูตร mini test ชุดนี้
              </p>
            </div>
            <div className="border-4 border-black bg-[#fff9e6] px-4 py-3 text-sm font-black text-neutral-800">
              Total = (Reading + Listening + Speaking + Writing) / 4
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {[
              ["listening", result.actual_listening],
              ["speaking", result.actual_speaking],
              ["reading", result.actual_reading],
              ["writing", result.actual_writing],
            ].map(([skill, value]) => {
              const parts = Object.entries((scoreBreakdown?.[skill as keyof typeof scoreBreakdown] as Record<string, number> | undefined) ?? {});
              return (
                <div key={skill} className="border-4 border-black bg-neutral-50 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] font-black uppercase tracking-wide text-neutral-500">
                        {String(skill)}
                      </p>
                      <p className="text-2xl font-black text-[#004AAD]">{breakdownLabel(String(skill))}</p>
                    </div>
                    <div className="border-4 border-black bg-white px-3 py-2 text-right">
                      <p className="font-mono text-[9px] font-black uppercase text-neutral-500">Skill score</p>
                      <p className="text-2xl font-black">{Math.round(Number(value ?? 0))}/160</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {parts.map(([part, partScore]) => (
                      <div key={part} className="flex items-center justify-between gap-3 border-2 border-black bg-white px-3 py-3">
                        <div>
                          <p className="text-sm font-black text-neutral-900">{breakdownLabel(part)}</p>
                          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                            Weight {breakdownPctLabel(String(skill), part) || "Included"}
                          </p>
                        </div>
                        <p className="text-lg font-black text-[#004AAD]">{Math.round(Number(partScore ?? 0))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-4 border-black bg-[#ecfeff] p-4">
            <p className="font-black uppercase text-[#004AAD]">Raw section scores / คะแนนดิบแต่ละส่วน</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries((scoreBreakdown.supporting as Record<string, number> | undefined) ?? {}).map(([part, partScore]) => (
                <div key={part} className="border-2 border-black bg-white px-3 py-3">
                  <p className="text-sm font-black text-neutral-900">{breakdownLabel(part)}</p>
                  <p className="mt-1 text-xl font-black text-[#004AAD]">{Math.round(Number(partScore ?? 0))}/160</p>
                  {part === "real_english_word" ? (
                    <p className="mt-1 text-xs font-bold text-neutral-500">Shown for practice review, not used in skill formula.</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111111]">
          <p className="text-2xl font-black uppercase text-[#004AAD]">Step review / รีวิวทีละข้อ</p>
          <div className="mt-6 space-y-4">
            {merged.map(({ item, response }) => (
              <div key={item.step_index} className="border-4 border-black bg-neutral-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-wide text-neutral-500">
                      Step {item.step_index}
                    </p>
                    <p className="text-lg font-black text-[#004AAD]">{taskLabel(item.task_type)}</p>
                  </div>
                  <div className="border-4 border-black bg-white px-4 py-2 text-center">
                    <p className="font-mono text-[9px] font-black uppercase text-neutral-500">Score</p>
                    <p className="text-2xl font-black">{Math.round(Number(response?.score ?? 0))}</p>
                  </div>
                </div>

                {response?.review?.improvementPoints ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <div className="border-4 border-black bg-white p-4">
                      <p className="font-black uppercase text-[#004AAD]">Your submission / คำตอบของคุณ</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm font-bold text-neutral-700">
                        {String((response.answer as { text?: unknown })?.text ?? response.answer ?? "")}
                      </p>
                    </div>
                    <div className="border-4 border-black bg-[#fff9e6] p-4">
                      <p className="font-black uppercase text-[#004AAD]">How to improve / วิธีเพิ่มคะแนน</p>
                      <ul className="mt-3 space-y-2 text-sm font-bold text-neutral-700">
                        {((response.review?.improvementPoints as Array<{ th?: string; en?: string }>) ?? []).map((point, idx) => (
                          <li key={idx} className="border-b-2 border-black/10 pb-2">
                            {point.th || point.en}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">{renderObjectiveReview(item.task_type, response?.answer, item)}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 md:flex-row">
          <Link
            href="/pricing"
            className="flex-1 border-4 border-black bg-[#004AAD] px-5 py-4 text-center text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[6px_6px_0_0_#111111]"
          >
            Unlock full mock / ปลดล็อก full mock
          </Link>
          <Link
            href="/practice"
            className="flex-1 border-4 border-black bg-white px-5 py-4 text-center text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111111]"
          >
            Go to practice / ไปฝึกต่อ
          </Link>
        </section>
      </div>
    </main>
  );
}
