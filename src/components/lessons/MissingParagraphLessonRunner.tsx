"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PassageWords, type PassageHighlight } from "@/components/lessons/PassageWords";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { useLessonUserId } from "@/lib/lesson-user";
import { fetchSeenKeys, filterUnseen, itemKey, markItemSeen } from "@/lib/lesson-seen";
import { clearUnitResume, loadUnitResume, saveUnitResume, saveUnitScore } from "@/lib/lessons-progress";
import {
  missingParagraphUnit,
  type MissingParagraphItem,
  type MissingParagraphKeyword,
  type MissingParagraphTier,
} from "@/lib/missing-paragraph-lessons";
import { phraseWordRange } from "@/lib/passage-text";
import { addNotebookEntry } from "@/lib/notebook-storage";

const TOPIC = "missingparagraph";
type Phase = "read" | "match";

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function MissingParagraphLessonRunner({ tier, unit }: { tier: MissingParagraphTier; unit: number }) {
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

  const items = filterUnseen(missingParagraphUnit(tier, unit), (l) => itemKey("missingparagraph", l.id), seenKeys);
  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-bold">คุณฝึกครบทุกข้อในด่านนี้แล้ว 🎉</p>
        <Link href="/practice/lessons/reading-skills" className="mt-4 inline-block rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00]">
          กลับไปเลือกด่าน
        </Link>
      </div>
    );
  }
  return <Player tier={tier} unit={unit} items={items} uid={uid} />;
}

function Player({ tier, unit, items, uid }: { tier: MissingParagraphTier; unit: number; items: MissingParagraphItem[]; uid: string | null }) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("read");
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [openKeyword, setOpenKeyword] = useState<MissingParagraphKeyword | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [selectedEn, setSelectedEn] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState<{ en: number; th: number } | null>(null);
  const rewarded = useRef(false);

  const item = items[index]!;
  const displayOptions = useMemo(() => shuffled(item.options), [item.id]);
  const thOrder = useMemo(() => shuffled(item.keywords.map((_, i) => i)), [item.id]);

  useEffect(() => {
    setPhase("read");
    setPicked(null);
    setChecked(false);
    setMatched(new Set());
    setSelectedEn(null);
  }, [index]);

  useEffect(() => {
    const r = loadUnitResume(TOPIC, tier, unit);
    if (r && r.index > 0 && r.index < total) {
      setIndex(r.index);
      setCompleted(r.a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const highlights: PassageHighlight[] = item.keywords
    .map((k): PassageHighlight | null => {
      const range = phraseWordRange(k.paragraph === 1 ? item.paragraph1 : item.paragraph2, k.phrase);
      return range ? { paragraph: k.paragraph, start: range[0], end: range[1], color: "yellow" } : null;
    })
    .filter((x): x is PassageHighlight => !!x);

  function onWordPress(paragraph: 1 | 2, wordIdx: number) {
    const kw = item.keywords.find((k) => {
      if (k.paragraph !== paragraph) return false;
      const range = phraseWordRange(paragraph === 1 ? item.paragraph1 : item.paragraph2, k.phrase);
      return range && wordIdx >= range[0] && wordIdx <= range[1];
    });
    if (kw) setOpenKeyword(kw);
  }

  function check() {
    if (picked === null) return;
    setChecked(true);
    if (displayOptions[picked]!.correct) {
      sfxCorrect();
      setCompleted((c) => c + 1);
    } else {
      sfxWrong();
    }
  }

  function tapEn(i: number) {
    if (matched.has(i)) return;
    setSelectedEn(i);
  }
  function tapTh(i: number) {
    if (matched.has(i) || selectedEn === null) return;
    if (selectedEn === i) {
      sfxCorrect();
      setMatched((s) => new Set(s).add(i));
      setSelectedEn(null);
    } else {
      sfxWrong();
      setWrongFlash({ en: selectedEn, th: i });
      setTimeout(() => setWrongFlash(null), 420);
      setSelectedEn(null);
    }
  }

  async function saveKeyword(k: MissingParagraphKeyword) {
    if (!uid || savedWords.has(k.phrase)) return;
    try {
      await addNotebookEntry({
        source: "reading-comprehension",
        categoryIds: ["vocabulary"],
        titleEn: k.phrase,
        titleTh: k.th,
        bodyEn: k.rationaleEn,
        bodyTh: k.rationaleTh,
        userNote: "",
      });
      setSavedWords((s) => new Set(s).add(k.phrase));
    } catch {
      /* best-effort */
    }
  }

  function next() {
    sfxTransition();
    markItemSeen(uid, itemKey("missingparagraph", item.id), "missingparagraph", "manual_browse").catch(() => {});
    if (index + 1 >= total) return finish();
    saveUnitResume(TOPIC, tier, unit, { index: index + 1, a: completed });
    setIndex(index + 1);
  }

  function finish() {
    setFinished(true);
    if (!rewarded.current) {
      rewarded.current = true;
      sfxCelebrate("md");
      const pct = total ? Math.round((completed / total) * 100) : 0;
      saveUnitScore(uid, TOPIC, tier, unit, pct).catch(() => {});
      awardXp(uid, XP.auto(pct)).catch(() => {});
      clearUnitResume(TOPIC, tier, unit);
    }
  }

  if (finished) {
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return (
      <div className="py-8">
        <CelebrateMascot
          title="เก่งมาก!"
          subtitle="คุณฝึกจับใจความและจำคำศัพท์จากบทอ่านแล้ว ลองอ่านบทความจริงด้วยวิธีนี้ดูนะ"
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6 text-center">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">หาย่อหน้าที่หายไปถูก {completed} จาก {total} เรื่อง</p>
        </div>
        <div className="text-center">
          <Link href="/practice/lessons/reading-skills" className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]">
            เสร็จแล้ว · กลับไปเลือกด่าน
          </Link>
        </div>
      </div>
    );
  }

  const correctIdx = displayOptions.findIndex((o) => o.correct);
  const allMatched = matched.size === item.keywords.length;

  return (
    <div key={index} className="ep-step-slide-in">
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>ข้อ {index + 1} / {total}</span>
        <span>ผ่านแล้ว {completed}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#004AAD] transition-all" style={{ width: `${((index + (phase === "match" && allMatched ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <p className="text-base font-bold text-slate-900">{item.title}</p>
      <p className="mb-3 text-xs text-slate-500">{item.titleTh}</p>

      {phase === "read" ? (
        <>
          <p className="mb-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-[#004AAD]">แตะคำที่ไฮไลต์สีเหลืองในย่อหน้า เพื่อดูว่าทำไมคำนั้นเป็นคำใบ้สำคัญ</p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <PassageWords paragraph1={item.paragraph1} paragraph2="" highlights={highlights} onWordPress={onWordPress} />
            <div className="my-3 rounded-xl border-[1.5px] border-dashed border-[#004AAD] bg-blue-50 p-3 text-sm font-semibold text-[#004AAD]">
              {picked !== null ? displayOptions[picked]!.text : "( ? ตรงนี้มีประโยคหายไป — เลือกด้านล่าง )"}
            </div>
            <PassageWords paragraph1="" paragraph2={item.paragraph2} highlights={highlights} onWordPress={onWordPress} />
          </div>

          <p className="mb-2 mt-4 text-sm font-bold text-slate-800">เลือกประโยคที่เชื่อมสองย่อหน้าได้ดีที่สุด</p>
          <div className="space-y-2">
            {displayOptions.map((o, i) => {
              const state = !checked ? (picked === i ? "selected" : "idle") : i === correctIdx ? "correct" : picked === i ? "wrong" : "idle";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={checked}
                  onClick={() => {
                    if (checked) setChecked(false);
                    setPicked(i);
                  }}
                  className={`w-full rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
                    state === "correct" ? "border-emerald-500 bg-emerald-50" : state === "wrong" ? "border-rose-500 bg-rose-50" : state === "selected" ? "border-[#004AAD] bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  {o.text}
                </button>
              );
            })}
          </div>

          {checked ? (
            <div className={`mt-4 rounded-xl border p-4 ${picked !== null && displayOptions[picked]!.correct ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50"}`}>
              <p className="mb-2 text-sm font-black">{picked !== null && displayOptions[picked]!.correct ? "✓ ถูกต้อง!" : "✕ ยังไม่ถูก"}</p>
              {picked !== null ? (
                <>
                  <p className="text-sm text-slate-700">{displayOptions[picked]!.rationaleEn}</p>
                  <p className="mt-1 text-sm text-slate-600">{displayOptions[picked]!.rationaleTh}</p>
                </>
              ) : null}
              {picked !== null && !displayOptions[picked]!.correct ? (
                <div className="mt-2 rounded-lg bg-white p-3">
                  <p className="mb-1 text-xs font-black text-emerald-600">เฉลย: {displayOptions[correctIdx]!.text}</p>
                  <p className="text-sm text-slate-700">{displayOptions[correctIdx]!.rationaleEn}</p>
                  <p className="mt-1 text-sm text-slate-600">{displayOptions[correctIdx]!.rationaleTh}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5">
            {checked ? (
              picked !== null && displayOptions[picked]!.correct ? (
                <button type="button" onClick={() => setPhase("match")} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
                  ไปจับคู่คำศัพท์ →
                </button>
              ) : (
                <button type="button" onClick={() => setChecked(false)} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]">
                  ลองใหม่
                </button>
              )
            ) : (
              <button type="button" disabled={picked === null} onClick={check} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40">
                {picked !== null ? "ตรวจคำตอบ" : "เลือกประโยคก่อน"}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-[#004AAD]">แตะคำศัพท์ภาษาอังกฤษ แล้วแตะความหมายภาษาไทยที่ตรงกัน</p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2.5">
              {item.keywords.map((k, i) => {
                const isMatched = matched.has(i);
                const isWrong = wrongFlash?.en === i;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isMatched}
                    onClick={() => tapEn(i)}
                    className={`min-h-[56px] w-full rounded-xl border-[1.5px] p-3 text-left text-xs font-bold shadow-sm ${
                      isMatched ? "border-emerald-500 bg-emerald-50 text-emerald-700 opacity-70" : isWrong ? "border-rose-500 bg-rose-50" : selectedEn === i ? "border-[#004AAD] bg-blue-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    {k.phrase}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 space-y-2.5">
              {thOrder.map((origIdx) => {
                const isMatched = matched.has(origIdx);
                const isWrong = wrongFlash?.th === origIdx;
                return (
                  <button
                    key={origIdx}
                    type="button"
                    disabled={isMatched}
                    onClick={() => tapTh(origIdx)}
                    className={`min-h-[56px] w-full rounded-xl border-[1.5px] p-3 text-left text-xs font-bold shadow-sm ${
                      isMatched ? "border-emerald-500 bg-emerald-50 text-emerald-700 opacity-70" : isWrong ? "border-rose-500 bg-rose-50" : "border-amber-300 bg-amber-50"
                    }`}
                  >
                    {item.keywords[origIdx]!.th}
                  </button>
                );
              })}
            </div>
          </div>

          {allMatched ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-sm font-black">🎉 จับคู่ครบแล้ว! บันทึกคำศัพท์เหล่านี้ไว้ได้เลย</p>
              {item.keywords.map((k, i) => (
                <div key={i} className="flex items-center gap-3 border-t border-slate-100 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{k.phrase}</p>
                    <p className="text-xs text-slate-500">{k.th}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveKeyword(k)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${savedWords.has(k.phrase) ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    {savedWords.has(k.phrase) ? "✓ บันทึกแล้ว" : "🔖 บันทึก"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-center text-xs font-bold text-slate-400">จับคู่คำศัพท์ให้ครบเพื่อไปข้อถัดไป</p>
          )}

          {allMatched ? (
            <div className="mt-5">
              <button type="button" onClick={next} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
                {index + 1 >= total ? "ดูสรุป →" : "ถัดไป →"}
              </button>
            </div>
          ) : null}
        </>
      )}

      {openKeyword ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpenKeyword(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black text-slate-900">{openKeyword.phrase}</p>
            <p className="mt-1 text-sm font-bold text-[#004AAD]">{openKeyword.th}</p>
            <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-slate-400">ทำไมถึงเป็นคำใบ้สำคัญ?</p>
            <p className="mt-1.5 text-sm text-slate-800">{openKeyword.rationaleEn}</p>
            <p className="mt-1 text-sm text-slate-600">{openKeyword.rationaleTh}</p>
            <button
              type="button"
              disabled={savedWords.has(openKeyword.phrase)}
              onClick={() => saveKeyword(openKeyword)}
              className="mt-4 w-full rounded-xl bg-[#004AAD] py-2.5 text-sm font-bold text-[#FFCC00] disabled:opacity-50"
            >
              {savedWords.has(openKeyword.phrase) ? "บันทึกลงสมุดแล้ว ✓" : "＋ บันทึกลงสมุดโน้ต"}
            </button>
            <button type="button" onClick={() => setOpenKeyword(null)} className="mt-2 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600">
              ปิด
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
