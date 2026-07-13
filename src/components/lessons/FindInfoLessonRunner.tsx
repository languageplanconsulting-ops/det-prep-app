"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PassageWords, type PassageHighlight } from "@/components/lessons/PassageWords";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { useLessonUserId } from "@/lib/lesson-user";
import { fetchSeenKeys, filterUnseen, itemKey, markItemSeen } from "@/lib/lesson-seen";
import { clearUnitResume, loadUnitResume, saveUnitResume, saveUnitScore } from "@/lib/lessons-progress";
import { findInfoUnit, type FindInfoItem, type FindInfoTier } from "@/lib/find-info-lessons";
import { MISSING_PARAGRAPH_ITEMS } from "@/lib/missing-paragraph-lessons-data";
import { phraseWordRange } from "@/lib/passage-text";
import { addNotebookEntry } from "@/lib/notebook-storage";

const TOPIC = "findinfo";
const EXTRA_WORD_TOLERANCE = 5;
type Selection = { paragraph: 1 | 2; start: number; end: number } | null;

export function FindInfoLessonRunner({ tier, unit }: { tier: FindInfoTier; unit: number }) {
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

  const items = filterUnseen(findInfoUnit(tier, unit), (l) => itemKey("findinfo", l.id), seenKeys);
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
  // Key by the resolved item set: the seen-set (and thus `items`) resolves in
  // two phases (local cache, then DB once `uid` loads), so items[0] can change
  // right after mount. Remounting keeps the player's lazy first-item state in
  // sync with the item it's actually showing. See DictationLessonRunner.
  const playerKey = items.map((l) => l.id).join(",");
  return <Player key={playerKey} tier={tier} unit={unit} items={items} uid={uid} />;
}

function Player({ tier, unit, items, uid }: { tier: FindInfoTier; unit: number; items: FindInfoItem[]; uid: string | null }) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [saved, setSaved] = useState(false);
  const rewarded = useRef(false);

  const item = items[index]!;
  const passage = MISSING_PARAGRAPH_ITEMS.find((p) => p.id === item.refId);

  useEffect(() => {
    setSelection(null);
    setChecked(false);
    setIsCorrect(false);
    setSaved(false);
  }, [index]);

  useEffect(() => {
    const r = loadUnitResume(TOPIC, tier, unit);
    if (r && r.index > 0 && r.index < total) {
      setIndex(r.index);
      setCompleted(r.a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!passage) return <div className="py-16 text-center text-sm text-slate-400">ไม่มีข้อในด่านนี้</div>;

  const targetRange = phraseWordRange(item.answerParagraph === 1 ? passage.paragraph1 : passage.paragraph2, item.answerPhrase)!;

  function onWordPress(paragraph: 1 | 2, wordIdx: number) {
    if (checked) return;
    setSelection((cur) => {
      if (!cur || cur.paragraph !== paragraph) return { paragraph, start: wordIdx, end: wordIdx };
      if (wordIdx < cur.start) return { paragraph, start: wordIdx, end: cur.end };
      if (wordIdx > cur.end) return { paragraph, start: cur.start, end: wordIdx };
      return { paragraph, start: wordIdx, end: wordIdx };
    });
  }

  function check() {
    markItemSeen(uid, itemKey("findinfo", item.id), "findinfo", "manual_browse").catch(() => {});
    if (!selection) return;
    const covers =
      selection.paragraph === item.answerParagraph &&
      selection.start <= targetRange[0] &&
      selection.end >= targetRange[1] &&
      selection.end - selection.start - (targetRange[1] - targetRange[0]) <= EXTRA_WORD_TOLERANCE;
    setChecked(true);
    setIsCorrect(covers);
    if (covers) {
      sfxCorrect();
      setCompleted((c) => c + 1);
    } else {
      sfxWrong();
    }
  }

  async function saveVocab() {
    if (!uid || saved) return;
    try {
      await addNotebookEntry({
        source: "reading-comprehension",
        categoryIds: ["vocabulary"],
        titleEn: item.paraphrase.passageTerm,
        titleTh: item.paraphrase.th,
        bodyEn: `${item.paraphrase.questionTerm} = ${item.paraphrase.passageTerm} — ${item.paraphrase.rationaleEn}`,
        bodyTh: item.paraphrase.rationaleTh,
        userNote: "",
      });
      setSaved(true);
    } catch {
      /* best-effort */
    }
  }

  function next() {
    sfxTransition();
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
          title="สายตาแม่นมาก!"
          subtitle="คุณฝึกจับคำพ้องความหมายในเนื้อเรื่องแล้ว ลองใช้ทักษะนี้กับบทอ่านข้อสอบจริงดูนะ"
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6 text-center">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">หาข้อมูลถูก {completed} จาก {total} ข้อ</p>
        </div>
        <div className="text-center">
          <Link href="/practice/lessons/reading-skills" className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]">
            เสร็จแล้ว · กลับไปเลือกด่าน
          </Link>
        </div>
      </div>
    );
  }

  const highlights: PassageHighlight[] = [];
  if (checked && !isCorrect) highlights.push({ paragraph: item.answerParagraph, start: targetRange[0], end: targetRange[1], color: "green" });
  if (selection) highlights.push({ paragraph: selection.paragraph, start: Math.min(selection.start, selection.end), end: Math.max(selection.start, selection.end), color: checked ? (isCorrect ? "green" : "red") : "blue" });

  return (
    <div key={index} className="ep-step-slide-in">
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>ข้อ {index + 1} / {total}</span>
        <span>ผ่านแล้ว {completed}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#004AAD] transition-all" style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <div className="mb-4 rounded-2xl bg-slate-900 p-4 text-white">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#FFCC00]">โจทย์</p>
        <p className="mt-1.5 text-sm font-bold leading-relaxed">{item.questionEn}</p>
        <p className="mt-1 text-xs text-slate-300">{item.questionTh}</p>
      </div>

      <p className="mb-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-[#004AAD]">แตะคำแรก แล้วแตะคำสุดท้ายของข้อความที่คิดว่าใช่ เพื่อไฮไลต์ทั้งประโยค</p>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PassageWords paragraph1={passage.paragraph1} paragraph2={passage.paragraph2} highlights={highlights} onWordPress={onWordPress} />
      </div>

      {checked ? (
        <div className={`mt-4 rounded-xl border p-4 ${isCorrect ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50"}`}>
          <p className="mb-2 text-sm font-black">{isCorrect ? "✓ ถูกต้อง!" : "✕ ยังไม่ตรงจุด — เฉลยไฮไลต์สีเขียวไว้ให้แล้ว"}</p>
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 text-sm font-black text-[#004AAD]">
            <span>{item.paraphrase.questionTerm}</span>
            <span className="text-slate-400">=</span>
            <span>{item.paraphrase.passageTerm}</span>
            <span className="text-slate-400">=</span>
            <span className="text-amber-700">{item.paraphrase.th}</span>
          </div>
          <p className="text-sm text-slate-700">{item.paraphrase.rationaleEn}</p>
          <p className="mt-1 text-sm text-slate-600">{item.paraphrase.rationaleTh}</p>
          <button
            type="button"
            disabled={saved}
            onClick={saveVocab}
            className="mt-3 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-black text-amber-800 disabled:opacity-60"
          >
            {saved ? "บันทึกลงสมุดแล้ว ✓" : "＋ บันทึกคำนี้ลงสมุดคำศัพท์"}
          </button>
        </div>
      ) : null}

      <div className="mt-5">
        {checked ? (
          isCorrect ? (
            <button type="button" onClick={next} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
              {index + 1 >= total ? "ดูสรุป →" : "ข้อถัดไป →"}
            </button>
          ) : (
            <button type="button" onClick={() => { setChecked(false); setSelection(null); }} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]">
              ลองใหม่
            </button>
          )
        ) : (
          <button type="button" disabled={!selection} onClick={check} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40">
            {selection ? "ตรวจคำตอบ" : "แตะเลือกข้อความก่อน"}
          </button>
        )}
      </div>
    </div>
  );
}
