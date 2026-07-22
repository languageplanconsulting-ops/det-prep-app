"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { splitTemplate } from "@/lib/cloze-template";
import { fitbPrefix, fitbRemainderLength, scoreFitb, type MissingWord } from "@/lib/fitb-lesson-scoring";
import { speakLesson } from "@/lib/lesson-audio";
import { fetchSeenKeys, filterUnseen, itemKey, markItemSeen } from "@/lib/lesson-seen";
import { useLessonUserId } from "@/lib/lesson-user";
import { clearUnitResume, loadUnitResume, saveUnitResume, saveUnitScore } from "@/lib/lessons-progress";
import { addNotebookEntry } from "@/lib/notebook-storage";
import { readWriteBlankMode, readWriteUnit, type ReadWriteBlank, type ReadWriteItem, type ReadWriteTier, type ReadWriteVocab } from "@/lib/readwrite-lessons";
import { OverlayBackdrop } from "@/components/ui/OverlayBackdrop";
import { TypedBlank, TypedBlankHints } from "./TypedBlank";

const TOPIC = "readwrite";
type Phase = "cloze" | "review";

export function ReadWriteLessonRunner({ tier, unit }: { tier: ReadWriteTier; unit: number }) {
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

  const items = filterUnseen(readWriteUnit(tier, unit), (l) => itemKey("readwrite", l.id), seenKeys);
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
  // Key by the resolved item set: the seen-set (and thus `items`) resolves in
  // two phases (local cache, then DB once `uid` loads), so items[0] can change
  // right after mount. Remounting keeps the player's lazy first-item state in
  // sync with the item it's actually showing. See DictationLessonRunner.
  const playerKey = items.map((l) => l.id).join(",");
  return <Player key={playerKey} tier={tier} unit={unit} items={items} uid={uid} />;
}

function Player({ tier, unit, items, uid }: { tier: ReadWriteTier; unit: number; items: ReadWriteItem[]; uid: string | null }) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("cloze");
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);

  const [picks, setPicks] = useState<(string | null)[]>([]);
  const [activeBlank, setActiveBlank] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const [typed, setTyped] = useState<string[]>([]);
  const [hintsShown, setHintsShown] = useState<Set<number>>(new Set());
  const [savedBlanks, setSavedBlanks] = useState<Set<string>>(new Set());

  const [vocabOpen, setVocabOpen] = useState<ReadWriteVocab | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  const item = items[index]!;
  const rewarded = useRef(false);

  // A passage now mixes both blank kinds: tap-a-word dropdowns for grammar and
  // type-the-remainder boxes for vocabulary.
  const modes = useMemo(() => item.blanks.map(readWriteBlankMode), [item.blanks]);
  const fillWords = useMemo<MissingWord[]>(
    () => item.blanks.map((b) => ({ correctWord: b.answer, prefix_length: b.prefixLength ?? 2, explanationThai: b.meaningTh ?? b.ruleTh })),
    [item.blanks],
  );
  const hints = useMemo(
    () =>
      item.blanks
        .map((b, i) => ({ blank: i, th: b.meaningTh ?? b.ruleTh }))
        .filter((h, i) => modes[i] === "type" && !!h.th),
    [item.blanks, modes],
  );

  useEffect(() => {
    setPhase("cloze");
    setPicks(new Array(item.blanks.length).fill(null));
    setActiveBlank(null);
    setChecked(false);
    setTyped(new Array(item.blanks.length).fill(""));
    setHintsShown(new Set());
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const r = loadUnitResume(TOPIC, tier, unit);
    if (r && r.index > 0 && r.index < total) {
      setIndex(r.index);
      setCompleted(r.a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Typed blanks are graded by the FITB scorer; dropdown blanks are exact-match. */
  const submitted = useMemo(
    () => fillWords.map((w, i) => (modes[i] === "type" ? fitbPrefix(w) + (typed[i] ?? "") : w.correctWord)),
    [fillWords, modes, typed],
  );
  const typedMarks = useMemo(() => (checked ? scoreFitb(submitted, fillWords).marks : null), [checked, submitted, fillWords]);

  const wrongBlanks = useMemo(() => {
    const s = new Set<number>();
    if (!checked) return s;
    item.blanks.forEach((b, i) => {
      const ok = modes[i] === "choose" ? picks[i] === b.answer : typedMarks?.[i]?.grade === "exact";
      if (!ok) s.add(i);
    });
    return s;
  }, [checked, picks, typedMarks, item.blanks, modes]);

  const allAnswered =
    item.blanks.length > 0 &&
    item.blanks.every((_, i) =>
      modes[i] === "choose" ? picks[i] !== null : fitbRemainderLength(fillWords[i]!) === 0 || (typed[i] ?? "").length > 0,
    );

  function pick(blank: number, option: string) {
    setPicks((p) => {
      const n = [...p];
      n[blank] = option;
      return n;
    });
    setActiveBlank(null);
  }

  function toggleHint(blank: number) {
    setHintsShown((s) => {
      const n = new Set(s);
      if (n.has(blank)) n.delete(blank);
      else n.add(blank);
      return n;
    });
  }

  function check() {
    markItemSeen(uid, itemKey("readwrite", item.id), "readwrite", "manual_browse").catch(() => {});
    setChecked(true);
    const marks = scoreFitb(submitted, fillWords).marks;
    const allOk = item.blanks.every((b, i) => (modes[i] === "choose" ? picks[i] === b.answer : marks[i]?.grade === "exact"));
    if (allOk) {
      sfxCorrect();
      setCompleted((c) => c + 1);
      setPhase("review");
    } else {
      sfxWrong();
    }
  }

  /** Keep what was right, clear only the blanks that were wrong. */
  function retry() {
    const wrong = wrongBlanks;
    setTyped((p) => p.map((v, i) => (modes[i] === "type" && wrong.has(i) ? "" : v)));
    setPicks((p) => p.map((v, i) => (modes[i] === "choose" && wrong.has(i) ? null : v)));
    setChecked(false);
  }

  async function saveFillBlank(blank: ReadWriteBlank) {
    if (!uid || savedBlanks.has(blank.answer)) return;
    try {
      await addNotebookEntry({
        source: "writing-read-and-write",
        categoryIds: [blank.kind === "grammar" ? "grammar" : "vocabulary"],
        titleEn: blank.answer,
        titleTh: blank.ruleTh,
        bodyEn: blank.ruleEn,
        bodyTh: blank.ruleTh,
        userNote: "",
      });
      setSavedBlanks((s) => new Set(s).add(blank.answer));
    } catch {
      /* best-effort */
    }
  }

  async function saveVocab(v: ReadWriteVocab) {
    if (!uid || savedWords.has(v.word)) return;
    try {
      await addNotebookEntry({
        source: "writing-read-and-write",
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
          title="เยี่ยมมาก!"
          subtitle="คุณได้เห็นโครงเรียงความที่ดี พร้อมเหตุผลของทุกคำที่เลือก ลองนำโครงและสำนวนเหล่านี้ไปเขียนด้วยหัวข้อของคุณเอง"
        />
        <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-slate-50 p-6">
          <p className="text-4xl font-black text-[#004AAD]">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">เขียนถูกครบ {completed} จาก {total} เรียงความ</p>
        </div>
        <div className="text-center">
          <Link href="/practice/lessons/how-to-write" className="mt-6 inline-block rounded-xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-[#FFCC00]">
            เสร็จแล้ว · กลับไปเลือกด่าน
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div key={index} className="ep-step-slide-in">
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>ข้อ {index + 1} / {total}</span>
        <span>ผ่านแล้ว {completed}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#004AAD] transition-all" style={{ width: `${((index + (phase === "review" ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <div className="mb-4 rounded-2xl bg-slate-900 p-4 text-white">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#FFCC00]">โจทย์เขียน</p>
        <p className="mt-1.5 text-sm font-bold leading-relaxed">{item.topic}</p>
        <p className="mt-1 text-xs text-slate-300">{item.topicTh}</p>
      </div>

      {phase === "cloze" ? (
        <>
          <p className="mb-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-[#004AAD]">อ่านเรียงความตัวอย่าง แล้วเติมให้ครบ — ช่องสีน้ำเงินให้พิมพ์คำศัพท์ (มีตัวอักษรขึ้นต้นให้) ส่วนช่องประให้แตะเลือกคำ</p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-y-3 text-[15px] leading-8 text-slate-800">
              {splitTemplate(item.template).map((part, pi) => {
                if ("text" in part) return <span key={pi}>{part.text}</span>;
                const b = part.blank;
                if (modes[b] === "type") {
                  return (
                    <TypedBlank
                      key={pi}
                      word={fillWords[b]!}
                      value={typed[b] ?? ""}
                      disabled={checked}
                      grade={checked ? (typedMarks?.[b]?.grade === "exact" ? "exact" : "wrong") : undefined}
                      label={`ช่องที่ ${b + 1}`}
                      onChange={(v) => setTyped((p) => { const n = [...p]; n[b] = v; return n; })}
                    />
                  );
                }
                return (
                  <button
                    key={pi}
                    type="button"
                    disabled={checked}
                    onClick={() => setActiveBlank(activeBlank === b ? null : b)}
                    className={`mx-0.5 rounded-md border-[1.5px] px-2 py-0.5 text-sm font-bold ${
                      checked && wrongBlanks.has(b)
                        ? "border-rose-500 bg-rose-50"
                        : checked
                          ? "border-emerald-500 bg-emerald-50"
                          : picks[b]
                            ? "border-[#004AAD] bg-blue-50"
                            : "border-dashed border-[#004AAD] bg-blue-50 text-[#004AAD]"
                    }`}
                  >
                    {picks[b] ?? "แตะเลือก ▾"}
                  </button>
                );
              })}
            </div>
          </div>

          {!checked ? <TypedBlankHints hints={hints} shown={hintsShown} onToggle={toggleHint} /> : null}

          {checked && wrongBlanks.size > 0 ? (
            <div className="mt-4 rounded-xl border border-rose-500 bg-rose-50 p-4">
              <p className="mb-2 text-sm font-black text-rose-700">✕ ยังไม่ถูก — ดูช่องที่ยังไม่ถูก แล้วเก็บลงสมุด</p>
              {[...wrongBlanks].map((i) => {
                const b = item.blanks[i]!;
                const grammar = b.kind === "grammar" || modes[i] === "choose";
                const saved = savedBlanks.has(b.answer);
                return (
                  <div key={i} className="mb-2 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-block rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-black text-white">ช่องที่ {i + 1} · เฉลย: {b.answer}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${grammar ? "bg-blue-100 text-[#004AAD]" : "bg-amber-100 text-amber-800"}`}>{grammar ? "ไวยากรณ์" : "คำศัพท์"}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-800">{b.ruleEn}</p>
                    <p className="mt-1 text-sm text-slate-600">{b.meaningTh ?? b.ruleTh}</p>
                    <button type="button" disabled={saved} onClick={() => saveFillBlank(b)} className={`mt-2 rounded-full border px-3 py-1.5 text-xs font-black ${saved ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}>
                      {saved ? "✓ บันทึกแล้ว" : `🔖 บันทึกลงสมุด${grammar ? "ไวยากรณ์" : "คำศัพท์"}`}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="mb-2 text-sm font-bold text-slate-800">เยี่ยม! นี่คือเรียงความตัวอย่างฉบับสมบูรณ์ — อ่านซ้ำเพื่อจำโครงและสำนวน</p>
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
            {index + 1 >= total ? "ดูสรุป →" : "เรียงความถัดไป →"}
          </button>
        ) : checked ? (
          <button type="button" onClick={retry} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]">
            แก้แล้วลองใหม่
          </button>
        ) : (
          <button type="button" disabled={!allAnswered} onClick={check} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00] disabled:opacity-40">
            {allAnswered ? "ตรวจคำตอบ" : "เติมให้ครบก่อน"}
          </button>
        )}
      </div>

      {activeBlank !== null && phase === "cloze" && modes[activeBlank] === "choose" ? (
        <OverlayBackdrop onDismiss={() => setActiveBlank(null)} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
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
        </OverlayBackdrop>
      ) : null}

      {vocabOpen ? (
        <OverlayBackdrop onDismiss={() => setVocabOpen(null)} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
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
        </OverlayBackdrop>
      ) : null}
    </div>
  );
}
