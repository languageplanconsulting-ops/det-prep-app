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
import { mainIdeaUnit, type MainIdeaItem, type MainIdeaTier } from "@/lib/main-idea-lessons";
import { MISSING_PARAGRAPH_ITEMS } from "@/lib/missing-paragraph-lessons-data";
import { phraseWordRange } from "@/lib/passage-text";

const TOPIC = "mainidea";
type Phase = "tutorial" | "question";

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function MainIdeaLessonRunner({ tier, unit }: { tier: MainIdeaTier; unit: number }) {
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

  const items = filterUnseen(mainIdeaUnit(tier, unit), (l) => itemKey("mainidea", l.id), seenKeys);
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

function Player({ tier, unit, items, uid }: { tier: MainIdeaTier; unit: number; items: MainIdeaItem[]; uid: string | null }) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("tutorial");
  const [tutStep, setTutStep] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const rewarded = useRef(false);

  const item = items[index]!;
  const passage = MISSING_PARAGRAPH_ITEMS.find((p) => p.id === item.refId);
  const displayOptions = useMemo(() => shuffled(item.options), [item.id]);

  useEffect(() => {
    setPhase("tutorial");
    setTutStep(0);
    setPicked(null);
    setChecked(false);
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

  const keywords = passage.keywords;
  const activeKeyword = phase === "tutorial" ? keywords[tutStep] : undefined;
  const highlights: PassageHighlight[] = [];
  if (activeKeyword) {
    const range = phraseWordRange(activeKeyword.paragraph === 1 ? passage.paragraph1 : passage.paragraph2, activeKeyword.phrase);
    if (range) highlights.push({ paragraph: activeKeyword.paragraph, start: range[0], end: range[1], color: "yellow" });
  }

  function nextTutStep() {
    if (tutStep + 1 >= keywords.length) setPhase("question");
    else setTutStep((s) => s + 1);
  }
  function replayTutorial() {
    setPicked(null);
    setChecked(false);
    setTutStep(0);
    setPhase("tutorial");
  }

  function check() {
    markItemSeen(uid, itemKey("mainidea", item.id), "mainidea", "manual_browse").catch(() => {});
    if (picked === null) return;
    setChecked(true);
    if (displayOptions[picked]!.correct) {
      sfxCorrect();
      setCompleted((c) => c + 1);
    } else {
      sfxWrong();
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
          title="จับใจความเก่งมาก!"
          subtitle="คุณแยกใจความสำคัญออกจากรายละเอียดปลีกย่อยได้แล้ว"
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6 text-center">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">ตอบถูก {completed} จาก {total} เรื่อง</p>
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

  return (
    <div key={index} className="ep-step-slide-in">
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>ข้อ {index + 1} / {total}</span>
        <span>ผ่านแล้ว {completed}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#004AAD] transition-all" style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <p className="text-base font-bold text-slate-900">{passage.title}</p>
      <p className="mb-3 text-xs text-slate-500">{passage.titleTh}</p>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PassageWords paragraph1={passage.paragraph1} paragraph2={passage.paragraph2} highlights={highlights} />
      </div>

      {phase === "tutorial" ? (
        <div className="mt-4 flex gap-3 rounded-2xl bg-slate-900 p-4 text-white">
          <span className="text-2xl">🧑‍🏫</span>
          <div className="flex-1">
            <div className="mb-2 flex gap-1.5">
              {keywords.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === tutStep ? "w-4 bg-[#FFCC00]" : "w-1.5 bg-white/30"}`} />
              ))}
            </div>
            <p className="text-sm font-black">คำใบ้ {tutStep + 1}/{keywords.length}: &ldquo;{activeKeyword?.phrase}&rdquo;</p>
            <p className="mt-1.5 text-xs text-slate-300">{activeKeyword?.rationaleEn}</p>
            <p className="mt-1 text-xs text-slate-300">{activeKeyword?.rationaleTh}</p>
            {tutStep > 0 ? (
              <button type="button" onClick={() => setTutStep((s) => Math.max(0, s - 1))} className="mt-2 text-xs font-bold text-[#FFCC00]">
                ← ย้อนกลับ
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <p className="mb-2 mt-4 text-sm font-bold text-slate-800">อะไรคือใจความสำคัญ / ชื่อเรื่องที่เหมาะสมที่สุดของบทความนี้?</p>
          <div className="space-y-2">
            {displayOptions.map((o, i) => {
              const state = !checked ? (picked === i ? "selected" : "idle") : i === correctIdx ? "correct" : picked === i ? "wrong" : "idle";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={checked}
                  onClick={() => setPicked(i)}
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
              <p className="mb-2 text-sm font-black">{picked !== null && displayOptions[picked]!.correct ? "✓ ถูกต้อง!" : "✕ ยังไม่ถูก — นี่คือรายละเอียด ไม่ใช่ใจความสำคัญ"}</p>
              {picked !== null ? (
                <>
                  <p className="text-sm text-slate-700">{displayOptions[picked]!.rationaleEn}</p>
                  <p className="mt-1 text-sm text-slate-600">{displayOptions[picked]!.rationaleTh}</p>
                </>
              ) : null}
              {picked !== null && !displayOptions[picked]!.correct ? (
                <div className="mt-2 rounded-lg bg-white p-3">
                  <p className="mb-1 text-xs font-black text-emerald-600">ใจความสำคัญที่ถูกต้อง: {displayOptions[correctIdx]!.text}</p>
                  <p className="text-sm text-slate-700">{displayOptions[correctIdx]!.rationaleEn}</p>
                  <p className="mt-1 text-sm text-slate-600">{displayOptions[correctIdx]!.rationaleTh}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <div className="mt-5">
        {phase === "tutorial" ? (
          <button type="button" onClick={nextTutStep} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
            {tutStep + 1 >= keywords.length ? "เริ่มทำโจทย์ →" : "ถัดไป →"}
          </button>
        ) : !checked ? (
          <button type="button" disabled={picked === null} onClick={check} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40">
            {picked !== null ? "ตรวจคำตอบ" : "เลือกคำตอบก่อน"}
          </button>
        ) : picked !== null && displayOptions[picked]!.correct ? (
          <button type="button" onClick={next} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
            {index + 1 >= total ? "ดูสรุป →" : "ถัดไป →"}
          </button>
        ) : (
          <button type="button" onClick={replayTutorial} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]">
            ย้อนดูคำใบ้อีกครั้ง
          </button>
        )}
      </div>
    </div>
  );
}
