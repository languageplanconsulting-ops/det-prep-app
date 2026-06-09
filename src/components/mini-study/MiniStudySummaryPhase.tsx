"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import type { MiniStudyConversationSummarySession } from "@/lib/mini-study/content";
import type { SummaryGradeResult } from "@/lib/mini-study/grade-summary";
import { addNotebookEntry } from "@/lib/notebook-storage";

type Props = { session: MiniStudyConversationSummarySession };

const TIMER_SECS = 75;

export function MiniStudySummaryPhase({ session }: Props) {
  const [summary, setSummary] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<SummaryGradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToNotebook, setSavedToNotebook] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phase, setPhase] = useState<"prep" | "write" | "graded">("prep");
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECS);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "write") return;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [phase]);

  const submit = async () => {
    if (!summary.trim()) return;
    setGrading(true);
    setError(null);
    try {
      const geminiKey = getStoredGeminiKey();
      const res = await fetch("/api/mini-study/summary-grade", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          summary,
          conversation: session.conversation,
        }),
      });
      const data = (await res.json()) as { error?: string } & SummaryGradeResult;
      if (!res.ok) throw new Error(data.error || `Grading failed (${res.status})`);
      setResult(data);
      setPhase("graded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGrading(false);
    }
  };

  const saveToNotebook = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const grammarLines = result.grammarMistakes
        .map((m) => `• ${m.wrong} → ${m.fix} (${m.reasonTh})`)
        .join("\n");
      const vocabLines = result.vocabMistakes
        .map((m) => `• ${m.wrong} → ${m.fix} (${m.reasonTh})`)
        .join("\n");

      const bodyEn = [
        "Original:",
        summary,
        "",
        "Revised:",
        result.revised,
        ...(grammarLines ? ["", "Grammar mistakes:", grammarLines] : []),
        ...(vocabLines ? ["", "Vocabulary mistakes:", vocabLines] : []),
      ].join("\n");

      const bodyTh = [
        "จุดอ่อนของคุณ:",
        result.weaknessesTh,
        ...(grammarLines ? ["", "ข้อผิดด้านไวยากรณ์:", grammarLines] : []),
      ].join("\n");

      await addNotebookEntry({
        source: "dialogue-summary",
        categoryIds: ["all", "grammar"],
        titleEn: `Mini Study · Session 10 · Conversation summary feedback`,
        titleTh: `Mini Study · Session 10 · ผลวิเคราะห์การสรุปบทสนทนา`,
        bodyEn,
        bodyTh,
        userNote: "",
      });
      setSavedToNotebook(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save to notebook");
    } finally {
      setSaving(false);
    }
  };

  if (phase === "prep") {
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <header className="rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#111]">
          <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
            Session {session.index} · Summarize the conversation
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Read the conversation</h1>
          <p className="mt-2 text-sm text-neutral-700 leading-7">{session.instructionsTh}</p>
        </header>

        <div className="rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#111]">
          <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
            Conversation
          </h2>
          <div className="mt-2 space-y-2 text-sm leading-7">
            {session.conversation.map((t, i) => (
              <p key={i}>
                <span className="font-bold">{t.speaker}:</span> "{t.text}"
              </p>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Link
            href="/practice/mini-study"
            className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
          >
            ← Sessions
          </Link>
          <button
            type="button"
            onClick={() => setPhase("write")}
            className="rounded-[4px] border-4 border-black bg-[#004AAD] px-5 py-2 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
          >
            Start 75-second timer →
          </button>
        </div>
      </main>
    );
  }

  if (phase === "write") {
    const timeUp = secondsLeft <= 0;
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <header className="flex items-center justify-between rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#111]">
          <div>
            <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
              Session {session.index}
            </p>
            <h1 className="text-lg font-black">Write your summary</h1>
          </div>
          <div
            className={`rounded-sm border-2 px-3 py-1 text-lg font-black ${
              timeUp
                ? "border-red-700 bg-red-50 text-red-800"
                : secondsLeft <= 15
                  ? "border-amber-600 bg-amber-50 text-amber-800"
                  : "border-[#004AAD] bg-[#eef4ff] text-[#004AAD]"
            }`}
          >
            {secondsLeft}s
          </div>
        </header>

        <div className="rounded-sm border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#111]">
          <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            3-sentence summary · present simple only
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
            placeholder="In this conversation, …"
            className="mt-2 w-full rounded-sm border-2 border-black bg-white p-3 text-base leading-7"
            autoFocus
          />
          {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              href="/practice/mini-study"
              className="text-xs text-neutral-500 underline"
            >
              Exit
            </Link>
            <button
              type="button"
              onClick={submit}
              disabled={grading || !summary.trim()}
              className="rounded-[4px] border-4 border-black bg-[#004AAD] px-5 py-2 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
            >
              {grading ? "Grading…" : "Submit for AI feedback"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // graded
  if (!result) return null;
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="rounded-sm border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#111]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-[#004AAD]">
          AI feedback · Session {session.index}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Your summary, graded</h1>
      </header>

      <section className="rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#111]">
        <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
          Original
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{summary}</p>
      </section>

      {result.grammarMistakes.length > 0 ? (
        <section className="rounded-sm border-4 border-red-700 bg-red-50 p-5 shadow-[4px_4px_0_0_#111]">
          <h2 className="text-sm font-black uppercase tracking-wide text-red-800">
            Grammar mistakes
          </h2>
          <ul className="mt-2 space-y-2 text-sm leading-7">
            {result.grammarMistakes.map((m, i) => (
              <li key={i}>
                <span className="font-bold text-red-800">{m.wrong}</span> →{" "}
                <span className="font-bold text-green-800">{m.fix}</span>
                <br />
                <span className="text-neutral-700">{m.reasonTh}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-sm border-4 border-green-700 bg-green-50 p-5 shadow-[4px_4px_0_0_#111]">
          <p className="text-sm font-bold text-green-800">
            ✓ ไม่มีข้อผิดด้านไวยากรณ์
          </p>
        </section>
      )}

      {result.vocabMistakes.length > 0 ? (
        <section className="rounded-sm border-4 border-amber-600 bg-amber-50 p-5 shadow-[4px_4px_0_0_#111]">
          <h2 className="text-sm font-black uppercase tracking-wide text-amber-800">
            Vocabulary mistakes
          </h2>
          <ul className="mt-2 space-y-2 text-sm leading-7">
            {result.vocabMistakes.map((m, i) => (
              <li key={i}>
                <span className="font-bold text-amber-900">{m.wrong}</span> →{" "}
                <span className="font-bold text-green-800">{m.fix}</span>
                <br />
                <span className="text-neutral-700">{m.reasonTh}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-sm border-4 border-[#004AAD] bg-[#eef4ff] p-5 shadow-[4px_4px_0_0_#111]">
        <h2 className="text-sm font-black uppercase tracking-wide text-[#004AAD]">
          Revised (grammar fixed only)
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{result.revised}</p>
      </section>

      <section className="rounded-sm border-4 border-black bg-[#fff7d1] p-5 shadow-[6px_6px_0_0_#111]">
        <h2 className="text-sm font-black uppercase tracking-wide text-red-700">
          จุดอ่อนของคุณ (Thai)
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-900">
          {result.weaknessesTh}
        </p>
      </section>

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/practice/mini-study"
          className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
        >
          ← All sessions
        </Link>
        <button
          type="button"
          onClick={saveToNotebook}
          disabled={saving || savedToNotebook}
          className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] disabled:opacity-50"
        >
          {savedToNotebook ? "✓ Saved to notebook" : saving ? "Saving…" : "Save to notebook"}
        </button>
      </div>
    </main>
  );
}
