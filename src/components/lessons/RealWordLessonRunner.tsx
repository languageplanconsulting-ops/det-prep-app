"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { speakLesson } from "@/lib/lesson-audio";
import { useLessonUserId } from "@/lib/lesson-user";
import { fetchSeenKeys, filterUnseen, itemKey, markItemSeen } from "@/lib/lesson-seen";
import {
  clearUnitResume,
  loadUnitResume,
  saveUnitResume,
  saveUnitScore,
} from "@/lib/lessons-progress";
import { addNotebookEntry } from "@/lib/notebook-storage";
import { realWordUnit, type RealWordItem, type RealWordTier } from "@/lib/realword-lesson";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

export function RealWordLessonRunner({ tier, unit }: { tier: RealWordTier; unit: number }) {
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

  const items = filterUnseen(realWordUnit(tier, unit), (l) => itemKey("realword_lesson", l.id), seenKeys);
  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-bold">คุณฝึกครบทุกข้อในด่านนี้แล้ว 🎉</p>
        <p className="mt-2 text-sm text-slate-500">ลองด่านอื่น หรือกลับมาดูสรุปความก้าวหน้าได้เลย</p>
        <Link href="/practice/lessons/real-word" className="mt-4 inline-block rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00]">
          กลับไปเลือกด่าน
        </Link>
      </div>
    );
  }

  return <Player tier={tier} unit={unit} items={items} uid={uid} />;
}

function Player({
  tier,
  unit,
  items,
  uid,
}: {
  tier: RealWordTier;
  unit: number;
  items: RealWordItem[];
  uid: string | null;
}) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [finished, setFinished] = useState(false);

  const [shownWrong, setShownWrong] = useState(() => Math.random() < 0.5);
  const [judged, setJudged] = useState<boolean | null>(null);
  const [typed, setTyped] = useState("");
  const [spellOk, setSpellOk] = useState(false);
  const [spellTries, setSpellTries] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const item = items[index]!;
  const rewarded = useRef(false);

  function resetItem() {
    setShownWrong(Math.random() < 0.5);
    setJudged(null);
    setTyped("");
    setSpellOk(false);
    setSpellTries(0);
    setSaved(false);
    setSaveError(false);
  }

  useEffect(() => {
    const r = loadUnitResume("realword", tier, unit);
    if (r && r.index > 0 && r.index < total) {
      setIndex(r.index);
      setPassedCount(r.a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = shownWrong ? item.misspelling : item.word;
  const needsSpelling = judged !== null && shownWrong;
  const resolved = judged !== null && (!shownWrong || spellOk);

  function judge(userSaysCorrect: boolean) {
    if (judged !== null) return;
    markItemSeen(uid, itemKey("realword_lesson", item.id), "realword_lesson", "manual_browse").catch(() => {});
    const correct = userSaysCorrect === !shownWrong;
    setJudged(correct);
    if (correct) {
      sfxCorrect();
      setCombo((c) => c + 1);
      if (!shownWrong) setPassedCount((p) => p + 1);
    } else {
      sfxWrong();
      setCombo(0);
    }
    speakLesson(item.word).play();
  }

  function checkSpelling() {
    if (spellOk) return;
    const ok = norm(typed) === norm(item.word);
    setSpellTries((t) => t + 1);
    if (ok) {
      setSpellOk(true);
      if (judged === true && spellTries === 0) setPassedCount((p) => p + 1);
    }
  }

  async function saveWord() {
    if (!uid || saved) return;
    try {
      await addNotebookEntry({
        source: "real-word",
        categoryIds: ["vocabulary"],
        titleEn: item.word,
        titleTh: item.meaningTh,
        bodyEn: item.meaningEn,
        bodyTh: item.meaningTh,
        userNote: "",
      });
      setSaved(true);
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }

  function next() {
    sfxTransition();
    if (index + 1 >= total) return finish();
    saveUnitResume("realword", tier, unit, { index: index + 1, a: passedCount });
    setIndex((i) => i + 1);
    resetItem();
  }

  function finish() {
    setFinished(true);
    if (!rewarded.current) {
      rewarded.current = true;
      sfxCelebrate("md");
      const pct = total ? Math.round((passedCount / total) * 100) : 0;
      saveUnitScore(uid, "realword", tier, unit, pct).catch(() => {});
      awardXp(uid, XP.auto(pct)).catch(() => {});
      clearUnitResume("realword", tier, unit);
    }
  }

  if (finished) {
    const pct = total ? Math.round((passedCount / total) * 100) : 0;
    return (
      <div className="py-8">
        <CelebrateMascot
          title={pct >= 80 ? "สุดยอด! 🎉" : "เก่งมาก!"}
          subtitle="คุณจับผิดการสะกดและเรียนคำใหม่ได้เยี่ยม ยิ่งฝึกยิ่งจำแม่น!"
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">ทำถูก {passedCount} จาก {total} คำ</p>
        </div>
        <div className="text-center">
          <Link
            href="/practice/lessons/real-word"
            className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]"
          >
            เสร็จแล้ว · กลับไปเลือกด่าน
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div key={index} className="ep-step-slide-in">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">คำที่ {index + 1} / {total}</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-[#004AAD]">{item.level}</span>
          {combo >= 2 ? (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-700">🔥 {combo}</span>
          ) : null}
        </div>
        <span className="text-xs font-bold text-slate-500">ถูก {passedCount}</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#004AAD] transition-all duration-300"
          style={{ width: `${((index + (resolved ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      {judged === null ? (
        <div className="mb-4 rounded-xl bg-blue-50 p-3.5 text-sm font-semibold text-[#004AAD]">
          คำนี้สะกด <strong>ถูก</strong> หรือ <strong>ผิด</strong>? แตะเลือกด้านล่าง
        </div>
      ) : null}

      <div
        className={`rounded-2xl border-2 p-8 text-center shadow-sm transition-colors ${
          judged === true ? "border-emerald-500 bg-emerald-50" : judged === false ? "border-rose-500 bg-rose-50" : "border-slate-200 bg-white"
        }`}
      >
        <p className={`text-4xl font-black text-slate-900 ${judged !== null && shownWrong ? "text-rose-600 line-through" : ""}`}>{shown}</p>
        {judged !== null && shownWrong ? <p className="mt-2 text-3xl font-black text-emerald-600">{item.word}</p> : null}
        <button
          type="button"
          onClick={() => speakLesson(item.word).play()}
          className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800"
        >
          <span>🔊</span> ฟังเสียง
        </button>
      </div>

      {judged === null ? (
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => judge(true)}
            className="flex-1 rounded-2xl border-2 border-emerald-500 bg-emerald-50 py-5 text-center shadow-sm transition active:scale-95"
          >
            <span className="block text-3xl font-black">✓</span>
            <span className="mt-1 block text-sm font-black text-slate-900">สะกดถูก</span>
          </button>
          <button
            type="button"
            onClick={() => judge(false)}
            className="flex-1 rounded-2xl border-2 border-rose-500 bg-rose-50 py-5 text-center shadow-sm transition active:scale-95"
          >
            <span className="block text-3xl font-black">✗</span>
            <span className="mt-1 block text-sm font-black text-slate-900">สะกดผิด</span>
          </button>
        </div>
      ) : null}

      {judged !== null ? (
        <div className={`mt-4 rounded-xl p-3.5 text-sm font-semibold ${judged ? "bg-blue-50 text-[#004AAD]" : "bg-slate-100 text-slate-600"}`}>
          {judged
            ? shownWrong
              ? "ใช่เลย! คำนี้สะกดผิด — พิมพ์คำที่ถูกต้องด้านล่างเพื่อไปต่อ"
              : "ถูกต้อง! คำนี้สะกดถูกแล้ว 🎉"
            : shownWrong
              ? "จริง ๆ แล้วคำนี้สะกดผิดนะ — คำที่ถูกอยู่ด้านบน ลองพิมพ์ให้ถูก"
              : "จริง ๆ แล้วคำนี้สะกดถูกแล้ว ไม่ต้องแก้"}
        </div>
      ) : null}

      {judged !== null ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">ความหมาย</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{item.meaningEn}</p>
          <p className="mt-1 text-sm text-slate-600">{item.meaningTh}</p>
          <button
            type="button"
            disabled={saved}
            onClick={saveWord}
            className={`mt-3 rounded-full border px-3.5 py-1.5 text-xs font-black ${
              saved ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-800"
            }`}
          >
            {saved ? "✓ บันทึกลงสมุดคำศัพท์แล้ว" : saveError ? "⚠ บันทึกไม่สำเร็จ — แตะลองใหม่" : "🔖 บันทึกลงสมุดคำศัพท์"}
          </button>
        </div>
      ) : null}

      {needsSpelling ? (
        <div className="mt-4 rounded-2xl border border-[#004AAD]/30 bg-blue-50 p-4">
          <p className="mb-2.5 text-sm font-black text-[#004AAD]">พิมพ์คำที่สะกดถูกต้อง</p>
          <input
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              if (spellOk) setSpellOk(false);
            }}
            disabled={spellOk}
            placeholder="พิมพ์คำที่นี่…"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={`w-full rounded-xl border-[1.5px] px-3.5 py-3 text-lg font-bold text-slate-900 focus:outline-none ${
              spellOk ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
            }`}
          />
          {spellOk ? (
            <p className="mt-2 text-sm font-bold text-emerald-600">✓ สะกดถูกต้อง! กด &ldquo;คำถัดไป&rdquo; ได้เลย</p>
          ) : spellTries > 0 ? (
            <p className="mt-2 text-sm font-bold text-rose-600">ยังไม่ถูก — ดูคำที่ถูกด้านบนแล้วลองอีกครั้ง</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        {resolved ? (
          <button type="button" onClick={next} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
            {index + 1 >= total ? "ดูสรุป →" : "คำถัดไป →"}
          </button>
        ) : needsSpelling ? (
          <button
            type="button"
            disabled={!norm(typed).length}
            onClick={checkSpelling}
            className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40"
          >
            {norm(typed).length ? "ตรวจการสะกด" : "พิมพ์คำที่ถูกต้องก่อน"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
