"use client";

import { useMemo, useState } from "react";

import { useAdminGateOverride } from "@/hooks/useAdminGateOverride";
import { inlineContentFor, type InlineExerciseContent } from "@/lib/course-plan/exercise-content";
import { rewriteIsCorrect, type RewriteItem } from "@/lib/course-plan/grammar-writing-bank";
import { DrillPhoto } from "@/components/course/DrillPhoto";
import {
  inflectionIsCorrect,
  type SpeakPatternItem,
} from "@/lib/course-plan/speak-pattern-bank";
import {
  endingIssueHintTh,
  pronunciationPassed,
  pronunciationScore,
} from "@/lib/pronunciation-match";

/**
 * Runs an exercise inside the session, so a learner never leaves the course to
 * answer questions and come back for the report.
 *
 * Covers the three auto-gradable banks: dictation (arrange the tokens),
 * fill-in-the-blank grammar (choose per blank), and real word (spot the correct
 * spelling). Speaking and writing still need their own runners — they are
 * marked as such rather than silently skipped.
 */
export function InlineExercise({
  exerciseKey,
  taskType,
  titleTh,
  gateTh,
  onDone,
  onCancel,
  hasNext = true,
  content: contentOverride,
  singleAttempt = false,
}: {
  exerciseKey: string;
  taskType: string | null;
  titleTh: string;
  gateTh?: string;
  /** correct / total, so the session can apply the gate. */
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
  /** False when this is the last outstanding item of the day. */
  hasNext?: boolean;
  /**
   * Ad-hoc content, bypassing the exerciseKey → questionsFor() curriculum
   * lookup — for a placement probe item that has no registered exerciseKey.
   */
  content?: InlineExerciseContent;
  /**
   * Reveal immediately on the first check and hide pre-answer hints, instead
   * of the normal 3-attempts-then-reveal loop. A placement probe is
   * deliberately single-shot (PROBE_PASS_RATIO=1) — unlimited retries would
   * let a student guess-and-check their way to a higher placement than their
   * actual starting ability.
   */
  singleAttempt?: boolean;
}) {
  const resolved = useMemo(
    () => inlineContentFor(exerciseKey, taskType),
    [exerciseKey, taskType],
  );
  const content = contentOverride ?? resolved;
  const override = useAdminGateOverride();

  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [attempts, setAttempts] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const [answer, setAnswer] = useState<string[]>([]);

  if (!content) {
    return (
      <Frame title={titleTh} onCancel={onCancel}>
        <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
          แบบฝึกนี้ยังทำในหน้านี้ไม่ได้ — ต้องใช้หน้าฝึกเฉพาะทาง (พูด/เขียน/โต้ตอบ)
        </p>
        <button
          type="button"
          onClick={() => onDone(1, 1)}
          className="mt-3 w-full rounded-full bg-slate-900 py-2.5 text-sm font-bold text-white"
        >
          ทำเสร็จแล้ว ทำเครื่องหมายว่าเรียบร้อย
        </button>
      </Frame>
    );
  }

  const total = content.items.length;
  const done = index >= total;

  if (done) {
    const pct = Math.round((correct / total) * 100);
    return (
      <Frame title={titleTh} onCancel={onCancel}>
        <div className="py-4 text-center">
          <p className="text-5xl">{pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">
            ถูก {correct} จาก {total} ข้อ
          </p>
          {gateTh && <p className="mt-2 text-[13px] text-slate-400">เกณฑ์ผ่าน: {gateTh}</p>}
        </div>
        <button
          type="button"
          onClick={() => onDone(correct, total)}
          className={`w-full rounded-full py-3 text-sm font-bold text-white ${
            hasNext ? "bg-[#004AAD]" : "bg-emerald-600"
          }`}
        >
          {hasNext ? "แบบฝึกถัดไป →" : "จบของวันนี้ 🎉"}
        </button>
      </Frame>
    );
  }

  function next(wasCorrect: boolean) {
    if (wasCorrect) setCorrect((c) => c + 1);
    setChecked(null);
    setAttempts(0);
    setGaveUp(false);
    setAnswer([]);
    setIndex((i) => i + 1);
  }

  /** A wrong answer costs an attempt; three exhausts them and reveals. */
  function grade(ok: boolean) {
    setChecked(ok);
    if (!ok) setAttempts((a) => a + 1);
  }
  const shared = {
    attempts,
    gaveUp,
    onRetry: () => setChecked(null),
    onGiveUp: () => setGaveUp(true),
  };

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={`${index + 1}/${total}`}>
      {override.enabled && (
        <button
          type="button"
          onClick={() => onDone(total, total)}
          className="mb-3 w-full rounded-full bg-amber-500 py-2 text-[12px] font-bold text-white"
        >
          ⚡ ข้ามแบบฝึกนี้ทั้งชุด (admin)
        </button>
      )}
      {/* key={index} on every item view.
          Each of these holds its own answer state — the typed sentence, the
          picked option, the per-blank text, the type/speak stage. Without a key
          React reuses the instance across questions, so question 2 opened
          pre-filled with question 1's answer (and SpeakPatternView opened
          already in "speak" mode showing the previous transcript). Remounting
          per question is what clears it; next() can only reset what the parent
          owns. */}
      {content.kind === "dictation" && (
        <DictationItem
          key={index}
          item={content.items[index]}
          answer={answer}
          setAnswer={setAnswer}
          checked={checked}
          onCheck={(ok) => grade(ok)}
          {...shared}
          onNext={() => next(checked === true)}
        />
      )}
      {content.kind === "realword" && (
        <RealWordItemView
          key={index}
          item={content.items[index]}
          checked={checked}
          onCheck={(ok) => grade(ok)}
          {...shared}
          singleAttempt={singleAttempt}
          onNext={() => next(checked === true)}
        />
      )}
      {content.kind === "rewrite" && (
        <RewriteItemView
          key={index}
          item={content.items[index]}
          checked={checked}
          onCheck={(ok) => grade(ok)}
          {...shared}
          onNext={() => next(checked === true)}
        />
      )}
      {content.kind === "speakPattern" && (
        <SpeakPatternView
          key={index}
          item={content.items[index]}
          checked={checked}
          onCheck={(ok) => grade(ok)}
          {...shared}
          onNext={() => next(checked === true)}
        />
      )}
      {content.kind === "grammar" && (
        <GrammarItemView
          key={index}
          item={content.items[index]}
          checked={checked}
          onCheck={(ok) => grade(ok)}
          {...shared}
          singleAttempt={singleAttempt}
          onNext={() => next(checked === true)}
        />
      )}
    </Frame>
  );
}

export function Frame({
  title,
  progress,
  onCancel,
  children,
}: {
  title: string;
  progress?: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-2 py-1 text-xs font-bold text-slate-400"
        >
          ← กลับ
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-bold text-slate-800">
          {title}
        </p>
        <span className="w-14 text-right text-[13px] font-bold text-slate-400">
          {progress ?? ""}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Arrange the scrambled tokens into the sentence. */
function DictationItem({
  item,
  answer,
  setAnswer,
  checked,
  onCheck,
  onNext,
  attempts,
  gaveUp,
  onRetry,
  onGiveUp,
}: {
  item: { answer: string; tokens: string[]; distractors: string[]; hintTh: string };
  answer: string[];
  setAnswer: (a: string[]) => void;
  checked: boolean | null;
  onCheck: (ok: boolean) => void;
  onNext: () => void;
  attempts?: number;
  gaveUp?: boolean;
  onRetry?: () => void;
  onGiveUp?: () => void;
}) {
  // Distractors sit after the real tokens in a stable order — no shuffling, so
  // the same item always presents identically.
  const pool = useMemo(() => [...item.tokens, ...item.distractors], [item]);
  const used = new Map<string, number>();
  for (const a of answer) used.set(a, (used.get(a) ?? 0) + 1);

  return (
    <div>
      <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500 ring-1 ring-slate-200">
        เรียงคำให้เป็นประโยคที่ถูกต้อง
      </p>

      <div className="mt-3 min-h-[56px] rounded-xl bg-white p-3 ring-1 ring-slate-300">
        <p className="text-[15px] font-bold text-slate-800">
          {answer.length ? answer.join(" ") : <span className="text-slate-300">แตะคำด้านล่าง…</span>}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {pool.map((tok, i) => {
          const avail = pool.filter((t) => t === tok).length - (used.get(tok) ?? 0);
          return (
            <button
              key={`${tok}-${i}`}
              type="button"
              disabled={checked !== null || avail <= 0}
              onClick={() => setAnswer([...answer, tok])}
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[13px] font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-30"
            >
              {tok}
            </button>
          );
        })}
      </div>

      {answer.length > 0 && checked === null && (
        <button
          type="button"
          onClick={() => setAnswer(answer.slice(0, -1))}
          className="mt-2 text-[13px] font-bold text-slate-400"
        >
          ↩︎ ลบคำสุดท้าย
        </button>
      )}

      <Verdict
        checked={checked}
        correctText={item.answer}
        hintTh={item.hintTh}
        onCheck={() => onCheck(answer.join(" ") === item.answer)}
        canCheck={answer.length > 0}
        onNext={onNext}
        attempts={attempts}
        gaveUp={gaveUp}
        onRetry={onRetry}
        onGiveUp={onGiveUp}
      />
    </div>
  );
}

/** Which spelling is the real word? */
function RealWordItemView({
  item,
  checked,
  onCheck,
  onNext,
  attempts,
  gaveUp,
  onRetry,
  onGiveUp,
  singleAttempt,
}: {
  item: { word: string; misspelling: string; meaningTh: string };
  checked: boolean | null;
  onCheck: (ok: boolean) => void;
  onNext: () => void;
  attempts?: number;
  gaveUp?: boolean;
  onRetry?: () => void;
  onGiveUp?: () => void;
  singleAttempt?: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  // Stable order: alphabetical, so the answer is not always in the same slot
  // but is also never random between attempts.
  const options = useMemo(
    () => [item.word, item.misspelling].sort((a, b) => a.localeCompare(b)),
    [item],
  );

  return (
    <div>
      <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500 ring-1 ring-slate-200">
        คำไหนสะกดถูก?
      </p>
      <div className="mt-3 space-y-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={checked !== null}
            onClick={() => setPicked(o)}
            className={`w-full rounded-xl px-4 py-3 text-left text-[15px] font-bold ring-1 transition ${
              picked === o
                ? "bg-sky-50 text-sky-900 ring-sky-400"
                : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-400"
            } disabled:opacity-70`}
          >
            {o}
          </button>
        ))}
      </div>
      <Verdict
        checked={checked}
        correctText={`${item.word} — ${item.meaningTh}`}
        onCheck={() => onCheck(picked === item.word)}
        canCheck={picked !== null}
        onNext={onNext}
        attempts={attempts}
        gaveUp={gaveUp}
        onRetry={onRetry}
        onGiveUp={onGiveUp}
        singleAttempt={singleAttempt}
      />
    </div>
  );
}

/** Five blanks: the first letters are given, the learner types the rest. */
function GrammarItemView({
  item,
  checked,
  onCheck,
  onNext,
  attempts,
  gaveUp,
  onRetry,
  onGiveUp,
  singleAttempt,
}: {
  item: {
    titleEn: string;
    passage: string;
    passageTh: string;
    blanks: {
      correctWord: string;
      clueTh: string;
      prefixLength: number;
      synonyms?: string[];
      explanationThai: string;
    }[];
  };
  checked: boolean | null;
  onCheck: (ok: boolean) => void;
  onNext: () => void;
  attempts?: number;
  gaveUp?: boolean;
  onRetry?: () => void;
  onGiveUp?: () => void;
  singleAttempt?: boolean;
}) {
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [hintFor, setHintFor] = useState<number | null>(null);
  const allTyped = item.blanks.every((_, i) => (typed[i] ?? "").trim().length > 0);

  const isRight = (i: number) => {
    const b = item.blanks[i];
    const given = b.correctWord.slice(0, b.prefixLength);
    const full = (given + (typed[i] ?? "")).trim().toLowerCase();
    return (
      full === b.correctWord.toLowerCase() ||
      (b.synonyms ?? []).some((s) => s.toLowerCase() === full)
    );
  };

  return (
    <div>
      <p className="text-[13px] font-bold text-slate-800">{item.titleEn}</p>
      <p className="text-[13px] text-slate-400">{item.passageTh}</p>
      <p className="mt-2 rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-700 ring-1 ring-slate-200">
        {item.passage}
      </p>

      <div className="mt-3 space-y-2.5">
        {item.blanks.map((b, i) => {
          const given = b.correctWord.slice(0, b.prefixLength);
          const ok = checked !== null && isRight(i);
          return (
            <div key={i}>
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[13px] font-bold text-slate-500">
                  ช่อง {i + 1}
                </span>
                <span
                  className={`flex min-w-0 flex-1 items-center gap-1 rounded-xl px-3 py-2 ring-1 ${
                    checked === null
                      ? "bg-white ring-slate-300"
                      : ok
                        ? "bg-emerald-50 ring-emerald-300"
                        : "bg-rose-50 ring-rose-300"
                  }`}
                >
                  <span className="shrink-0 text-[14px] font-bold text-slate-400">{given}</span>
                  <input
                    value={typed[i] ?? ""}
                    disabled={checked !== null}
                    onChange={(e) => setTyped({ ...typed, [i]: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-slate-800 outline-none"
                    placeholder="…"
                  />
                </span>
                {!singleAttempt && (
                  <button
                    type="button"
                    onClick={() => setHintFor(hintFor === i ? null : i)}
                    className="shrink-0 rounded-full px-2 py-1 text-[13px] font-bold text-slate-400"
                  >
                    💡
                  </button>
                )}
              </div>
              {!singleAttempt && hintFor === i && checked === null && (
                <p className="ml-16 mt-1 text-[13px] text-slate-500">{b.clueTh}</p>
              )}
              {checked !== null && (
                <p className="ml-16 mt-1 text-[13px] text-slate-500">
                  <strong>{b.correctWord}</strong> — {b.explanationThai}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Verdict
        checked={checked}
        correctText={item.blanks.map((b, i) => `${i + 1}. ${b.correctWord}`).join("  ·  ")}
        onCheck={() => onCheck(item.blanks.every((_, i) => isRight(i)))}
        canCheck={allTyped}
        onNext={onNext}
        attempts={attempts}
        gaveUp={gaveUp}
        onRetry={onRetry}
        onGiveUp={onGiveUp}
        singleAttempt={singleAttempt}
      />
    </div>
  );
}

/** Retype the sentence with the punctuation fixed. */
function RewriteItemView({
  item,
  checked,
  onCheck,
  onNext,
  attempts,
  gaveUp,
  onRetry,
  onGiveUp,
}: {
  item: RewriteItem;
  checked: boolean | null;
  onCheck: (ok: boolean) => void;
  onNext: () => void;
  attempts?: number;
  gaveUp?: boolean;
  onRetry?: () => void;
  onGiveUp?: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [showHint, setShowHint] = useState(false);

  return (
    <div>
      <DrillPhoto photoId={item.photoId} captionTh="ภาพที่ต้องบรรยาย" />
      <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500 ring-1 ring-slate-200">
        พิมพ์ประโยคใหม่ให้ถูกต้อง (เครื่องหมายวรรคตอนสำคัญ)
      </p>

      <p className="mt-3 rounded-xl bg-white p-3 text-[14px] font-bold leading-relaxed text-slate-800 ring-1 ring-slate-300">
        {item.prompt}
      </p>

      <textarea
        value={typed}
        disabled={checked !== null}
        onChange={(e) => setTyped(e.target.value)}
        rows={3}
        placeholder="พิมพ์ประโยคที่แก้แล้ว…"
        className="mt-3 w-full rounded-xl bg-slate-50 p-3 text-[14px] font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-slate-400"
      />

      {checked === null && (
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className="mt-1.5 text-[13px] font-bold text-slate-400"
        >
          💡 {showHint ? "ซ่อนคำใบ้" : "ขอคำใบ้"}
        </button>
      )}
      {showHint && checked === null && (
        <p className="mt-1 text-[13px] text-slate-500">{item.hintTh}</p>
      )}

      {/* The rule, as a portable pattern rather than a paragraph. */}
      {checked !== null && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
          <p className="text-[13px] font-bold text-slate-700">{item.rule.nameTh}</p>
          <p className="mt-1 rounded-lg bg-white px-2.5 py-1.5 font-mono text-[12px] font-bold text-[#004AAD] ring-1 ring-slate-200">
            {item.rule.pattern}
          </p>
          <ul className="mt-2 space-y-0.5">
            {item.rule.bulletsTh.map((b, i) => (
              <li key={i} className="text-[13px] text-slate-600">
                · {b}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-slate-500">{item.explanationThai}</p>
        </div>
      )}

      <Verdict
        checked={checked}
        correctText={item.answers[0]}
        canCheck={typed.trim().length > 0}
        onCheck={() => onCheck(rewriteIsCorrect(item, typed))}
        onNext={onNext}
        attempts={attempts}
        gaveUp={gaveUp}
        onRetry={onRetry}
        onGiveUp={onGiveUp}
      />
    </div>
  );
}

/**
 * Inflect the verb, then say the whole sentence.
 *
 * Scoring is the app's existing pronunciation gate: 95% word match AND no
 * dropped -s/-es/-ed. Writing the ending correctly then swallowing it aloud is
 * exactly the habit this drill exists to catch.
 */
function SpeakPatternView({
  item,
  checked,
  onCheck,
  onNext,
  attempts,
  gaveUp,
  onRetry,
  onGiveUp,
}: {
  item: SpeakPatternItem;
  checked: boolean | null;
  onCheck: (ok: boolean) => void;
  onNext: () => void;
  attempts?: number;
  gaveUp?: boolean;
  onRetry?: () => void;
  onGiveUp?: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [stage, setStage] = useState<"type" | "speak">("type");
  const [spoken, setSpoken] = useState("");
  const result = spoken ? pronunciationScore(item.fullSentence, spoken) : null;

  const typedOk = inflectionIsCorrect(item, typed);

  return (
    <div>
      <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500 ring-1 ring-slate-200">
        {item.promptTh}
      </p>

      <p className="mt-3 text-[15px] font-bold leading-relaxed text-slate-800">
        {item.frameEn.split("__")[0]}
        <span className="mx-1 inline-flex items-center rounded-lg bg-amber-50 px-2 py-0.5 ring-1 ring-amber-300">
          <input
            value={typed}
            disabled={stage === "speak"}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={item.baseVerb}
            className="w-24 bg-transparent text-center text-[15px] font-bold text-amber-900 outline-none"
          />
        </span>
        {item.frameEn.split("__")[1]}
      </p>

      {stage === "type" && (
        <>
          {typed.trim().length > 0 && !typedOk && (
            <p className="mt-2 text-[13px] font-bold text-rose-600">
              ยังไม่ถูก — ประธานเอกพจน์ ต้องเติม -s / -es
            </p>
          )}
          <button
            type="button"
            disabled={!typedOk}
            onClick={() => setStage("speak")}
            className="mt-4 w-full rounded-full bg-[#004AAD] py-3 text-sm font-bold text-white disabled:opacity-30"
          >
            ถูกแล้ว → ไปอัดเสียง
          </button>
        </>
      )}

      {stage === "speak" && (
        <div className="mt-4">
          <p className="rounded-xl bg-violet-50 p-3 text-[13px] font-bold text-violet-900 ring-1 ring-violet-200">
            🎤 พูดประโยคนี้: “{item.fullSentence}”
          </p>
          <p className="mt-1.5 text-[13px] text-slate-500">
            เสียงท้ายคำ “-s” ต้องได้ยินชัด ไม่งั้นไม่ผ่าน
          </p>

          {/* Transcript comes from the app's existing speech pipeline; typed
              here so the drill is testable before that is wired in. */}
          <textarea
            value={spoken}
            disabled={checked !== null}
            onChange={(e) => setSpoken(e.target.value)}
            rows={2}
            placeholder="ผลถอดเสียงจะขึ้นตรงนี้…"
            className="mt-2 w-full rounded-xl bg-slate-50 p-3 text-[13px] text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-slate-400"
          />

          {result && checked !== null && (
            <div className="mt-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-[12px] font-bold text-slate-700">
                ตรงกัน {result.pct}% (ต้องได้ 95% ขึ้นไป)
              </p>
              {result.endingIssues.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {result.endingIssues.map((iss, i) => (
                    <li key={i} className="text-[13px] font-bold text-rose-600">
                      · {endingIssueHintTh(iss)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-[13px] font-bold text-slate-700">
              Present simple: ประธานเอกพจน์
            </p>
            <p className="mt-1 rounded-lg bg-white px-2.5 py-1.5 font-mono text-[12px] font-bold text-[#004AAD] ring-1 ring-slate-200">
              He / She / It / N(เอกพจน์) + V-s
            </p>
            <p className="mt-1.5 text-[13px] text-slate-600">· {item.whyTh}</p>
          </div>

          <Verdict
            checked={checked}
            correctText={item.fullSentence}
            canCheck={spoken.trim().length > 0}
            onCheck={() =>
              onCheck(Boolean(result && pronunciationPassed(result)))
            }
            onNext={onNext}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Shared check / result / next footer.
 *
 * A wrong answer does NOT reveal the solution — the learner retries. The answer
 * only appears after three attempts, or when they explicitly give up. Showing it
 * on the first miss turns a drill into a reading exercise.
 */
function Verdict({
  checked,
  correctText,
  hintTh,
  canCheck,
  onCheck,
  onNext,
  attempts = 0,
  gaveUp = false,
  onRetry,
  onGiveUp,
  singleAttempt = false,
}: {
  checked: boolean | null;
  correctText: string;
  hintTh?: string;
  canCheck: boolean;
  onCheck: () => void;
  onNext: () => void;
  attempts?: number;
  gaveUp?: boolean;
  onRetry?: () => void;
  onGiveUp?: () => void;
  /** Reveal on the first check, right or wrong — no retry loop. */
  singleAttempt?: boolean;
}) {
  if (checked === null) {
    return (
      <button
        type="button"
        disabled={!canCheck}
        onClick={onCheck}
        className="mt-4 w-full rounded-full bg-[#004AAD] py-3 text-sm font-bold text-white disabled:opacity-30"
      >
        ตรวจคำตอบ
      </button>
    );
  }

  // Right, or out of attempts, or they asked — only then is the answer shown.
  // A single-attempt probe reveals on the very first check regardless.
  const reveal = singleAttempt || checked || gaveUp || attempts >= 3;

  if (!checked && !reveal) {
    return (
      <div className="mt-4">
        <div className="rounded-2xl bg-rose-50 p-3.5 text-rose-900 ring-1 ring-rose-200">
          <p className="text-sm font-bold">ยังไม่ถูก — ลองใหม่อีกครั้ง</p>
          <p className="mt-0.5 text-[13px]">
            พยายามครั้งที่ {attempts} / 3 {attempts >= 2 ? "· อีกครั้งเดียวจะเฉลยให้" : ""}
          </p>
          {hintTh && <p className="mt-1 text-[13px] opacity-80">💡 {hintTh}</p>}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white"
        >
          แก้ใหม่อีกครั้ง
        </button>
        <button
          type="button"
          onClick={onGiveUp}
          className="mt-2 w-full rounded-full py-2 text-[12px] font-bold text-slate-400"
        >
          ยอมแพ้ ขอดูเฉลย
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div
        className={`rounded-2xl p-3.5 ring-1 ${
          checked
            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
            : "bg-rose-50 text-rose-900 ring-rose-200"
        }`}
      >
        <p className="text-sm font-bold">
          {checked ? "ถูกต้อง! 🎉" : gaveUp ? "เฉลย" : "ยังไม่ถูก — นี่คือเฉลย"}
        </p>
        <p className="mt-1 text-[12px]">
          <strong>เฉลย:</strong> {correctText}
        </p>
        {!checked && hintTh && <p className="mt-1 text-[13px] opacity-80">💡 {hintTh}</p>}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white"
      >
        ข้อต่อไป →
      </button>
    </div>
  );
}
