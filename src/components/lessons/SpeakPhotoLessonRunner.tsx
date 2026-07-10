"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { splitTemplate } from "@/lib/cloze-template";
import { speakLesson, type LessonPlayer } from "@/lib/lesson-audio";
import { getPhoto, photoCredit } from "@/lib/lesson-photo-bank";
import { fetchSeenKeys, filterUnseen, itemKey, markItemSeen } from "@/lib/lesson-seen";
import { useLessonUserId } from "@/lib/lesson-user";
import { clearUnitResume, loadUnitResume, saveUnitResume, saveUnitScore } from "@/lib/lessons-progress";
import { addNotebookEntry } from "@/lib/notebook-storage";
import { PRONUNCIATION_PASS, pronunciationScore, type PronunciationResult } from "@/lib/pronunciation-match";
import { speakPhotoUnit, type SpeakPhotoItem, type SpeakPhotoTier, type SpeakPhotoVocab } from "@/lib/speakphoto-lessons";
import { LessonRecorder } from "@/components/lessons/LessonRecorder";

const TOPIC = "speakphoto";
type Phase = "cloze" | "speak";

export function SpeakPhotoLessonRunner({ tier, unit }: { tier: SpeakPhotoTier; unit: number }) {
  const uid = useLessonUserId();
  const [seenKeys, setSeenKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    let alive = true;
    fetchSeenKeys(uid).then((k) => alive && setSeenKeys(k));
    return () => {
      alive = false;
    };
  }, [uid]);

  if (!seenKeys) {
    return (
      <div className="flex justify-center py-10">
        <MascotLoader label="กำลังโหลด…" />
      </div>
    );
  }

  const items = filterUnseen(speakPhotoUnit(tier, unit), (l) => itemKey("speakphoto", l.id), seenKeys);
  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-bold">คุณฝึกครบทุกข้อในด่านนี้แล้ว 🎉</p>
        <Link href="/practice/lessons/how-to-speak" className="mt-4 inline-block rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00]">
          กลับไปเลือกด่าน
        </Link>
      </div>
    );
  }
  return <Player tier={tier} unit={unit} items={items} uid={uid} />;
}

function Player({ tier, unit, items, uid }: { tier: SpeakPhotoTier; unit: number; items: SpeakPhotoItem[]; uid: string | null }) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("cloze");
  const [passedCount, setPassedCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const [picks, setPicks] = useState<(string | null)[]>([]);
  const [activeBlank, setActiveBlank] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const [transcribing, setTranscribing] = useState(false);
  const [heardText, setHeardText] = useState("");
  const [result, setResult] = useState<PronunciationResult | null>(null);

  const [vocabOpen, setVocabOpen] = useState<SpeakPhotoVocab | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const rewarded = useRef(false);
  // Auto-play (below) and the manual replay button used to each call
  // speakLesson(...).play() independently, creating a SEPARATE player (and
  // separate <audio> element) per call — a click landing inside the 350ms
  // auto-play window fired two independent playbacks that genuinely
  // overlapped. Share one player instance and guard the pending timer instead.
  const player = useRef<LessonPlayer | null>(null);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = items[index]!;
  const photo = getPhoto(item.imageId);

  useEffect(() => {
    setPhase("cloze");
    setPicks(new Array(item.blanks.length).fill(null));
    setActiveBlank(null);
    setChecked(false);
    setHeardText("");
    setResult(null);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const r = loadUnitResume(TOPIC, tier, unit);
    if (r && r.index > 0 && r.index < total) {
      setIndex(r.index);
      setPassedCount(r.a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "speak") return;
    player.current?.remove();
    const p = speakLesson(item.answer);
    player.current = p;
    autoplayTimer.current = setTimeout(() => { autoplayTimer.current = null; p.play(); }, 350);
    return () => {
      if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
      autoplayTimer.current = null;
      p.remove();
    };
  }, [phase, item.answer]);

  const wrongBlanks = useMemo(() => {
    if (!checked) return new Set<number>();
    const s = new Set<number>();
    item.blanks.forEach((b, i) => {
      if (picks[i] !== b.answer) s.add(i);
    });
    return s;
  }, [checked, picks, item.blanks]);

  const allPicked = picks.length > 0 && picks.every((p) => p !== null);
  const passed = !!result && result.pct >= PRONUNCIATION_PASS;

  function pick(blank: number, option: string) {
    setPicks((p) => {
      const n = [...p];
      n[blank] = option;
      return n;
    });
    setActiveBlank(null);
    if (checked) setChecked(false);
  }

  function checkCloze() {
    setChecked(true);
    if (item.blanks.every((b, i) => picks[i] === b.answer)) {
      sfxCorrect();
      setPhase("speak");
    } else {
      sfxWrong();
    }
  }

  async function onRecording(r: { base64: string; mimeType: string }) {
    setTranscribing(true);
    setResult(null);
    markItemSeen(uid, itemKey("speakphoto", item.id), "speakphoto", "manual_browse").catch(() => {});
    try {
      const res = await fetch("/api/speech-transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: r.base64, mimeType: r.mimeType }),
      });
      const json = (await res.json().catch(() => ({}))) as { transcript?: string };
      const transcript = json.transcript ?? "";
      setHeardText(transcript);
      const scored = pronunciationScore(item.answer, transcript);
      setResult(scored);
      if (scored.pct >= PRONUNCIATION_PASS) {
        sfxCorrect();
      } else {
        sfxWrong();
      }
    } catch {
      setHeardText("");
      setResult({ pct: 0, words: [], missedIdx: [] });
    } finally {
      setTranscribing(false);
    }
  }

  function speakAgain() {
    setHeardText("");
    setResult(null);
  }

  async function saveVocab(v: SpeakPhotoVocab) {
    if (!uid || savedWords.has(v.word)) return;
    try {
      await addNotebookEntry({ source: "speak-about-photo", categoryIds: ["vocabulary"], titleEn: v.word, titleTh: v.th, bodyEn: v.en, bodyTh: v.th, userNote: "" });
      setSavedWords((s) => new Set(s).add(v.word));
    } catch {
      /* best-effort */
    }
  }

  function next() {
    sfxTransition();
    const passedNow = passedCount + (passed ? 1 : 0);
    if (passed) setPassedCount((c) => c + 1);
    if (index + 1 >= total) return finish(passedNow);
    saveUnitResume(TOPIC, tier, unit, { index: index + 1, a: passedNow });
    setIndex(index + 1);
  }

  function skip() {
    sfxTransition();
    if (index + 1 >= total) return finish(passedCount);
    saveUnitResume(TOPIC, tier, unit, { index: index + 1, a: passedCount });
    setIndex(index + 1);
  }

  function finish(finalPassed: number) {
    setFinished(true);
    if (!rewarded.current) {
      rewarded.current = true;
      sfxCelebrate("md");
      const pct = total ? Math.round((finalPassed / total) * 100) : 0;
      saveUnitScore(uid, TOPIC, tier, unit, pct).catch(() => {});
      awardXp(uid, XP.auto(pct)).catch(() => {});
      clearUnitResume(TOPIC, tier, unit);
    }
  }

  if (finished) {
    const pct = total ? Math.round((passedCount / total) * 100) : 0;
    return (
      <div className="py-8">
        <CelebrateMascot
          title="เยี่ยมมาก!"
          subtitle="คุณได้ฝึกพูดบรรยายภาพเป็นภาษาอังกฤษแล้ว ลองบรรยายภาพอื่น ๆ รอบตัวคุณดูนะ"
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6 text-center">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">ผ่านครบ {passedCount} จาก {total} ภาพ</p>
        </div>
        <div className="text-center">
          <Link href="/practice/lessons/how-to-speak" className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]">
            เสร็จแล้ว · กลับไปเลือกด่าน
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div key={index} className="ep-step-slide-in">
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <div className="flex items-center gap-2">
          <span>ข้อ {index + 1} / {total}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${phase === "speak" ? "bg-[#004AAD] text-white" : "bg-slate-100 text-slate-500"}`}>
            {phase === "cloze" ? "1 · เติมคำ" : "2 · ออกเสียง"}
          </span>
        </div>
        <span>ผ่านแล้ว {passedCount}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#004AAD] transition-all" style={{ width: `${((index + (phase === "speak" ? 0.5 : 0)) / total) * 100}%` }} />
      </div>

      {photo ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.display} alt={photo.title} className="h-56 w-full object-cover" />
          <p className="bg-slate-50 px-3 py-1.5 text-[10px] text-slate-400">{photoCredit(photo)}</p>
        </div>
      ) : null}

      {phase === "cloze" ? (
        <>
          <p className="mb-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-[#004AAD]">ดูภาพ แล้วแตะช่องว่างเพื่อเลือกคำที่บรรยายภาพได้ถูกต้อง</p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-y-2 text-[15px] leading-8 text-slate-800">
              {splitTemplate(item.template).map((part, pi) =>
                "text" in part ? (
                  <span key={pi}>{part.text}</span>
                ) : (
                  <button
                    key={pi}
                    type="button"
                    onClick={() => setActiveBlank(activeBlank === part.blank ? null : part.blank)}
                    className={`mx-0.5 rounded-md border-[1.5px] px-2 py-0.5 text-sm font-bold ${
                      checked && wrongBlanks.has(part.blank) ? "border-rose-500 bg-rose-50" : checked ? "border-emerald-500 bg-emerald-50" : picks[part.blank] ? "border-[#004AAD] bg-blue-50" : "border-dashed border-[#004AAD] bg-blue-50 text-[#004AAD]"
                    }`}
                  >
                    {picks[part.blank] ?? "แตะเลือก ▾"}
                  </button>
                ),
              )}
            </div>
          </div>
          {checked && wrongBlanks.size > 0 ? (
            <div className="mt-4 rounded-xl border border-rose-500 bg-rose-50 p-4">
              <p className="mb-2 text-sm font-black text-rose-700">✕ ยังไม่ถูก — แก้ช่องที่ทำเครื่องหมายไว้</p>
              {[...wrongBlanks].map((i) => {
                const b = item.blanks[i]!;
                return (
                  <div key={i} className="mb-2 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="inline-block rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-black text-white">ช่องที่ {i + 1} · เฉลย: {b.answer}</span>
                    <p className="mt-1.5 text-sm text-slate-800">{b.ruleEn}</p>
                    <p className="mt-1 text-sm text-slate-600">{b.ruleTh}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="mt-6">
            <button type="button" disabled={!allPicked} onClick={checkCloze} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40">
              {allPicked ? "ตรวจคำตอบ" : "เลือกคำให้ครบก่อน"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-900">{item.answer}</p>
            <button
              type="button"
              onClick={() => {
                if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
                player.current?.play();
              }}
              className="mx-auto mt-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800"
            >
              <span>🔊</span> ฟังตัวอย่างอีกครั้ง
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center">
            {!transcribing && !result ? <LessonRecorder onResult={onRecording} maxSeconds={90} /> : null}
            {transcribing ? <p className="text-sm font-bold text-slate-500">กำลังฟังเสียงของคุณ…</p> : null}
            {!transcribing && result ? (
              <div className="w-full">
                <div className="rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-700">
                  {heardText ? <>ระบบได้ยินคุณพูดว่า: &ldquo;{heardText}&rdquo;</> : "ระบบไม่ได้ยินเสียงที่ชัดเจน…"}
                </div>
                <div className={`mt-3 rounded-2xl p-6 text-center ${passed ? "bg-emerald-50" : "bg-rose-50"}`}>
                  <p className={`text-4xl font-black ${passed ? "text-emerald-600" : "text-rose-600"}`}>{result.pct}%</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{passed ? "ผ่าน! ออกเสียงได้ตรงตามเกณฑ์" : `ต้องได้อย่างน้อย ${PRONUNCIATION_PASS}% ถึงจะผ่าน`}</p>
                </div>
                {!passed ? (
                  <button type="button" onClick={speakAgain} className="mt-4 w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]">
                    🎙 ลองพูดอีกครั้ง
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex gap-2">
            {passed ? (
              <button type="button" onClick={next} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
                {index + 1 >= total ? "ดูสรุป →" : "ภาพถัดไป →"}
              </button>
            ) : (
              <button type="button" onClick={skip} className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600">
                {index + 1 >= total ? "ข้าม · ดูสรุป" : "ข้ามข้อนี้ →"}
              </button>
            )}
          </div>
        </>
      )}

      <div className="mt-6">
        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">คำศัพท์ประจำหัวข้อ</p>
        <div className="flex flex-wrap gap-2">
          {item.vocab.map((v) => (
            <button key={v.word} type="button" onClick={() => setVocabOpen(v)} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${savedWords.has(v.word) ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
              {v.word}{savedWords.has(v.word) ? " ✓" : ""}
            </button>
          ))}
        </div>
      </div>

      {activeBlank !== null && phase === "cloze" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setActiveBlank(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-black text-slate-900">เลือกคำสำหรับช่องที่ {activeBlank + 1}</p>
            <div className="flex flex-wrap gap-2">
              {(item.blanks[activeBlank]?.options ?? []).map((opt) => (
                <button key={opt} type="button" onClick={() => pick(activeBlank, opt)} className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-bold ${picks[activeBlank] === opt ? "border-[#004AAD] bg-[#004AAD] text-white" : "border-slate-200 bg-white text-slate-800"}`}>
                  {opt}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setActiveBlank(null)} className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600">
              ปิด
            </button>
          </div>
        </div>
      ) : null}

      {vocabOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setVocabOpen(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-xl font-black text-slate-900">{vocabOpen.word}</p>
              <button type="button" onClick={() => speakLesson(vocabOpen.word).play()} className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-lg">🔊</button>
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-slate-400">ความหมาย (EN)</p>
            <p className="mt-1 text-sm text-slate-800">{vocabOpen.en}</p>
            <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">ความหมาย (ไทย)</p>
            <p className="mt-1 text-sm text-slate-800">{vocabOpen.th}</p>
            <button type="button" disabled={savedWords.has(vocabOpen.word)} onClick={() => saveVocab(vocabOpen)} className="mt-4 w-full rounded-xl bg-[#004AAD] py-2.5 text-sm font-bold text-[#FFCC00] disabled:opacity-50">
              {savedWords.has(vocabOpen.word) ? "บันทึกลงสมุดแล้ว ✓" : "＋ บันทึกลงสมุดโน้ต"}
            </button>
            <button type="button" onClick={() => setVocabOpen(null)} className="mt-2 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600">
              ปิด
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
