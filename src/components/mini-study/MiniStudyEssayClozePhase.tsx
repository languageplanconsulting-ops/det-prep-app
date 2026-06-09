"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  MiniStudyClozeExercise,
  MiniStudyEssayClozeSession,
} from "@/lib/mini-study/content";
import { gradeClozeExercise, type ClozeGradeReport } from "@/lib/mini-study/grade-cloze";
import { addNotebookEntry } from "@/lib/notebook-storage";

type Props = { session: MiniStudyEssayClozeSession };

export function MiniStudyEssayClozePhase({ session }: Props) {
  const [idx, setIdx] = useState(0);
  const [answersByEx, setAnswersByEx] = useState<Record<string, Record<number, string>>>({});
  const [reportByEx, setReportByEx] = useState<Record<string, ClozeGradeReport>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const ex: MiniStudyClozeExercise | undefined = session.exercises[idx];
  const total = session.exercises.length;
  const report = ex ? reportByEx[ex.id] : undefined;
  const answers = ex ? answersByEx[ex.id] ?? {} : {};

  const allFilled = useMemo(
    () => (ex ? ex.blanks.every((b) => (answers[b.number] ?? "").trim().length > 0) : false),
    [ex, answers],
  );

  if (done) {
    const allReports = session.exercises
      .map((e) => reportByEx[e.id])
      .filter((r): r is ClozeGradeReport => !!r);
    const total = allReports.reduce((s, r) => s + r.total, 0);
    const correct = allReports.reduce((s, r) => s + r.numCorrect, 0);
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#004AAD]">
            เรียนจบบทนี้แล้ว
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {correct} / {total} blanks correct
          </h1>
        </div>
        <Link
          href="/practice/mini-study"
          className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
        >
          ← กลับไปหน้าหลัก
        </Link>
      </main>
    );
  }

  if (!ex) return null;

  const setAnswer = (n: number, val: string) =>
    setAnswersByEx((p) => ({
      ...p,
      [ex.id]: { ...(p[ex.id] ?? {}), [n]: val },
    }));

  const check = () => {
    setReportByEx((p) => ({ ...p, [ex.id]: gradeClozeExercise(ex, answers) }));
  };

  const segments = useMemo(() => splitTemplate(ex.essayTemplate, ex.blanks.length), [ex]);

  const saveToNotebook = async () => {
    if (!report) return;
    setSavingId(ex.id);
    setSaveError(null);
    try {
      const linesEn: string[] = [
        `Topic: ${ex.topic}`,
        ``,
        `Score: ${report.numCorrect} / ${report.total}`,
        ``,
        `Per-blank results:`,
        ...report.rows.map(
          (r) =>
            `${r.isCorrect ? "✅" : "❌"} ${r.number}. (${r.cue}) → student: "${r.studentAnswer || "(blank)"}" · correct: "${r.correct}"`,
        ),
      ];
      const linesTh: string[] = [
        `หัวข้อ: ${ex.topic}`,
        ``,
        `จุดอ่อนของคุณ:`,
        report.weaknessSummaryTh,
        ``,
        ...report.categories.flatMap((c) => [
          c.titleTh,
          `กฎ: ${c.ruleTh}`,
          c.exampleTh,
          ...c.mistakes.map((m) => `❌ ข้อ ${m.number} (${m.cue}): "${m.studentAnswer || "—"}" → "${m.correct}" — ${m.ruleNoteTh}`),
          ``,
        ]),
      ];
      await addNotebookEntry({
        source: "writing-read-and-write",
        categoryIds: ["all", "grammar"],
        titleEn: `Mini Study · Session 12 · Cloze essay weaknesses`,
        titleTh: `Mini Study · Session 12 · จุดอ่อนการเขียน essay`,
        bodyEn: linesEn.join("\n"),
        bodyTh: linesTh.join("\n"),
        userNote: "",
      });
      setSavedIds((p) => new Set(p).add(ex.id));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
          Session {session.index} · Exercise {idx + 1} / {total}
        </p>
        <h1 className="mt-1 text-base font-black">
          {ex.patternLabel} — <span className="text-[#004AAD]">{ex.topic}</span>
        </h1>
        <p className="mt-2 text-xs leading-6 text-neutral-700">
          {session.studentInstructionsTh}
        </p>
        {ex.noteTh ? (
          <p className="mt-2 rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200 text-xs leading-6 text-amber-900">
            ⚠ {ex.noteTh}
          </p>
        ) : null}
      </header>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm leading-9 text-neutral-900">
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return <span key={i}>{seg.content}</span>;
            }
            const blank = ex.blanks[seg.blankIdx];
            return (
              <BlankInput
                key={i}
                blank={blank}
                value={answers[blank.number] ?? ""}
                onChange={(v) => setAnswer(blank.number, v)}
                disabled={!!report}
                result={
                  report?.rows.find((r) => r.number === blank.number) ?? null
                }
              />
            );
          })}
        </p>

        {!report ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={check}
              disabled={!allFilled}
              className="rounded-lg bg-[#FFCC00] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:brightness-95 transition disabled:opacity-50"
            >
              ตรวจคำตอบ
            </button>
          </div>
        ) : null}
      </div>

      {report ? (
        <>
          <section className="rounded-2xl bg-[#fff7d1] p-5 shadow-sm ring-1 ring-[#FFCC00]/40">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              คะแนน: {report.numCorrect} / {report.total}
            </p>
            <h2 className="mt-1 text-base font-black text-neutral-900">รายงานจุดอ่อน (Thai)</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-900">
              {report.weaknessSummaryTh}
            </p>
          </section>

          {report.categories.length > 0 ? (
            <div className="space-y-4">
              {report.categories.map((c) => (
                <section
                  key={c.category}
                  className="rounded-2xl bg-red-50 p-4 shadow-sm ring-1 ring-red-200"
                >
                  <h3 className="text-sm font-black uppercase tracking-wide text-red-800">
                    {c.titleTh}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-800">
                    <strong>กฎ:</strong> {c.ruleTh}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-neutral-800">{c.exampleTh}</p>
                  <ul className="mt-2 space-y-1 text-sm leading-7">
                    {c.mistakes.map((m) => (
                      <li key={m.number}>
                        ❌ <span className="font-bold">ข้อ {m.number}</span> ({m.cue}): "
                        {m.studentAnswer || "—"}" → <strong className="text-green-800">"{m.correct}"</strong>
                        <br />
                        <span className="text-xs text-neutral-700">{m.ruleNoteTh}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <section className="rounded-2xl bg-green-50 p-5 shadow-sm ring-1 ring-green-200">
              <p className="text-sm font-bold text-green-800">
                ✓ ไม่มีจุดอ่อนเลย — เก่งมาก!
              </p>
            </section>
          )}

          {saveError ? (
            <p className="text-sm font-bold text-red-700">{saveError}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={saveToNotebook}
              disabled={savedIds.has(ex.id) || savingId === ex.id}
              className="rounded-lg bg-[#FFCC00] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:brightness-95 transition disabled:opacity-50"
            >
              {savedIds.has(ex.id)
                ? "✓ บันทึก notebook แล้ว"
                : savingId === ex.id
                  ? "กำลังบันทึก…"
                  : "บันทึก notebook"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (idx + 1 >= total) {
                  setDone(true);
                  return;
                }
                setIdx((i) => i + 1);
              }}
              className="rounded-lg bg-[#004AAD] px-5 py-2 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition"
            >
              {idx + 1 >= total ? "จบ" : "ข้อถัดไป →"}
            </button>
          </div>
        </>
      ) : null}

      <Link href="/practice/mini-study" className="inline-block text-xs text-neutral-500 underline">
        ออกจากบทเรียน
      </Link>
    </main>
  );
}

function BlankInput({
  blank,
  value,
  onChange,
  disabled,
  result,
}: {
  blank: { number: number; cue: string; correct: string };
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  result: { isCorrect: boolean; correct: string } | null;
}) {
  const colorClass = result
    ? result.isCorrect
      ? "border-green-700 bg-green-50 text-green-900"
      : "border-red-700 bg-red-50 text-red-900"
    : "border-[#004AAD] bg-white";
  return (
    <span className="inline-flex items-center align-baseline">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder=" "
        className={`mx-1 inline-block min-w-[100px] rounded-xl border-2 px-2 py-0.5 text-sm font-bold ${colorClass}`}
        aria-label={`Blank ${blank.number}`}
      />
      <span className="mr-1 text-[10px] font-mono text-neutral-500">
        [{blank.number}: {blank.cue}]
      </span>
      {result && !result.isCorrect ? (
        <span className="mr-1 text-xs font-bold text-green-800">→ {result.correct}</span>
      ) : null}
    </span>
  );
}

type Segment =
  | { type: "text"; content: string }
  | { type: "blank"; blankIdx: number };

function splitTemplate(template: string, expectedBlanks: number): Segment[] {
  const parts = template.split(/___+/g);
  const segments: Segment[] = [];
  let blankIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) segments.push({ type: "text", content: parts[i] });
    if (i < parts.length - 1 && blankIdx < expectedBlanks) {
      segments.push({ type: "blank", blankIdx });
      blankIdx++;
    }
  }
  return segments;
}
