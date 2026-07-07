"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CAMPUS_VOCAB_SCENARIOS, campusVocabScenario, type CampusVocabBlank } from "@/lib/campus-vocab";
import { fitbPrefix, fitbRemainderLength, scoreFitb, type MissingWord } from "@/lib/fitb-lesson-scoring";
import { speakLesson } from "@/lib/lesson-audio";
import { itemKey, markItemSeen } from "@/lib/lesson-seen";
import { useLessonUserId } from "@/lib/lesson-user";
import { saveUnitScore } from "@/lib/lessons-progress";
import { addNotebookEntry } from "@/lib/notebook-storage";

const TOPIC = "campus-vocab";
const TIER = "all";
const BLANK_MARK = "[BLANK 1]";

const CORRECT_LINES = ["เก่งมาก! เติมถูกต้อง ไปข้อต่อไปกันเลย", "ถูกต้องเป๊ะ! ลองข้อถัดไป", "เยี่ยม! คำถัดไปมาแล้ว"];
const WRONG_LINES = ["ไม่เป็นไร ลองดูเฉลยแล้วไปข้อต่อไปกัน", "ใกล้เคียงแล้ว ดูคำอธิบายแล้วไปต่อ", "พลาดได้ ค่อยๆ จำคำนี้ไว้แล้วไปข้อถัดไป"];

export function CampusVocabLessonRunner({ scenarioId }: { scenarioId: string }) {
  const uid = useLessonUserId();
  const scenario = useMemo(() => campusVocabScenario(scenarioId), [scenarioId]);
  const scenarioIndex = useMemo(() => CAMPUS_VOCAB_SCENARIOS.findIndex((s) => s.id === scenarioId), [scenarioId]);

  const [phase, setPhase] = useState<"intro" | "question" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const blank: CampusVocabBlank | null = scenario?.blanks[index] ?? null;
  const word: MissingWord | null = blank
    ? { correctWord: blank.answer, prefix_length: blank.prefixLength, synonyms: blank.synonyms, explanationThai: blank.ruleTh }
    : null;
  const remainderLen = word ? fitbRemainderLength(word) : 0;

  useEffect(() => {
    setTyped("");
    setChecked(false);
    setSaved(false);
    setSaveError(false);
  }, [index]);

  if (!scenario || !blank || !word) {
    return (
      <div className="py-16 text-center">
        <p className="font-bold text-slate-700">ไม่พบสถานการณ์นี้</p>
        <Link href="/practice/lessons/campus-vocab" className="mt-4 inline-block text-sm font-bold text-[#004AAD]">
          กลับไปเลือกเรื่อง
        </Link>
      </div>
    );
  }

  const grade = checked ? scoreFitb([fitbPrefix(word) + typed], [word]).marks[0]! : null;
  const isExact = grade?.grade === "exact";
  const allTyped = remainderLen === 0 || typed.length === remainderLen;
  const clueParts = blank.clueEn.split(BLANK_MARK);
  const clueBefore = clueParts[0] ?? "";
  const clueAfter = clueParts[1] ?? "";

  function checkAnswer() {
    if (!word) return;
    setChecked(true);
    if (scoreFitb([fitbPrefix(word) + typed], [word]).marks[0]!.grade === "exact") {
      setCorrectCount((c) => c + 1);
    }
  }

  function goNext() {
    if (scenario && index + 1 < scenario.blanks.length) {
      setIndex((i) => i + 1);
    } else {
      finish();
    }
  }

  function finish() {
    setPhase("done");
    const total = scenario?.blanks.length ?? 3;
    const pct = total ? Math.round((correctCount / total) * 100) : 0;
    saveUnitScore(uid, TOPIC, TIER, scenarioIndex, pct).catch(() => {});
    if (scenario) markItemSeen(uid, itemKey("campusvocab", scenario.id), "campusvocab", "manual_browse").catch(() => {});
  }

  async function saveToNotebook() {
    if (!uid || !blank || saved) return;
    try {
      await addNotebookEntry({
        source: "campus-vocab",
        categoryIds: ["vocabulary"],
        titleEn: blank.answer,
        titleTh: blank.ruleTh,
        bodyEn: blank.ruleEn,
        bodyTh: blank.ruleTh,
        userNote: "",
      });
      setSaved(true);
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }

  if (phase === "done") {
    const total = scenario.blanks.length;
    const pct = total ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="py-8 text-center">
        <p className="text-2xl font-bold">{pct === 100 ? "เก่งมาก ครบทุกคำ! 🎉" : "จบเรื่องนี้แล้ว!"}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">เติมถูก {correctCount} จาก {total} คำ — ลองเรื่องอื่นเพื่อฝึกคำศัพท์เพิ่มได้เลย</p>
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
        </div>
        <Link href="/practice/lessons/campus-vocab" className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]">
          เสร็จแล้ว · กลับไปเลือกเรื่อง
        </Link>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div>
        <p className="mb-3 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-[#004AAD]">อ่านสถานการณ์นี้ให้เข้าใจก่อน แล้วเราจะถาม 3 คำศัพท์เฉพาะที่เกี่ยวข้อง</p>
        <div className="rounded-2xl bg-slate-900 p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#FFCC00]">สถานการณ์</p>
          <p className="mt-2 text-sm font-bold leading-relaxed">{scenario.scenarioEn}</p>
          <p className="mt-2 text-xs text-slate-300">{scenario.scenarioTh}</p>
          <button
            type="button"
            onClick={() => speakLesson(scenario.scenarioEn).play()}
            className="mt-4 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white"
          >
            🔊 ฟังสถานการณ์
          </button>
        </div>
        <button
          type="button"
          onClick={() => setPhase("question")}
          className="mt-6 w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]"
        >
          เริ่มทำโจทย์ →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>คำที่ {index + 1} / {scenario.blanks.length}</span>
        <span>ถูก {correctCount}</span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-y-2 text-[15px] leading-8 text-slate-800">
          <span>{clueBefore}</span>
          <span className="mx-0.5 inline-flex items-center gap-0.5">
            <span className="font-bold text-[#004AAD]">{fitbPrefix(word)}</span>
            <input
              value={typed}
              disabled={checked}
              onChange={(e) => setTyped(e.target.value.slice(0, remainderLen))}
              className={`rounded-md border-b-2 bg-transparent px-1 text-center font-bold outline-none ${
                checked ? (isExact ? "border-emerald-500 text-emerald-700" : "border-rose-500 text-rose-700") : "border-[#004AAD]"
              }`}
              style={{ width: `${Math.max(2.5, remainderLen * 0.75)}em` }}
            />
          </span>
          <span>{clueAfter}</span>
        </div>
      </div>

      {checked ? (
        <div className={`mt-4 rounded-xl border p-4 ${isExact ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50"}`}>
          <p className={`mb-2 text-sm font-black ${isExact ? "text-emerald-700" : "text-rose-700"}`}>
            {isExact ? "✓ ถูกต้อง!" : `✕ เฉลย: ${blank.answer}`}
          </p>
          <p className="text-sm font-medium text-slate-800">{blank.ruleEn}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{blank.ruleTh}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {(isExact ? CORRECT_LINES : WRONG_LINES)[index % CORRECT_LINES.length]}
          </p>
          {!isExact ? (
            <button
              type="button"
              disabled={saved}
              onClick={saveToNotebook}
              className={`mt-3 rounded-full border px-3.5 py-1.5 text-xs font-black ${saved ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {saved ? "✓ บันทึกแล้ว" : saveError ? "⚠ บันทึกไม่สำเร็จ — แตะลองใหม่" : "🔖 บันทึกคำนี้ลงสมุด"}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        {checked ? (
          <button type="button" onClick={goNext} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
            {index + 1 >= scenario.blanks.length ? "ดูสรุป →" : "ข้อต่อไป →"}
          </button>
        ) : (
          <button type="button" disabled={!allTyped} onClick={checkAnswer} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40">
            {allTyped ? "ตรวจคำตอบ" : "เติมตัวอักษรให้ครบก่อน"}
          </button>
        )}
      </div>
    </div>
  );
}
