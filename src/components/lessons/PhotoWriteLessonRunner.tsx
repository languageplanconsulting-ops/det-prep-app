"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { splitTemplate } from "@/lib/cloze-template";
import { speakLesson } from "@/lib/lesson-audio";
import { fetchSeenKeys, filterUnseen, itemKey, markItemSeen } from "@/lib/lesson-seen";
import { useLessonUserId } from "@/lib/lesson-user";
import { clearUnitResume, loadUnitResume, saveUnitResume, saveUnitScore } from "@/lib/lessons-progress";
import { addNotebookEntry } from "@/lib/notebook-storage";
import { getPhoto, photoCredit } from "@/lib/lesson-photo-bank";
import { photoWriteUnit, type PhotoWriteItem, type PhotoWriteTier, type PhotoWriteVocab } from "@/lib/photo-write-lessons";

const TOPIC = "photowrite";
type Phase = "cloze" | "review";

export function PhotoWriteLessonRunner({ tier, unit }: { tier: PhotoWriteTier; unit: number }) {
  const uid = useLessonUserId();
  const [seenKeys, setSeenKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    let alive = true;
    fetchSeenKeys(uid).then((k) => alive && setSeenKeys(k));
    return () => {
      alive = false;
    };
  }, [uid]);

  if (!seenKeys) return <div className="py-16 text-center text-sm text-slate-400">กำลังโหลด…</div>;

  const items = filterUnseen(photoWriteUnit(tier, unit), (l) => itemKey("photowrite", l.id), seenKeys);
  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-bold">คุณฝึกครบทุกข้อในด่านนี้แล้ว 🎉</p>
        <Link href="/practice/lessons/how-to-write" className="mt-4 inline-block rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00]">
          กลับไปเลือกด่าน
        </Link>
      </div>
    );
  }
  return <Player tier={tier} unit={unit} items={items} uid={uid} />;
}

function Player({ tier, unit, items, uid }: { tier: PhotoWriteTier; unit: number; items: PhotoWriteItem[]; uid: string | null }) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("cloze");
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  const [picks, setPicks] = useState<(string | null)[]>([]);
  const [activeBlank, setActiveBlank] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [vocabOpen, setVocabOpen] = useState<PhotoWriteVocab | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  const item = items[index]!;
  const photo = getPhoto(item.imageId);

  useEffect(() => {
    setPhase("cloze");
    setPicks(new Array(item.blanks.length).fill(null));
    setActiveBlank(null);
    setChecked(false);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const r = loadUnitResume(TOPIC, tier, unit);
    if (r && r.index > 0 && r.index < total) {
      setIndex(r.index);
      setCompleted(r.a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrongBlanks = useMemo(() => {
    if (!checked) return new Set<number>();
    const s = new Set<number>();
    item.blanks.forEach((b, i) => {
      if (picks[i] !== b.answer) s.add(i);
    });
    return s;
  }, [checked, picks, item.blanks]);

  const allPicked = picks.length > 0 && picks.every((p) => p !== null);

  function pick(blank: number, option: string) {
    setPicks((p) => {
      const n = [...p];
      n[blank] = option;
      return n;
    });
    setActiveBlank(null);
    if (checked) setChecked(false);
  }

  function check() {
    markItemSeen(uid, itemKey("photowrite", item.id), "photowrite", "manual_browse").catch(() => {});
    setChecked(true);
    if (item.blanks.every((b, i) => picks[i] === b.answer)) {
      setCompleted((c) => c + 1);
      setPhase("review");
    }
  }

  async function saveVocab(v: PhotoWriteVocab) {
    if (!uid || savedWords.has(v.word)) return;
    try {
      await addNotebookEntry({
        source: "write-about-photo",
        categoryIds: ["vocabulary"],
        titleEn: v.word,
        titleTh: v.th,
        bodyEn: v.en,
        bodyTh: v.th,
        userNote: "",
      });
      setSavedWords((s) => new Set(s).add(v.word));
    } catch {
      /* best-effort */
    }
  }

  function next() {
    if (index + 1 >= total) return finish();
    saveUnitResume(TOPIC, tier, unit, { index: index + 1, a: completed });
    setIndex(index + 1);
  }

  function finish() {
    setFinished(true);
    const pct = total ? Math.round((completed / total) * 100) : 0;
    saveUnitScore(uid, TOPIC, tier, unit, pct).catch(() => {});
    clearUnitResume(TOPIC, tier, unit);
  }

  if (finished) {
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return (
      <div className="py-8 text-center">
        <p className="text-2xl font-bold">เยี่ยมมาก!</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">คุณได้ฝึกบรรยายภาพเป็นภาษาอังกฤษแล้ว ลองบรรยายภาพอื่น ๆ รอบตัวคุณดูนะ</p>
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">บรรยายถูกครบ {completed} จาก {total} ภาพ</p>
        </div>
        <Link href="/practice/lessons/how-to-write" className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]">
          เสร็จแล้ว · กลับไปเลือกด่าน
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>ข้อ {index + 1} / {total}</span>
        <span>ผ่านแล้ว {completed}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#004AAD] transition-all" style={{ width: `${((index + (phase === "review" ? 1 : 0)) / total) * 100}%` }} />
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
                      checked && wrongBlanks.has(part.blank)
                        ? "border-rose-500 bg-rose-50"
                        : checked
                          ? "border-emerald-500 bg-emerald-50"
                          : picks[part.blank]
                            ? "border-[#004AAD] bg-blue-50"
                            : "border-dashed border-[#004AAD] bg-blue-50 text-[#004AAD]"
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
        </>
      ) : (
        <>
          <p className="mb-2 text-sm font-bold text-slate-800">เยี่ยม! นี่คือคำบรรยายตัวอย่างฉบับสมบูรณ์</p>
          <div className="rounded-2xl border border-emerald-500 bg-emerald-50 p-5">
            <p className="text-[15px] leading-7 text-emerald-950">{item.answer}</p>
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

      <div className="mt-6">
        {phase === "review" ? (
          <button type="button" onClick={next} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
            {index + 1 >= total ? "ดูสรุป →" : "ภาพถัดไป →"}
          </button>
        ) : (
          <button type="button" disabled={!allPicked} onClick={check} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40">
            {allPicked ? "ตรวจคำตอบ" : "เลือกคำให้ครบก่อน"}
          </button>
        )}
      </div>

      {activeBlank !== null && phase === "cloze" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setActiveBlank(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-black text-slate-900">เลือกคำสำหรับช่องที่ {activeBlank + 1}</p>
            <div className="flex flex-wrap gap-2">
              {(item.blanks[activeBlank]?.options ?? []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => pick(activeBlank, opt)}
                  className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-bold ${picks[activeBlank] === opt ? "border-[#004AAD] bg-[#004AAD] text-white" : "border-slate-200 bg-white text-slate-800"}`}
                >
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
            <button
              type="button"
              disabled={savedWords.has(vocabOpen.word)}
              onClick={() => saveVocab(vocabOpen)}
              className="mt-4 w-full rounded-xl bg-[#004AAD] py-2.5 text-sm font-bold text-[#FFCC00] disabled:opacity-50"
            >
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
