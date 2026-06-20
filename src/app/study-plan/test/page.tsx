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
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3e8f0", borderRadius: 14, padding: 16, fontFamily: "'IBM Plex Sans Thai', sans-serif" };
const noAuto = { autoCorrect: "off" as const, autoCapitalize: "off" as const, spellCheck: false, autoComplete: "off" };

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? "#9bb4d8" : NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 15, fontWeight: 500, cursor: disabled ? "default" : "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

function Options({ q, value, onChange }: { q: { options: string[] }; value: number | null; onChange: (i: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      {q.options.map((opt, i) => (
        <button key={i} onClick={() => onChange(i)} style={{ textAlign: "left", border: value === i ? `2px solid ${NAVY}` : "1px solid #dce4f0", background: value === i ? "#f4f8ff" : "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#1a1a2e" }}>
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
        <span onClick={() => ref.current?.focus()} style={{ display: "inline-flex", gap: 3, cursor: "text" }} aria-hidden>
          {Array.from({ length: remLen }, (_, k) => (
            <span key={k} style={{ width: 22, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 5, fontSize: 14, fontWeight: 600, color: "#1a1a2e", border: `1.5px solid ${value[k] ? "#9fc3a8" : "#dce4f0"}`, background: value[k] ? "#eafaf3" : "#f8fafc" }}>
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

  const speak = (text: string) => { try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {} };

  // Real TTS for dictation (Deepgram via /api/speech-synthesize), capped at 3 plays/sentence.
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

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));
  const guardedNext = (incomplete: number) => {
    if (incomplete > 0 && !window.confirm(`ยังไม่ได้ตอบ ${incomplete} ข้อ — ข้ามไปเลยหรือไม่?`)) return;
    next();
  };

  return (
    <main style={{ minHeight: "100vh", background: "#eef2f7", padding: "20px 14px", fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
      <div style={{ maxWidth: step === 2 ? 900 : step === 1 ? 600 : 420, margin: "0 auto" }}>
        {step < 7 && (
          <div style={{ fontSize: 12, color: "#5b6472", marginBottom: 8 }}>ขั้นตอน {step + 1} / 7 · ใช้เวลา ~15 นาที</div>
        )}

        {step === 0 && (
          <div style={card}>
            <h2 style={{ margin: "0 0 6px", fontSize: 18, color: "#1a1a2e" }}>คุณอยากได้คะแนน DET เท่าไหร่?</h2>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#5b6472" }}>แบบทดสอบนี้ใช้เวลาประมาณ 15 นาที วัด 4 ทักษะ แล้วเราจะสร้างแผนเรียนเฉพาะคุณ</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TARGET_OPTIONS.map((o) => (
                <button key={o.target} onClick={() => setTarget(o.target)} style={{ border: target === o.target ? `2px solid ${NAVY}` : "1px solid #dce4f0", background: target === o.target ? "#f4f8ff" : "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 14, cursor: "pointer", fontFamily: "inherit", color: "#1a1a2e" }}>
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16 }}><Btn onClick={next} disabled={target === null}>เริ่มทำแบบทดสอบ →</Btn></div>
          </div>
        )}

        {step === 1 && (
          <div style={card}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>อ่าน: เติมคำในช่องว่าง</h2>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#5b6472" }}>พิมพ์ตัวอักษรที่เหลือต่อจากตัวอักษรสีน้ำเงิน — หนึ่งช่องต่อหนึ่งตัวอักษร</p>
            <p style={{ fontSize: 16, lineHeight: 2.9, color: "#1a1a2e" }}>
              {BAKERY_SEGMENTS.map((seg, i) =>
                typeof seg === "string" ? <span key={i}>{seg}</span> : (
                  <LetterBlank key={i} prefix={BAKERY_BLANKS[seg.blank].prefix} remLen={bakeryRemLen(seg.blank)} value={fillIn[seg.blank]} onChange={(v) => setFillIn((f) => f.map((x, k) => (k === seg.blank ? v : x)))} />
                ),
              )}
            </p>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button onClick={back} style={{ ...card, padding: "11px 16px", cursor: "pointer" }}>ย้อนกลับ</button><Btn onClick={() => guardedNext(BAKERY_BLANKS.filter((_, i) => (fillIn[i] ?? "").trim().length < bakeryRemLen(i)).length)}>ถัดไป →</Btn></div>
          </div>
        )}

        {step === 2 && (
          <div style={card}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>อ่าน: บทความ</h2>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* Left — passage */}
              <div style={{ flex: "1 1 340px", minWidth: 280 }}>
                <p style={{ fontSize: 12, color: "#777", fontStyle: "italic", margin: "0 0 6px" }}>ข้อ 2: คลิก<b>คำแรก</b>และ<b>คำสุดท้าย</b>ของส่วนที่ตอบ (ในย่อหน้าแรก)</p>
                <div style={{ fontSize: 14, lineHeight: 2, color: "#1a1a2e" }}>
                  {p1words.map((w, i) => {
                    const sel = hlLo !== null && hlHi !== null && i >= hlLo && i <= hlHi;
                    const edge = i === hlA || i === hlB;
                    return (
                      <span key={i} onClick={() => clickWord(i)} style={{ cursor: "pointer", background: sel ? "#fff3bf" : "transparent", borderRadius: 3, padding: "1px 1px", boxShadow: edge ? "inset 0 -2px 0 #d8a200" : "none" }}>{w}{" "}</span>
                    );
                  })}
                </div>
                {pSel.q1 === null ? (
                  <p style={{ fontSize: 13, color: "#999" }}>— ย่อหน้า 2 หายไป (ตอบข้อ 1 เพื่อเติม) —</p>
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1a2e", background: "#eafaf3", borderLeft: "3px solid #1d9e75", padding: "6px 10px", borderRadius: 4 }}>
                    {PASSAGE_Q1.options[PASSAGE_Q1.correct].replace(/^[A-D]\)\s*/, "")}
                  </p>
                )}
                <p style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1a2e" }}>{PASSAGE_P3}</p>
              </div>
              {/* Right — questions */}
              <div style={{ flex: "1 1 340px", minWidth: 280, borderLeft: "1px solid #e3e8f0", paddingLeft: 18 }}>
                <div>
                  <b style={{ fontSize: 14 }}>{PASSAGE_Q1.id}. {PASSAGE_Q1.prompt}</b>
                  <div style={{ fontSize: 11, color: "#993c1d", fontStyle: "italic", marginTop: 2 }}>คลิกแล้วไม่สามารถแก้ได้</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {PASSAGE_Q1.options.map((opt, i) => {
                      const answered = pSel.q1 !== null;
                      const isChosen = pSel.q1 === i;
                      const isCorrect = i === PASSAGE_Q1.correct;
                      let border = "1px solid #dce4f0", bg = "#fff", color = "#1a1a2e";
                      if (answered) {
                        if (isCorrect) { border = "2px solid #1d9e75"; bg = "#eafaf3"; color = "#0f6e56"; }
                        else if (isChosen) { border = "2px solid #D85A30"; bg = "#fdeeeb"; color = "#993c1d"; }
                        else { color = "#9aa1ad"; }
                      } else if (isChosen) { border = `2px solid ${NAVY}`; bg = "#f4f8ff"; }
                      return (
                        <button key={i} disabled={answered} onClick={() => pSel.q1 === null && setPSel((s) => ({ ...s, q1: i }))}
                          style={{ textAlign: "left", border, background: bg, borderRadius: 8, padding: "8px 10px", fontSize: 13, cursor: answered ? "default" : "pointer", fontFamily: "inherit", color }}>
                          {opt}{answered && isCorrect ? "  ✓" : answered && isChosen ? "  ✗" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}><b style={{ fontSize: 14 }}>2. {PASSAGE_Q2_PROMPT}</b> <span style={{ fontSize: 12, color: hlA !== null && hlB !== null ? "#0f6e56" : "#999" }}>{hlA !== null && hlB !== null ? "✓ เลือกส่วนแล้ว" : "(คลิกคำแรกและคำสุดท้ายด้านซ้าย)"}</span></div>
                <div style={{ marginTop: 12 }}><b style={{ fontSize: 14 }}>{PASSAGE_Q3.id}. {PASSAGE_Q3.prompt}</b><Options q={PASSAGE_Q3} value={pSel.q3} onChange={(i) => setPSel((s) => ({ ...s, q3: i }))} /></div>
                <div style={{ marginTop: 12 }}><b style={{ fontSize: 14 }}>{PASSAGE_Q4.id}. {PASSAGE_Q4.prompt}</b><Options q={PASSAGE_Q4} value={pSel.q4} onChange={(i) => setPSel((s) => ({ ...s, q4: i }))} /></div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}><button onClick={back} style={{ ...card, padding: "11px 16px", cursor: "pointer" }}>ย้อนกลับ</button><Btn onClick={() => guardedNext([pSel.q1, pSel.q3, pSel.q4].filter((v) => v === null).length + (hlA === null || hlB === null ? 1 : 0))}>ถัดไป →</Btn></div>
          </div>
        )}

        {step === 3 && (
          <div style={card}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>ฟัง: เขียนตามคำบอก</h2>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#5b6472" }}>กดฟัง (สูงสุด 3 ครั้งต่อประโยค) แล้วพิมพ์ประโยคที่ได้ยิน — ปิด autocorrect แล้ว</p>
            {DICTATION.map((s, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <button onClick={() => playDict(i)} disabled={replays[i] >= 3} style={{ background: replays[i] >= 3 ? "#eef0f3" : "#e7eefb", color: replays[i] >= 3 ? "#999" : NAVY, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: replays[i] >= 3 ? "default" : "pointer", fontFamily: "inherit" }}>▶ ฟังประโยค {i + 1} (เหลือ {Math.max(0, 3 - replays[i])} ครั้ง)</button>
                <textarea {...noAuto} value={dict[i]} onChange={(e) => setDict((d) => d.map((v, k) => (k === i ? e.target.value : v)))} rows={2} style={{ width: "100%", marginTop: 6, border: "1.5px solid #dce4f0", borderRadius: 8, padding: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical" }} placeholder="พิมพ์สิ่งที่ได้ยิน…" />
              </div>
            ))}
            <div style={{ marginTop: 4, display: "flex", gap: 8 }}><button onClick={back} style={{ ...card, padding: "11px 16px", cursor: "pointer" }}>ย้อนกลับ</button><Btn onClick={() => guardedNext(dict.filter((v) => !v.trim()).length)}>ถัดไป →</Btn></div>
          </div>
        )}

        {(step === 4 || step === 5) && (() => {
          const ex = step === 4 ? WRITING_EX1 : WRITING_EX2;
          const sel = step === 4 ? ex1 : ex2;
          const setSel = step === 4 ? setEx1 : setEx2;
          return (
            <div style={card}>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>เขียน: {ex.title}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1a1a2e" }}>{ex.passage}</p>
              {ex.questions.map((q, i) => (
                <div key={q.n} style={{ marginTop: 10 }}><b style={{ fontSize: 14 }}>{q.n}.</b><Options q={q} value={sel[i]} onChange={(v) => setSel((arr) => arr.map((x, k) => (k === i ? v : x)))} /></div>
              ))}
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button onClick={back} style={{ ...card, padding: "11px 16px", cursor: "pointer" }}>ย้อนกลับ</button><Btn onClick={() => guardedNext(sel.filter((v) => v === null).length)}>ถัดไป →</Btn></div>
            </div>
          );
        })()}

        {step === 6 && (
          <SpeakingStep
            onDone={(r) => { setSpeakResult(r); next(); }}
            onSkip={() => next()}
            speak={() => speak("Describe your favorite travel experience.")}
          />
        )}

        {step === 7 && report && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
            {saved && (
              <div style={{ ...card, maxWidth: 360, padding: "10px 14px", fontSize: 13, color: "#0f6e56", background: "#eafaf3", border: "1px solid #b7e4cf", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span>✓ บันทึกผลแล้ว</span>
                <a href={`/study-plan/result/${saved.id}`} style={{ color: NAVY, textDecoration: "none", fontWeight: 500 }}>เปิดดูภายหลัง →</a>
              </div>
            )}
            {needsAuth && (
              <div style={{ ...card, maxWidth: 360, padding: "12px 14px", fontSize: 13, background: "#fff7df", border: "1px solid #ffe18a", color: "#5a4600", textAlign: "center" }}>
                สมัครหรือเข้าสู่ระบบเพื่อบันทึกแผนนี้ไว้ดูภายหลัง
                <a href="/login" style={{ display: "block", marginTop: 8, color: NAVY, fontWeight: 500, textDecoration: "none" }}>เข้าสู่ระบบ / สมัคร →</a>
              </div>
            )}
            <DiagnosticReportView report={report} />
            <StudyPlanView plan={generatePlan(report, { freeUser })} />
          </div>
        )}
      </div>
    </main>
  );
}

function SpeakingStep({ onDone, onSkip, speak }: { onDone: (r: SkillResult) => void; onSkip: () => void; speak: () => void }) {
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
        if (!r.ok) setErr((j.error || "Deepgram error") + " — ใช้บทถอดเสียงจากเบราว์เซอร์แทน");
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
      if (!r.ok) throw new Error(j.error || "เกิดข้อผิดพลาด");
      onDone(j.result as SkillResult);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally { setBusy(false); }
  };

  const wc = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={card}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>พูด: เล่าประสบการณ์ท่องเที่ยว</h2>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#5b6472" }}>กดฟังโจทย์ แล้วอัดเสียงพูด ~90 วินาที — ระบบถอดเสียง<b>ดิบ</b> (Deepgram) เพื่อจับไวยากรณ์จริง</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={speak} style={{ background: "#e7eefb", color: NAVY, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>▶ ฟังโจทย์</button>
        {phase !== "recording"
          ? <button onClick={start} disabled={phase === "transcribing"} style={{ background: "#fdeeeb", color: "#993c1d", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>● อัดเสียง</button>
          : <button onClick={stop} style={{ background: "#D85A30", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>■ หยุด</button>}
      </div>
      {phase === "recording" && <p style={{ fontSize: 13, color: "#993c1d", marginTop: 8 }}>● กำลังอัด… เหลือ {secondsLeft} วินาที {live && <span style={{ color: "#5b6472" }}>“{live}”</span>}</p>}
      {phase === "transcribing" && <p style={{ fontSize: 13, color: "#5b6472", marginTop: 8 }}>กำลังถอดเสียง…</p>}
      <textarea value={transcript} readOnly={!allowTyping} onChange={(e) => setTranscript(e.target.value)} rows={4} style={{ width: "100%", marginTop: 10, border: "1.5px solid #dce4f0", borderRadius: 8, padding: 8, fontSize: 14, fontFamily: "inherit", background: allowTyping ? "#fff" : "#f7f8fa" }} placeholder={allowTyping ? "บทถอดเสียงจะปรากฏที่นี่ (หรือพิมพ์เพื่อทดสอบ ≥ 15 คำ)" : "บทถอดเสียงจะปรากฏที่นี่หลังอัดเสียง"} />
      <div style={{ fontSize: 11, color: wc >= 15 ? "#0f6e56" : "#999", marginTop: 2 }}>{wc} คำ</div>
      {err && <p style={{ color: "#993c1d", fontSize: 13 }}>{err}</p>}
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button onClick={onSkip} style={{ ...card, padding: "11px 16px", cursor: "pointer" }}>ข้ามการพูด</button>
        <Btn onClick={grade} disabled={busy || wc < 15}>{busy ? "กำลังประเมิน…" : "ประเมิน + ดูผล →"}</Btn>
      </div>
    </div>
  );
}
