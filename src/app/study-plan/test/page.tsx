"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { pickRecorderMimeType, blobToBase64Data } from "@/lib/media-recording-helpers";
import { scoreReading, scoreListening, scoreWriting, buildReport, type SkillResult } from "@/lib/study-plan/diagnostic";
import { generatePlan } from "@/lib/study-plan/plan";
import {
  TARGET_OPTIONS, BAKERY_SEGMENTS, BAKERY_BLANKS, bakeryRemLen, assembleBakery,
  PASSAGE_P1, PASSAGE_P3, PASSAGE_Q2_PROMPT, highlightRangeOk,
  PASSAGE_Q1, PASSAGE_Q3, PASSAGE_Q4, passageAnswersFrom,
  DICTATION, dictationAccuracy, WRITING_EX1, WRITING_EX2, writeItemsFrom,
} from "@/lib/study-plan/content-data";
import DiagnosticReportView from "@/components/study-plan/DiagnosticReportView";
import StudyPlanView from "@/components/study-plan/StudyPlanView";

const NAVY = "#004AAD";
const INK = "#0f172a";
const noAuto = { autoCorrect: "off" as const, autoCapitalize: "off" as const, spellCheck: false, autoComplete: "off" };

// ── Pro Console tokens ────────────────────────────────────────────────
const SANS = "'IBM Plex Sans Thai', system-ui, sans-serif";
const pcCard: React.CSSProperties = {
  background: "#fff", border: "1px solid #e6ebf3", borderRadius: 24, padding: "20px 18px",
  fontFamily: SANS, boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 24px 48px -32px rgba(16,40,90,.28)",
};

// Per-step identity (skill chip + progress colour). Steps 0..6 are answering steps; 7 = report.
const SKILL: Record<number, { th: string; en: string; bg: string; fg: string; bar: string }> = {
  0: { th: "เริ่มต้น", en: "Start", bg: "#eef2f8", fg: "#475569", bar: "#94a3b8" },
  1: { th: "การอ่าน", en: "Reading", bg: "#e6f1fb", fg: "#0c447c", bar: NAVY },
  2: { th: "การอ่าน", en: "Reading", bg: "#e6f1fb", fg: "#0c447c", bar: NAVY },
  3: { th: "การฟัง", en: "Listening", bg: "#e1f5ee", fg: "#0f6e56", bar: "#1d9e75" },
  4: { th: "การเขียน", en: "Writing", bg: "#efedfe", fg: "#3c3489", bar: "#534ab7" },
  5: { th: "การเขียน", en: "Writing", bg: "#efedfe", fg: "#3c3489", bar: "#534ab7" },
  6: { th: "การพูด", en: "Speaking", bg: "#fbeaf0", fg: "#993556", bar: "#d4537e" },
};
const TOTAL = 7;

// ── Celebration audio (Web Audio, no assets). Unlocked by the tap that advances. ──
let _ac: AudioContext | null = null;
function actx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!_ac) _ac = new AC();
    if (_ac.state === "suspended") void _ac.resume();
    return _ac;
  } catch { return null; }
}
function blip(freq: number, at: number, dur: number, gain = 0.11, type: OscillatorType = "sine") {
  const ctx = actx(); if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.03);
}
function soundAdvance() { blip(660, 0, 0.16, 0.09); blip(988, 0.05, 0.18, 0.07, "triangle"); }
function soundCelebrate() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C-E-G-C bell arpeggio
  notes.forEach((f, i) => { blip(f, i * 0.11, 0.55, 0.10, "triangle"); blip(f * 2, i * 0.11, 0.32, 0.03); });
  blip(1568, 0.5, 0.7, 0.05, "sine");
}

function PrimaryBtn({ children, onClick, disabled, full }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; full?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled} className="pc-press"
      style={{
        flex: full ? 1 : undefined, background: disabled ? "#cbd5e1" : NAVY, color: "#fff", border: "none",
        borderRadius: 16, padding: "14px 22px", fontSize: 15, fontWeight: 600, cursor: disabled ? "default" : "pointer",
        fontFamily: SANS, boxShadow: disabled ? "none" : "0 10px 22px -10px rgba(0,74,173,.6)",
        transition: "transform .12s ease, background .2s ease",
      }}
    >
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="pc-press" style={{ background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: SANS, transition: "transform .12s ease" }}>
      {children}
    </button>
  );
}

function Chip({ step }: { step: number }) {
  const s = SKILL[step] ?? SKILL[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ background: s.bg, color: s.fg, borderRadius: 9, padding: "4px 10px", fontSize: 11, fontWeight: 600, letterSpacing: ".02em" }}>{s.th}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#94a3b8" }}>ส่วนที่ {step === 0 ? 1 : step} / {TOTAL}</span>
    </div>
  );
}

function Options({ q, value, onChange }: { q: { options: string[] }; value: number | null; onChange: (i: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
      {q.options.map((opt, i) => (
        <button key={i} onClick={() => onChange(i)} className="pc-press" style={{ textAlign: "left", border: value === i ? `2px solid ${NAVY}` : "1.5px solid #e2e8f0", background: value === i ? "#eef4ff" : "#fff", borderRadius: 14, padding: "12px 14px", fontSize: 13.5, cursor: "pointer", fontFamily: SANS, color: INK, transition: "transform .1s ease, border-color .15s ease, background .15s ease" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// Letter-box blank matching the practice FITB UI: blue prefix + one box per missing letter.
function LetterBlank({ prefix, remLen, value, onChange }: { prefix: string; remLen: number; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: "middle", margin: "0 4px", whiteSpace: "nowrap" }}>
      <span style={{ fontWeight: 700, color: NAVY }}>{prefix}</span>
      <span style={{ position: "relative", display: "inline-flex" }}>
        <input
          ref={ref} value={value} maxLength={remLen} {...noAuto}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, ""))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", border: "none" }}
          aria-label={`เติมตัวอักษรที่เหลือ (${remLen} ตัว)`}
        />
        <span onClick={() => ref.current?.focus()} style={{ display: "inline-flex", gap: 4, cursor: "text" }} aria-hidden>
          {Array.from({ length: remLen }, (_, k) => (
            <span key={k} style={{ width: 26, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 15, fontWeight: 700, color: value[k] ? "#fff" : INK, border: value[k] ? `1.5px solid ${NAVY}` : "1.5px dashed #cbd5e1", background: value[k] ? NAVY : "#f8fafc", transition: "all .12s ease" }}>
              {value[k] ?? ""}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

export default function DiagnosticTestPage() {
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [fillIn, setFillIn] = useState<string[]>(Array(9).fill(""));
  const [pSel, setPSel] = useState<{ q1: number | null; q3: number | null; q4: number | null }>({ q1: null, q3: null, q4: null });
  const [hlA, setHlA] = useState<number | null>(null);
  const [hlB, setHlB] = useState<number | null>(null);
  const [dict, setDict] = useState<string[]>(["", "", ""]);
  const [ex1, setEx1] = useState<(number | null)[]>(Array(6).fill(null));
  const [ex2, setEx2] = useState<(number | null)[]>(Array(6).fill(null));
  const [speakResult, setSpeakResult] = useState<SkillResult | null>(null);
  const [saved, setSaved] = useState<{ id: string; freeUser: boolean } | null>(null);
  const [freeUser, setFreeUser] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [replays, setReplays] = useState<number[]>([0, 0, 0]);
  const [resultReady, setResultReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const audioCache = useRef<Record<number, string>>({});
  const savedOnce = useRef(false);

  // Q2 highlight: click the first + last word of the supporting span (paraphrase probe).
  const p1words = useMemo(() => PASSAGE_P1.split(/\s+/), []);
  const highlightOk = useMemo(() => highlightRangeOk(p1words, hlA, hlB), [p1words, hlA, hlB]);
  const hlLo = hlA === null ? null : Math.min(hlA, hlB ?? hlA);
  const hlHi = hlA === null ? null : Math.max(hlA, hlB ?? hlA);
  const clickWord = (i: number) => {
    if (hlA === null || hlB !== null) { setHlA(i); setHlB(null); }
    else setHlB(i);
  };

  const report = useMemo(() => {
    if (step < 7) return null;
    const skills: SkillResult[] = [
      scoreReading(assembleBakery(fillIn), passageAnswersFrom(pSel, highlightOk)),
      scoreListening([dictationAccuracy(dict[0], DICTATION[0]), dictationAccuracy(dict[1], DICTATION[1]), dictationAccuracy(dict[2], DICTATION[2])]),
      scoreWriting(writeItemsFrom(WRITING_EX1, ex1), writeItemsFrom(WRITING_EX2, ex2)),
      ...(speakResult ? [speakResult] : []),
    ];
    return buildReport(skills, target ?? 120);
  }, [step, fillIn, pSel, highlightOk, dict, ex1, ex2, speakResult, target]);

  useEffect(() => {
    if (step !== 7 || !report || savedOnce.current) return;
    savedOnce.current = true;
    (async () => {
      try {
        const r = await fetch("/api/study-plan/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: report.target, predicted: report.predicted, report }) });
        const j = await r.json();
        if (r.ok) { setSaved({ id: j.id, freeUser: j.freeUser }); setFreeUser(j.freeUser); }
        else if (r.status === 401) setNeedsAuth(true);
      } catch {}
    })();
  }, [step, report]);

  // Soft chime on each advance (celebration fires when the processing screen hits 100%).
  useEffect(() => {
    if (step === 0 || step === 7) return;
    soundAdvance();
  }, [step]);

  // Processing screen: animate 0→100% before revealing the report, then celebrate.
  useEffect(() => {
    if (step !== 7) { setResultReady(false); setLoadPct(0); return; }
    let raf = 0;
    const start = performance.now();
    const DUR = 3600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setLoadPct(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else { setResultReady(true); soundCelebrate(); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const speak = (text: string) => { try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {} };

  // Real TTS for dictation via /api/speech-synthesize, capped at 3 plays/sentence.
  const playDict = async (i: number) => {
    if (replays[i] >= 3) return;
    setReplays((r) => r.map((v, k) => (k === i ? v + 1 : v)));
    try {
      let url = audioCache.current[i];
      if (!url) {
        const res = await fetch("/api/speech-synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: DICTATION[i], provider: "deepgram" }) });
        const j = (await res.json().catch(() => ({}))) as { audioBase64?: string; mimeType?: string };
        if (res.ok && j.audioBase64) { url = `data:${j.mimeType || "audio/mpeg"};base64,${j.audioBase64}`; audioCache.current[i] = url; }
      }
      if (url) { void new Audio(url).play(); return; }
    } catch {}
    speak(DICTATION[i]); // fallback to browser TTS if the service is unavailable
  };

  const next = () => { actx(); setStep((s) => s + 1); };
  const back = () => { actx(); setStep((s) => Math.max(0, s - 1)); };
  const guardedNext = (incomplete: number) => {
    if (incomplete > 0 && !window.confirm(`ยังไม่ได้ตอบ ${incomplete} ข้อ — ข้ามไปเลยหรือไม่?`)) return;
    next();
  };

  // ── Processing screen (0→100%) before the report reveals ──
  if (step === 7 && !resultReady) {
    return <ProcessingScreen pct={loadPct} />;
  }

  // ── The final report is its own celebratory screen (no test chrome) ──
  if (step === 7 && report) {
    return (
      <main style={{ minHeight: "100vh", background: "#eef2f8", padding: "24px 14px 48px", fontFamily: SANS }}>
        <style>{PC_CSS}</style>
        <div key="report" className="pc-in" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "center", marginBottom: 2 }}>
            <div style={{ fontSize: 34 }} aria-hidden>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>ทำแบบทดสอบครบแล้ว!</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>นี่คือผลและแผนเรียนเฉพาะคุณ</div>
          </div>
          {saved && (
            <div style={{ ...pcCard, maxWidth: 360, padding: "12px 16px", borderRadius: 16, fontSize: 13, color: "#0f6e56", background: "#eafaf3", border: "1px solid #b7e4cf", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, boxShadow: "none" }}>
              <span>✓ บันทึกผลแล้ว</span>
              <a href={`/study-plan/result/${saved.id}`} style={{ color: NAVY, textDecoration: "none", fontWeight: 600 }}>เปิดดูภายหลัง →</a>
            </div>
          )}
          {needsAuth && (
            <div style={{ ...pcCard, maxWidth: 360, padding: "14px 16px", borderRadius: 16, fontSize: 13, background: "#fff7df", border: "1px solid #ffe18a", color: "#5a4600", textAlign: "center", boxShadow: "none" }}>
              สมัครหรือเข้าสู่ระบบเพื่อบันทึกแผนนี้ไว้ดูภายหลัง
              <a href="/login" style={{ display: "block", marginTop: 8, color: NAVY, fontWeight: 600, textDecoration: "none" }}>เข้าสู่ระบบ / สมัคร →</a>
            </div>
          )}
          <DiagnosticReportView report={report} />
          <StudyPlanView plan={generatePlan(report, { freeUser })} freeUser={freeUser} />
        </div>
      </main>
    );
  }

  // ── Bottom-bar navigation config for the current answering step ──
  const fillIncomplete = BAKERY_BLANKS.filter((_, i) => (fillIn[i] ?? "").trim().length < bakeryRemLen(i)).length;
  const passageIncomplete = [pSel.q1, pSel.q3, pSel.q4].filter((v) => v === null).length + (hlA === null || hlB === null ? 1 : 0);
  const dictIncomplete = dict.filter((v) => !v.trim()).length;
  const writeIncomplete = (step === 4 ? ex1 : ex2).filter((v) => v === null).length;

  let nav: { label: string; disabled?: boolean; onClick: () => void; back: boolean } | null = null;
  if (step === 0) nav = { label: "เริ่มทำแบบทดสอบ →", disabled: target === null, onClick: next, back: false };
  else if (step === 1) nav = { label: "ถัดไป →", onClick: () => guardedNext(fillIncomplete), back: true };
  else if (step === 2) nav = { label: "ถัดไป →", onClick: () => guardedNext(passageIncomplete), back: true };
  else if (step === 3) nav = { label: "ถัดไป →", onClick: () => guardedNext(dictIncomplete), back: true };
  else if (step === 4 || step === 5) nav = { label: "ถัดไป →", onClick: () => guardedNext(writeIncomplete), back: true };

  const wide = step === 2;

  return (
    <main style={{ minHeight: "100dvh", background: "#eef2f8", fontFamily: SANS, display: "flex", flexDirection: "column" }}>
      <style>{PC_CSS}</style>

      {/* sticky progress header */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(238,242,248,.88)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: wide ? 860 : 480, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/practice" aria-label="ออก" style={{ color: "#94a3b8", fontSize: 20, textDecoration: "none", lineHeight: 1 }}>×</a>
          <div style={{ display: "flex", flex: 1, gap: 4 }}>
            {Array.from({ length: TOTAL }, (_, i) => {
              const done = i < step; const cur = i === step;
              const col = done || cur ? (SKILL[i]?.bar ?? NAVY) : "#dbe3ee";
              return <span key={i} className={cur ? "pc-seg-cur" : undefined} style={{ height: 6, flex: cur ? 1.6 : 1, borderRadius: 99, background: col, transition: "flex .35s ease, background .35s ease" }} />;
            })}
          </div>
          <Chip step={step} />
        </div>
      </header>

      {/* scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px 112px" }}>
        <div key={step} className="pc-in" style={{ maxWidth: wide ? 860 : 480, margin: "0 auto" }}>

          {step === 0 && (
            <div style={pcCard}>
              <Chip step={0} />
              <h2 style={{ margin: "12px 0 6px", fontSize: 21, fontWeight: 600, color: INK }}>คุณอยากได้คะแนน DET เท่าไหร่?</h2>
              <p style={{ margin: "0 0 16px", fontSize: 13.5, lineHeight: 1.6, color: "#64748b" }}>แบบทดสอบนี้ใช้เวลาประมาณ 15 นาที วัด 4 ทักษะ แล้วเราจะสร้างแผนเรียนเฉพาะคุณ</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {TARGET_OPTIONS.map((o) => (
                  <button key={o.target} onClick={() => setTarget(o.target)} className="pc-press" style={{ border: target === o.target ? `2px solid ${NAVY}` : "1.5px solid #e2e8f0", background: target === o.target ? "#eef4ff" : "#fff", borderRadius: 14, padding: "12px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: SANS, color: INK, transition: "transform .1s ease" }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={pcCard}>
              <Chip step={1} />
              <h2 style={{ margin: "12px 0 4px", fontSize: 21, fontWeight: 600 }}>อ่าน: เติมคำในช่องว่าง</h2>
              <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#64748b" }}>พิมพ์ตัวอักษรที่เหลือต่อจากตัวอักษรสีน้ำเงิน — หนึ่งช่องต่อหนึ่งตัวอักษร</p>
              <div style={{ background: "#f8fafc", borderRadius: 16, padding: "16px 14px" }}>
                <p style={{ fontSize: 16, lineHeight: 2.9, color: INK, margin: 0 }}>
                  {BAKERY_SEGMENTS.map((seg, i) =>
                    typeof seg === "string" ? <span key={i}>{seg}</span> : (
                      <LetterBlank key={i} prefix={BAKERY_BLANKS[seg.blank].prefix} remLen={bakeryRemLen(seg.blank)} value={fillIn[seg.blank]} onChange={(v) => setFillIn((f) => f.map((x, k) => (k === seg.blank ? v : x)))} />
                    ),
                  )}
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={pcCard}>
              <Chip step={2} />
              <h2 style={{ margin: "12px 0 12px", fontSize: 21, fontWeight: 600 }}>อ่าน: บทความ</h2>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                {/* Left — passage */}
                <div style={{ flex: "1 1 320px", minWidth: 260 }}>
                  <p style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", margin: "0 0 8px" }}>ข้อ 2: คลิก<b>คำแรก</b>และ<b>คำสุดท้าย</b>ของส่วนที่ตอบ (ในย่อหน้าแรก)</p>
                  <div style={{ fontSize: 14.5, lineHeight: 2, color: INK }}>
                    {p1words.map((w, i) => {
                      const sel = hlLo !== null && hlHi !== null && i >= hlLo && i <= hlHi;
                      const edge = i === hlA || i === hlB;
                      return (
                        <span key={i} onClick={() => clickWord(i)} style={{ cursor: "pointer", background: sel ? "#fff3bf" : "transparent", borderRadius: 4, padding: "1px 1px", boxShadow: edge ? "inset 0 -2px 0 #d8a200" : "none" }}>{w}{" "}</span>
                      );
                    })}
                  </div>
                  {pSel.q1 === null ? (
                    <p style={{ fontSize: 13, color: "#94a3b8" }}>— ย่อหน้า 2 หายไป (ตอบข้อ 1 เพื่อเติม) —</p>
                  ) : (
                    <p style={{ fontSize: 14, lineHeight: 1.8, color: INK, background: "#eafaf3", borderLeft: "3px solid #1d9e75", padding: "8px 12px", borderRadius: 8 }}>
                      {PASSAGE_Q1.options[PASSAGE_Q1.correct].replace(/^[A-D]\)\s*/, "")}
                    </p>
                  )}
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: INK }}>{PASSAGE_P3}</p>
                </div>
                {/* Right — questions */}
                <div style={{ flex: "1 1 320px", minWidth: 260 }}>
                  <div>
                    <b style={{ fontSize: 14 }}>{PASSAGE_Q1.id}. {PASSAGE_Q1.prompt}</b>
                    <div style={{ fontSize: 11, color: "#993c1d", fontStyle: "italic", marginTop: 2 }}>คลิกแล้วไม่สามารถแก้ได้</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                      {PASSAGE_Q1.options.map((opt, i) => {
                        const answered = pSel.q1 !== null;
                        const isChosen = pSel.q1 === i;
                        const isCorrect = i === PASSAGE_Q1.correct;
                        let border = "1.5px solid #e2e8f0", bg = "#fff", color = INK;
                        if (answered) {
                          if (isCorrect) { border = "2px solid #1d9e75"; bg = "#eafaf3"; color = "#0f6e56"; }
                          else if (isChosen) { border = "2px solid #D85A30"; bg = "#fdeeeb"; color = "#993c1d"; }
                          else { color = "#9aa1ad"; }
                        } else if (isChosen) { border = `2px solid ${NAVY}`; bg = "#eef4ff"; }
                        return (
                          <button key={i} disabled={answered} onClick={() => pSel.q1 === null && setPSel((s) => ({ ...s, q1: i }))} className="pc-press"
                            style={{ textAlign: "left", border, background: bg, borderRadius: 14, padding: "12px 14px", fontSize: 13, cursor: answered ? "default" : "pointer", fontFamily: SANS, color, transition: "transform .1s ease" }}>
                            {opt}{answered && isCorrect ? "  ✓" : answered && isChosen ? "  ✗" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}><b style={{ fontSize: 14 }}>2. {PASSAGE_Q2_PROMPT}</b> <span style={{ fontSize: 12, color: hlA !== null && hlB !== null ? "#0f6e56" : "#94a3b8" }}>{hlA !== null && hlB !== null ? "✓ เลือกส่วนแล้ว" : "(คลิกคำแรกและคำสุดท้ายด้านซ้าย)"}</span></div>
                  <div style={{ marginTop: 16 }}><b style={{ fontSize: 14 }}>{PASSAGE_Q3.id}. {PASSAGE_Q3.prompt}</b><Options q={PASSAGE_Q3} value={pSel.q3} onChange={(i) => setPSel((s) => ({ ...s, q3: i }))} /></div>
                  <div style={{ marginTop: 16 }}><b style={{ fontSize: 14 }}>{PASSAGE_Q4.id}. {PASSAGE_Q4.prompt}</b><Options q={PASSAGE_Q4} value={pSel.q4} onChange={(i) => setPSel((s) => ({ ...s, q4: i }))} /></div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={pcCard}>
              <Chip step={3} />
              <h2 style={{ margin: "12px 0 4px", fontSize: 21, fontWeight: 600 }}>ฟัง: เขียนตามคำบอก</h2>
              <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#64748b" }}>กดฟัง (ฟังได้สูงสุด 3 ครั้งต่อประโยค) แล้วพิมพ์ประโยคที่ได้ยินให้ครบทุกคำ สะกดให้ถูกต้อง</p>
              {DICTATION.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <button data-no-sfx onClick={() => playDict(i)} disabled={replays[i] >= 3} className="pc-press" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: replays[i] >= 3 ? "#eef0f3" : "#e7eefb", color: replays[i] >= 3 ? "#999" : NAVY, border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 500, cursor: replays[i] >= 3 ? "default" : "pointer", fontFamily: SANS, transition: "transform .1s ease" }}>▶ ฟังประโยค {i + 1} (เหลือ {Math.max(0, 3 - replays[i])} ครั้ง)</button>
                  <textarea {...noAuto} value={dict[i]} onChange={(e) => setDict((d) => d.map((v, k) => (k === i ? e.target.value : v)))} rows={2} style={{ width: "100%", boxSizing: "border-box", marginTop: 8, border: "1.5px solid #e2e8f0", borderRadius: 14, padding: 12, fontSize: 14, fontFamily: SANS, resize: "vertical" }} placeholder="พิมพ์สิ่งที่ได้ยิน…" />
                </div>
              ))}
            </div>
          )}

          {(step === 4 || step === 5) && (() => {
            const ex = step === 4 ? WRITING_EX1 : WRITING_EX2;
            const sel = step === 4 ? ex1 : ex2;
            const setSel = step === 4 ? setEx1 : setEx2;
            return (
              <div style={pcCard}>
                <Chip step={step} />
                <h2 style={{ margin: "12px 0 8px", fontSize: 21, fontWeight: 600 }}>เขียน: {ex.title}</h2>
                <div style={{ background: "#f8fafc", borderRadius: 16, padding: "14px 16px", marginBottom: 4 }}>
                  <p style={{ fontSize: 14.5, lineHeight: 1.9, color: INK, margin: 0 }}>{ex.passage}</p>
                </div>
                {ex.questions.map((q, i) => (
                  <div key={q.n} style={{ marginTop: 14 }}><b style={{ fontSize: 14 }}>{q.n}.</b><Options q={q} value={sel[i]} onChange={(v) => setSel((arr) => arr.map((x, k) => (k === i ? v : x)))} /></div>
                ))}
              </div>
            );
          })()}

          {step === 6 && (
            <SpeakingStep
              onDone={(r) => { setSpeakResult(r); next(); }}
              onSkip={() => next()}
              onBack={back}
              speak={() => speak("Describe your favorite travel experience.")}
            />
          )}
        </div>
      </div>

      {/* sticky bottom action bar (steps 0–5; speaking has its own) */}
      {nav && (
        <div style={{ position: "sticky", bottom: 0, zIndex: 30, background: "rgba(255,255,255,.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderTop: "1px solid #e6ebf3" }}>
          <div style={{ maxWidth: wide ? 860 : 480, margin: "0 auto", padding: "12px 14px calc(12px + env(safe-area-inset-bottom))", display: "flex", gap: 10 }}>
            {nav.back && <GhostBtn onClick={back}>ย้อนกลับ</GhostBtn>}
            <PrimaryBtn onClick={nav.onClick} disabled={nav.disabled} full>{nav.label}</PrimaryBtn>
          </div>
        </div>
      )}
    </main>
  );
}

function ProcessingScreen({ pct }: { pct: number }) {
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const STEPS = [
    { at: 22, th: "ตรวจคำตอบของคุณ" },
    { at: 48, th: "วิเคราะห์ 4 ทักษะ (อ่าน · ฟัง · เขียน · พูด)" },
    { at: 76, th: "คำนวณคะแนน DET ที่คาดการณ์" },
    { at: 100, th: "สร้างแผนเรียนเฉพาะคุณ" },
  ];
  const msg = STEPS.find((s) => pct < s.at)?.th ?? "เสร็จแล้ว!";
  return (
    <main style={{ minHeight: "100dvh", background: "#eef2f8", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 18px" }}>
      <style>{PC_CSS}</style>
      <div className="pc-in" style={{ ...pcCard, width: "100%", maxWidth: 400, textAlign: "center", padding: "30px 22px" }}>
        <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="70" cy="70" r={R} fill="none" stroke="#e6ebf3" strokeWidth="10" />
            <circle cx="70" cy="70" r={R} fill="none" stroke={NAVY} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .2s linear" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{pct}<span style={{ fontSize: 16 }}>%</span></span>
          </div>
        </div>
        <h2 style={{ margin: "18px 0 4px", fontSize: 19, fontWeight: 600, color: INK }}>กำลังประมวลผลแบบทดสอบ</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "#64748b", minHeight: 20 }}>{msg}…</p>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          {STEPS.map((s) => {
            const done = pct >= s.at;
            const active = !done && pct >= (STEPS[STEPS.indexOf(s) - 1]?.at ?? 0);
            return (
              <div key={s.at} style={{ display: "flex", alignItems: "center", gap: 10, opacity: done || active ? 1 : 0.4, transition: "opacity .3s ease" }}>
                <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: done ? "#eafaf3" : "#eef2f8", color: done ? "#1d9e75" : "#94a3b8", fontSize: 12, border: active ? `2px solid ${NAVY}` : "none" }} className={active ? "pc-seg-cur" : undefined}>
                  {done ? "✓" : "•"}
                </span>
                <span style={{ fontSize: 13, color: done ? INK : "#64748b" }}>{s.th}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function SpeakingStep({ onDone, onSkip, onBack, speak }: { onDone: (r: SkillResult) => void; onSkip: () => void; onBack: () => void; speak: () => void }) {
  const [phase, setPhase] = useState<"idle" | "recording" | "transcribing" | "ready">("idle");
  const [transcript, setTranscript] = useState("");
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveRef = useRef("");
  // Typing into the transcript is a dev-only backdoor — a real speaking test must be mic-only.
  const allowTyping = process.env.NODE_ENV !== "production";

  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { mediaRef.current?.stop(); } catch {}
    try { recogRef.current?.stop(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
  };

  const start = async () => {
    setErr(null); setTranscript(""); setLive(""); liveRef.current = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecorderMimeType();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = onStop;
      mediaRef.current = mr;
      mr.start();
      // Best-effort live browser transcription (raw — never grammar-corrected).
      const SR = (window as unknown as { webkitSpeechRecognition?: new () => never; SpeechRecognition?: new () => never }).webkitSpeechRecognition
        ?? (window as unknown as { SpeechRecognition?: new () => never }).SpeechRecognition;
      if (SR) {
        const r = new (SR as unknown as { new (): { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; start: () => void; stop: () => void } })();
        r.lang = "en-US"; r.continuous = true; r.interimResults = true;
        r.onresult = (ev) => { let s = ""; for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript + " "; liveRef.current = s.trim(); setLive(liveRef.current); };
        r.start(); recogRef.current = r;
      }
      setPhase("recording");
      setSecondsLeft(90);
      timerRef.current = setInterval(() => setSecondsLeft((s) => { if (s <= 1) { stop(); return 0; } return s - 1; }), 1000);
    } catch {
      setErr(allowTyping ? "เปิดไมโครโฟนไม่ได้ — อนุญาตการใช้ไมค์ หรือพิมพ์บทพูดด้านล่างเพื่อทดสอบ" : "เปิดไมโครโฟนไม่ได้ — กรุณาอนุญาตการใช้ไมโครโฟน");
    }
  };

  const onStop = async () => {
    setPhase("transcribing");
    try {
      const mime = mediaRef.current?.mimeType || "audio/webm";
      const audioBase64 = await blobToBase64Data(new Blob(chunksRef.current, { type: mime }));
      const r = await fetch("/api/study-plan/transcribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ audioBase64, mimeType: mime }) });
      const j = await r.json();
      if (r.ok && typeof j.transcript === "string" && j.transcript.trim()) {
        setTranscript(j.transcript);
      } else {
        setTranscript(liveRef.current);
        if (!r.ok) setErr("ถอดเสียงอัตโนมัติไม่สำเร็จ — ใช้บทถอดเสียงจากเบราว์เซอร์แทน หรือพิมพ์เพิ่มเองได้");
      }
    } catch {
      setTranscript(liveRef.current);
      setErr("ถอดเสียงไม่สำเร็จ — ใช้บทจากเบราว์เซอร์ หรือพิมพ์เอง");
    }
    setPhase("ready");
  };

  const grade = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/study-plan/speaking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "grade_failed");
      onDone(j.result as SkillResult);
    } catch {
      setErr("ตรวจคะแนนการพูดไม่สำเร็จ — กรุณาลองอีกครั้ง หรือพูดใหม่ให้ครบ ~90 วินาที");
    } finally { setBusy(false); }
  };

  const wc = transcript.trim().split(/\s+/).filter(Boolean).length;
  const recording = phase === "recording";

  return (
    <div style={pcCard}>
      <Chip step={6} />
      <h2 style={{ margin: "12px 0 4px", fontSize: 21, fontWeight: 600 }}>พูด: เล่าประสบการณ์ท่องเที่ยว</h2>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, lineHeight: 1.6, color: "#64748b" }}>กดฟังโจทย์ แล้วกดอัดเสียงพูดประมาณ 90 วินาที — พูดให้เป็นธรรมชาติ พูดต่อเนื่องอย่างน้อย 15 คำ แล้วกดส่งเพื่อรับคะแนน</p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0 4px" }}>
        <button data-no-sfx onClick={speak} className="pc-press" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e7eefb", color: NAVY, border: "none", borderRadius: 12, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: SANS }}>▶ ฟังโจทย์</button>
        <button
          onClick={recording ? stop : start} disabled={phase === "transcribing"} className={`pc-press${recording ? " pc-rec" : ""}`}
          aria-label={recording ? "หยุดอัดเสียง" : "เริ่มอัดเสียง"}
          style={{ width: 84, height: 84, borderRadius: "50%", border: "none", cursor: "pointer", background: recording ? "#e24b4a" : NAVY, color: "#fff", fontSize: 30, display: "grid", placeItems: "center", boxShadow: recording ? "0 0 0 8px rgba(226,75,74,.18)" : "0 14px 30px -12px rgba(0,74,173,.7)", transition: "transform .12s ease, background .2s ease" }}
        >
          {recording ? "■" : "●"}
        </button>
        <div style={{ fontSize: 13, fontWeight: 500, color: recording ? "#993c1d" : "#64748b", minHeight: 18 }}>
          {recording ? `● กำลังอัด… เหลือ ${secondsLeft} วินาที` : phase === "transcribing" ? "กำลังถอดเสียง…" : phase === "ready" ? "อัดเสร็จแล้ว — ตรวจบทพูดด้านล่าง" : "แตะปุ่มเพื่อเริ่มอัดเสียง"}
        </div>
        {recording && live && <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", maxWidth: 320 }}>“{live}”</div>}
      </div>

      <textarea value={transcript} readOnly={!allowTyping} onChange={(e) => setTranscript(e.target.value)} rows={4} style={{ width: "100%", boxSizing: "border-box", marginTop: 12, border: "1.5px solid #e2e8f0", borderRadius: 14, padding: 12, fontSize: 14, fontFamily: SANS, background: allowTyping ? "#fff" : "#f8fafc" }} placeholder={allowTyping ? "บทถอดเสียงจะปรากฏที่นี่ (หรือพิมพ์เพื่อทดสอบ ≥ 15 คำ)" : "บทถอดเสียงจะปรากฏที่นี่หลังอัดเสียง"} />
      <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: wc >= 15 ? "#0f6e56" : "#94a3b8", marginTop: 4 }}>{wc} / 15 คำ</div>
      {err && <p style={{ color: "#993c1d", fontSize: 13, marginTop: 6 }}>{err}</p>}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <GhostBtn onClick={onBack}>ย้อนกลับ</GhostBtn>
        <button onClick={onSkip} className="pc-press" style={{ background: "#fff", color: "#94a3b8", border: "1px solid #e2e8f0", borderRadius: 16, padding: "14px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: SANS }}>ข้าม</button>
        <PrimaryBtn onClick={grade} disabled={busy || wc < 15} full>{busy ? "กำลังประเมิน…" : "ประเมิน + ดูผล →"}</PrimaryBtn>
      </div>
    </div>
  );
}

const PC_CSS = `
@keyframes pcIn { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
.pc-in { animation: pcIn .42s cubic-bezier(.22,.61,.36,1) both; }
.pc-press:active { transform: scale(.97); }
.pc-seg-cur { animation: pcPulse 1.4s ease-in-out infinite; }
@keyframes pcPulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
.pc-rec { animation: pcRec 1.1s ease-in-out infinite; }
@keyframes pcRec { 0%,100% { box-shadow: 0 0 0 8px rgba(226,75,74,.18); } 50% { box-shadow: 0 0 0 14px rgba(226,75,74,.08); } }
* { -webkit-tap-highlight-color: transparent; }
@media (prefers-reduced-motion: reduce) { .pc-in, .pc-seg-cur, .pc-rec { animation: none; } }
`;
