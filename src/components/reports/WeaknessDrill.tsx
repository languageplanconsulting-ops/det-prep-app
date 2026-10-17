"use client";

import { useState } from "react";

type Choice = { id: string; text: string };
type DrillView = {
  drillId: string;
  choices: Choice[];
  stemEn: string;
  stemTh: string;
  answered: null | { choiceId: string; correct: boolean; correctChoiceId: string; explanationTh: string };
  rewrite: { attempts: number; attemptsLeft: number; passed: boolean; text: string | null };
};

export type DrillSource = {
  topicEn?: string;
  topicTh?: string;
  wrong: string;
  betterEn?: string;
  noteTh?: string;
  noteEn?: string;
};

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T | null }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

/**
 * "ฝึกแก้นิสัยนี้" — shown only on a mistake the learner has repeated.
 * Step 1: pick the reason (Thai choices). Step 2 (optional): rewrite one practice sentence.
 * Every failure collapses to a short message; the report above is never affected.
 */
export function WeaknessDrill({ source }: { source: DrillSource }) {
  const [drill, setDrill] = useState<DrillView | null>(null);
  const [loading, setLoading] = useState(false);
  const [gone, setGone] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [pickError, setPickError] = useState("");
  const [text, setText] = useState("");
  const [rewriteError, setRewriteError] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  if (gone) return null;

  async function open() {
    setLoading(true);
    const r = await post<{ drill?: DrillView; unavailable?: boolean }>("/api/weakness-drill/start", source);
    setLoading(false);
    if (!r.ok || !r.data?.drill) {
      setGone(true);
      return;
    }
    setDrill(r.data.drill);
    if (r.data.drill.rewrite.text && !r.data.drill.rewrite.passed) setText(r.data.drill.rewrite.text);
  }

  async function submitPick() {
    if (!drill) return;
    if (!picked) {
      setPickError("เลือกคำตอบก่อนนะครับ");
      return;
    }
    setBusy(true);
    const r = await post<{ drill?: DrillView }>("/api/weakness-drill/answer", {
      drillId: drill.drillId,
      choiceId: picked,
    });
    setBusy(false);
    if (!r.ok || !r.data?.drill) {
      setPickError("บันทึกคำตอบไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    setDrill(r.data.drill);
  }

  async function submitRewrite() {
    if (!drill) return;
    if (text.trim().split(/\s+/).filter(Boolean).length < 3) {
      setRewriteError("เขียนเป็นประโยคเต็มก่อนนะครับ");
      return;
    }
    setBusy(true);
    setHint("");
    const r = await post<{ passed?: boolean; hintTh?: string; drill?: DrillView; error?: string }>(
      "/api/weakness-drill/rewrite",
      { drillId: drill.drillId, text },
    );
    setBusy(false);
    if (!r.ok || !r.data?.drill) {
      setRewriteError(r.data?.error === "No attempts left" ? "ครบจำนวนครั้งแล้ว" : "ตรวจประโยคไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    setDrill(r.data.drill);
    setHint(r.data.hintTh ?? "");
  }

  if (!drill) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={open}
          disabled={loading}
          className="rounded-sm border-2 border-black bg-amber-300 px-3 py-1.5 text-xs font-black shadow-[2px_2px_0_0_#000] disabled:opacity-60"
        >
          {loading ? "กำลังเตรียมแบบฝึก…" : "🎯 ฝึกแก้นิสัยนี้ (ฟรี ไม่เสียเครดิต)"}
        </button>
      </div>
    );
  }

  const a = drill.answered;
  return (
    <div className="mt-3 rounded-sm border-2 border-black bg-white p-3 text-sm">
      <p className="text-xs font-black">ขั้นที่ 1 · ทำไมประโยคนี้ผิด?</p>
      <div className="mt-2 space-y-1.5">
        {drill.choices.map((c) => {
          const isCorrect = a && c.id === a.correctChoiceId;
          const isWrongPick = a && c.id === a.choiceId && !a.correct;
          const isSelected = !a && picked === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={Boolean(a)}
              onClick={() => {
                setPicked(c.id);
                setPickError("");
              }}
              className={`block w-full rounded-sm border-2 px-3 py-2 text-left text-sm ${
                isCorrect
                  ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-900"
                  : isWrongPick
                    ? "border-red-600 bg-red-50 text-red-900"
                    : isSelected
                      ? "border-[#004AAD] bg-blue-50 font-bold"
                      : "border-neutral-300 bg-white"
              }`}
            >
              {c.text}
            </button>
          );
        })}
      </div>
      {!a ? (
        <>
          {pickError ? <p className="mt-1.5 text-xs text-red-700">{pickError}</p> : null}
          <button
            type="button"
            onClick={submitPick}
            disabled={busy}
            className="mt-2 rounded-sm border-2 border-black bg-[#004AAD] px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
          >
            ตรวจคำตอบ
          </button>
        </>
      ) : (
        <p className={`mt-2 text-xs ${a.correct ? "text-emerald-800" : "text-amber-900"}`}>
          {a.correct ? "ถูกต้อง! " : "ยังไม่ใช่ครับ — "}
          {a.explanationTh}
        </p>
      )}

      {a ? (
        <div className="mt-4 border-t-2 border-dashed border-neutral-300 pt-3">
          <p className="text-xs font-black">ขั้นที่ 2 · ลองเขียนเอง (ไม่บังคับ)</p>
          <p className="mt-1 text-sm font-semibold">{drill.stemEn}</p>
          {drill.stemTh ? <p className="text-xs text-neutral-600">{drill.stemTh}</p> : null}
          {drill.rewrite.passed ? (
            <p className="mt-2 rounded-sm bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-900">
              ✅ เขียนถูกแล้ว: “{drill.rewrite.text}”
            </p>
          ) : drill.rewrite.attemptsLeft === 0 ? (
            <p className="mt-2 text-xs text-neutral-600">ใช้ครบ {drill.rewrite.attempts} ครั้งแล้ว ไว้ลองใหม่ในรายงานครั้งถัดไปนะครับ</p>
          ) : (
            <>
              <input
                type="text"
                value={text}
                maxLength={300}
                onChange={(e) => {
                  setText(e.target.value);
                  setRewriteError("");
                }}
                placeholder="Type one full English sentence"
                className="mt-2 w-full rounded-sm border-2 border-black px-2 py-1.5 text-sm"
              />
              {rewriteError ? <p className="mt-1 text-xs text-red-700">{rewriteError}</p> : null}
              {hint ? <p className="mt-1 text-xs text-amber-900">{hint}</p> : null}
              <button
                type="button"
                onClick={submitRewrite}
                disabled={busy}
                className="mt-2 rounded-sm border-2 border-black bg-[#004AAD] px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
              >
                {busy ? "กำลังตรวจ…" : `ตรวจประโยค (เหลือ ${drill.rewrite.attemptsLeft} ครั้ง)`}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
