"use client";

/**
 * The DET Interactive Reading task, rebuilt beat for beat — and the ONLY reading format in the app.
 *
 * There is one engine and one content model. A full set is this runner over one passage with all
 * six steps; a single-skill drill is the same runner over several passages with one or two steps
 * selected. That is deliberate: the drills used to have their own invented layouts, prompts and
 * grading, so a learner practising "หาข้อมูลเฉพาะ" rehearsed something the real test never asks.
 * Now every screen in ทักษะการอ่าน is literally the exam screen.
 *
 * Layout copied from the real thing (docs/reading/det-interactive-reading-item-spec.md): one card,
 * a clock in the header that re-labels itself as the set shrinks, split screen with the passage
 * scrolling on the left, one SUBMIT bottom-right, and a full-width coloured bar that takes over the
 * footer and turns into CONTINUE. The passage grows as you go, and after the cloze step the blanks
 * are refilled with the CORRECT words even where the learner picked wrong — DET does exactly that.
 *
 * Ours: the typeface, #004AAD / #FFCC00, the mascot report, and a Thai explanation inside the
 * feedback bar. DET explains nothing; that empty space is where the lesson lives.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { sfxCelebrate, sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { useLessonUserId } from "@/lib/lesson-user";
import { saveUnitScore } from "@/lib/lessons-progress";
import { phraseWordRange, wordTokens } from "@/lib/passage-text";
import {
  classifyWrong,
  findEvidence,
  glossTh,
  keywordPairTh,
  quotedEvidence,
  sentenceContaining,
  splitSentences,
  stemMatches,
  wordKey,
  type Clue,
} from "@/lib/interactive-reading-explain";
import {
  IR_STEP_COUNT,
  IR_STEP_LABELS_TH,
  irRemainingLabel,
  irSeconds,
  irStepPromptEn,
  irStepPromptTh,
  paragraphChunks,
  resolveParagraph,
  resolvedParagraphs,
  type IrSet,
} from "@/lib/interactive-reading";

type Sel = { para: number; start: number; end: number } | null;
type Verdict = "correct" | "partial" | "wrong";
type Slot = { set: IrSet; step: number };

const BRAND = "#004AAD";
const YELLOW = "#FFCC00";
const ALL_STEPS = [0, 1, 2, 3, 4, 5];

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ── passage words, pointer-selectable ─────────────────────────────────── */

function SelectableParagraph({
  text,
  para,
  sel,
  answerRange,
  showAnswer,
  onDown,
  onEnter,
  onUp,
}: {
  text: string;
  para: number;
  sel: Sel;
  answerRange: [number, number] | null;
  showAnswer: boolean;
  onDown: (para: number, w: number, mouse: boolean) => void;
  onEnter: (para: number, w: number) => void;
  onUp: () => void;
}) {
  const chunks = text.split(/(\s+)/);
  let w = -1;
  return (
    <p className="mb-4 select-none text-[15px] leading-8 text-slate-800 last:mb-0">
      {chunks.map((c, i) => {
        if (!/\S/.test(c)) return <span key={i}>{c}</span>;
        w += 1;
        const idx = w;
        const inAns = showAnswer && answerRange && idx >= answerRange[0] && idx <= answerRange[1];
        const inSel = sel && sel.para === para && idx >= sel.start && idx <= sel.end;
        // once the answer is revealed it wins the colour — the learner needs to see the target span
        const cls = inAns
          ? "bg-emerald-100 shadow-[inset_0_-2px_0_#10b981]"
          : inSel
            ? "bg-[#FFF0A8] shadow-[inset_0_-2px_0_#E6B800]"
            : "";
        return (
          <span
            key={i}
            onPointerDown={(e) => onDown(para, idx, e.pointerType === "mouse")}
            onPointerEnter={() => onEnter(para, idx)}
            onPointerUp={onUp}
            className={`cursor-text rounded-[2px] ${cls}`}
          >
            {c}
          </span>
        );
      })}
    </p>
  );
}

/* ── explanation pieces ────────────────────────────────────────────────── */

/**
 * One line of the "why" panel.
 *
 * `head` is the thing being judged (a keyword, an option, a blank), `tagTh` the standard verdict it
 * gets, `detailTh` an optional short parenthetical, `noteTh` a grey line of its own (the cloze step
 * has no rival options, so its authored reason still earns the room).
 */
type ExplainRow = {
  mark: "key" | "cross";
  head: string;
  tagTh?: string;
  detailTh?: string;
  noteTh?: string;
  chipTh?: string;
  clue?: Clue;
};

/** The clue sentence with the matched words marked, so the keyword is visible, not just described. */
function marked(sentence: string, hits: string[]) {
  const keys = new Set(hits.filter(Boolean));
  return sentence.split(/(\s+)/).map((chunk, i) =>
    /\S/.test(chunk) && keys.has(wordKey(chunk)) ? (
      <mark key={i} className="rounded bg-[#FFE68A] px-0.5 font-black text-slate-900">
        {chunk}
      </mark>
    ) : (
      <span key={i}>{chunk}</span>
    ),
  );
}

function ClueBox({ clue }: { clue: Clue }) {
  return (
    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
      <p className="text-[13px] font-black leading-6 text-amber-800">🔑 {clue.headTh}</p>
      <p className="mt-0.5 text-[13px] leading-6 text-slate-800">{marked(clue.sentence, clue.hits)}</p>
    </div>
  );
}

function ExplainRows({ rows, crossLabelTh }: { rows: ExplainRow[]; crossLabelTh: string }) {
  const keys = rows.filter((r) => r.mark === "key");
  const crosses = rows.filter((r) => r.mark === "cross");
  const row = (r: ExplainRow, i: number) => (
    <li key={i} className="flex gap-2">
      <span className={`mt-0.5 shrink-0 text-[13px] font-black ${r.mark === "key" ? "text-emerald-600" : "text-rose-500"}`}>{r.mark === "key" ? "✓" : "✕"}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-6">
          <span className="font-black text-slate-900">{r.head}</span>
          {r.tagTh ? <span className="text-slate-700"> = {r.tagTh}</span> : null}
          {r.detailTh ? <span className="text-slate-500"> ({r.detailTh})</span> : null}
          {r.chipTh ? <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.5 align-middle text-[10px] font-black text-slate-600">{r.chipTh}</span> : null}
        </p>
        {r.noteTh ? <p className="text-[12px] leading-6 text-slate-600">{r.noteTh}</p> : null}
        {r.clue ? <p className="text-[12px] leading-6 text-slate-500">{marked(r.clue.sentence, r.clue.hits)}</p> : null}
      </div>
    </li>
  );
  return (
    <>
      <ul className="space-y-2">{keys.map(row)}</ul>
      {crosses.length ? (
        <>
          <p className="mb-1.5 mt-3 text-[11px] font-black uppercase tracking-wide text-slate-500">{crossLabelTh}</p>
          <ul className="space-y-2">{crosses.map(row)}</ul>
        </>
      ) : null}
    </>
  );
}

/* ── one task = one {passage, step} ────────────────────────────────────── */

export type IrStepResult = {
  step: number;
  score: number;
  /** What the learner chose or typed, one entry per graded blank (cloze) or one for other steps. */
  chosen: string[];
  /** The key, aligned with `chosen`. */
  correct: string[];
};

function TaskCard({
  set,
  step,
  onDone,
  isLast,
  glossary,
}: {
  set: IrSet;
  step: number;
  onDone: (result: IrStepResult) => void;
  isLast: boolean;
  glossary?: { word: string; meaningTh: string }[];
}) {
  const [submitted, setSubmitted] = useState(false);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [openBlank, setOpenBlank] = useState<number | null>(null);
  const [gapPick, setGapPick] = useState<number | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [ideaPick, setIdeaPick] = useState<number | null>(null);
  const [titlePick, setTitlePick] = useState<number | null>(null);

  const dragging = useRef(false);
  const tapAnchor = useRef<{ para: number; w: number } | null>(null);

  const resolved = useMemo(() => resolvedParagraphs(set), [set]);
  const hl = set.highlights[step === 2 ? 0 : 1]!;
  const hlPara = resolved[hl.paragraph - 1] ?? "";
  const hlRange = useMemo(() => phraseWordRange(hlPara, hl.answer), [hlPara, hl.answer]);
  /**
   * Every span that counts as right: the canonical answer plus its shorter accepted
   * variants. Grading takes the best of these, while `hlRange` alone stays the span the
   * feedback bar reveals — the learner should still be shown the full model answer.
   */
  const hlTargets = useMemo(
    () =>
      [hl.answer, ...(hl.accept ?? [])]
        .map((phrase) => phraseWordRange(hlPara, phrase))
        .filter((r): r is [number, number] => r !== null),
    [hlPara, hl.answer, hl.accept],
  );

  function onDown(para: number, w: number, mouse: boolean) {
    if (submitted || (step !== 2 && step !== 3)) return;
    if (mouse) {
      dragging.current = true;
      tapAnchor.current = null;
      setSel({ para, start: w, end: w });
      return;
    }
    const a = tapAnchor.current;
    if (a && a.para === para) {
      setSel({ para, start: Math.min(a.w, w), end: Math.max(a.w, w) });
      tapAnchor.current = null;
    } else {
      tapAnchor.current = { para, w };
      setSel({ para, start: w, end: w });
    }
  }
  function onEnter(para: number, w: number) {
    if (!dragging.current) return;
    setSel((cur) => (cur && cur.para === para ? { para, start: Math.min(cur.start, w), end: Math.max(cur.start, w) } : cur));
  }
  const onUp = () => {
    dragging.current = false;
  };

  const selText = useMemo(() => {
    if (!sel) return "";
    return wordTokens(resolved[sel.para - 1] ?? "")
      .slice(sel.start, sel.end + 1)
      .map((t) => t.text)
      .join(" ");
  }, [sel, resolved]);

  const blankHits = set.blanks.filter((b) => picks[b.n] === b.answer).length;

  const score = useMemo(() => {
    if (step === 0) return set.blanks.length ? blankHits / set.blanks.length : 0;
    if (step === 1) return gapPick !== null && set.gap[gapPick]!.correct ? 1 : 0;
    if (step === 2 || step === 3) {
      if (!sel || sel.para !== hl.paragraph) return 0;
      // Right if the selection covers ANY accepted span with two spare words at most.
      // Checking every target is what lets a learner keep the answer tight: highlighting
      // "gave discounts" out of "He gave discounts" reads the passage correctly, and
      // grading only the longest phrasing used to mark that wrong.
      return hlTargets.some(([s, e]) => sel.start <= s && sel.end >= e && sel.end - sel.start - (e - s) <= 2)
        ? 1
        : 0;
    }
    if (step === 4) return ideaPick !== null && set.idea[ideaPick]!.correct ? 1 : 0;
    return titlePick !== null && set.title[titlePick]!.correct ? 1 : 0;
  }, [step, blankHits, set, gapPick, sel, hlTargets, hl.paragraph, ideaPick, titlePick]);

  const verdict: Verdict = score === 1 ? "correct" : step === 0 && score > 0 ? "partial" : "wrong";

  /** What to hand back when the learner moves on — the host may need the actual answers. */
  function result(): IrStepResult {
    if (step === 0) {
      return {
        step,
        score,
        chosen: set.blanks.map((b) => picks[b.n] ?? ""),
        correct: set.blanks.map((b) => b.answer),
      };
    }
    if (step === 1) {
      return { step, score, chosen: [gapPick !== null ? set.gap[gapPick]!.text : ""], correct: [set.gap.find((g) => g.correct)?.text ?? ""] };
    }
    if (step === 2 || step === 3) return { step, score, chosen: [selText], correct: [hl.answer] };
    if (step === 4) {
      return { step, score, chosen: [ideaPick !== null ? set.idea[ideaPick]!.text : ""], correct: [set.idea.find((o) => o.correct)?.text ?? ""] };
    }
    return { step, score, chosen: [titlePick !== null ? set.title[titlePick]!.text : ""], correct: [set.title.find((o) => o.correct)?.text ?? ""] };
  }

  const canSubmit =
    step === 0
      ? set.blanks.every((b) => picks[b.n])
      : step === 1
        ? gapPick !== null
        : step === 2 || step === 3
          ? !!sel
          : step === 4
            ? ideaPick !== null
            : titlePick !== null;

  function submit() {
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    if (score === 1) sfxCorrect();
    else sfxWrong();
  }

  /* passage */
  function passage() {
    if (step === 0) {
      // Blanks usually live in the opening block, but mock reading passages spread them either side
      // of the gap — so show every block up to the last one that actually carries a marker.
      let lastWithBlank = set.gapAfter - 1;
      set.paragraphs.forEach((p, i) => {
        if (/\{\d+\}/.test(p)) lastWithBlank = Math.max(lastWithBlank, i);
      });
      return set.paragraphs.slice(0, lastWithBlank + 1).map((p, pi) => (
        <p key={pi} className="mb-4 text-[15px] leading-9 text-slate-800 last:mb-0">
          {paragraphChunks(p).map((c, ci) => {
            if (c.kind === "text") return <span key={ci}>{c.text}</span>;
            const b = set.blanks.find((x) => x.n === c.n)!;
            const ok = picks[c.n] === b.answer;
            return (
              <span key={ci} className="mx-0.5 inline-flex min-w-[4rem] items-baseline gap-1.5 border-b-2 border-slate-300 px-1 sm:min-w-[7rem]">
                <span className="rounded border border-slate-300 bg-slate-50 px-1 text-[10px] font-black text-slate-500">{c.n}</span>
                <span className="font-bold" style={{ color: submitted ? (ok ? "#047857" : "#e11d48") : "#0f172a" }}>
                  {submitted ? b.answer : (picks[c.n] ?? "")}
                </span>
              </span>
            );
          })}
        </p>
      ));
    }
    if (step === 1) {
      const before = set.paragraphs.slice(0, set.gapAfter).map((p) => resolveParagraph(p, set.blanks));
      const after = set.paragraphs[set.gapAfter] ? resolveParagraph(set.paragraphs[set.gapAfter]!, set.blanks) : "";
      return (
        <>
          {before.map((p, i) => (
            <p key={i} className="mb-4 text-[15px] leading-8 text-slate-800">
              {p}
            </p>
          ))}
          <div className={`my-4 rounded-xl border-2 p-4 text-[15px] leading-8 ${submitted ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-800"}`}>
            {submitted ? set.gap.find((g) => g.correct)!.text : gapPick !== null ? set.gap[gapPick]!.text : <span className="text-slate-300">…</span>}
          </div>
          {after ? <p className="mb-4 text-[15px] leading-8 text-slate-800">{after}</p> : null}
        </>
      );
    }
    const selectable = step === 2 || step === 3;
    return resolved.map((p, i) =>
      selectable ? (
        <SelectableParagraph
          key={i}
          text={p}
          para={i + 1}
          sel={sel}
          answerRange={i + 1 === hl.paragraph ? hlRange : null}
          showAnswer={submitted}
          onDown={onDown}
          onEnter={onEnter}
          onUp={onUp}
        />
      ) : (
        <p key={i} className="mb-4 text-[15px] leading-8 text-slate-800 last:mb-0">
          {p}
        </p>
      ),
    );
  }

  /* options */
  function card(text: string, active: boolean, onClick: () => void, i: number, state?: "key" | "miss") {
    const tone =
      state === "key"
        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
        : state === "miss"
          ? "border-rose-400 bg-rose-50 text-rose-700"
          : active
            ? "border-[#004AAD] bg-[#EAF1FF] text-[#004AAD]"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300";
    return (
      <button
        key={i}
        type="button"
        disabled={submitted}
        onClick={onClick}
        className={`flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[14px] font-semibold leading-6 transition disabled:cursor-default ${tone}`}
      >
        <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${active ? "border-current bg-current shadow-[inset_0_0_0_3px_white]" : "border-slate-300"}`} />
        <span>{text}</span>
      </button>
    );
  }

  function choiceList(list: { text: string; correct: boolean }[], pick: number | null, set_: (i: number) => void) {
    return (
      <div className="space-y-2.5">
        {list.map((o, i) =>
          card(o.text, pick === i, () => set_(i), i, submitted ? (o.correct ? "key" : pick === i ? "miss" : undefined) : undefined),
        )}
      </div>
    );
  }

  function question() {
    if (step === 0) {
      return (
        <div className="space-y-2.5">
          {set.blanks.map((b) => {
            const open = openBlank === b.n;
            const chosen = picks[b.n];
            const wrong = submitted && chosen !== b.answer;
            return (
              <div key={b.n}>
                <button
                  type="button"
                  disabled={submitted}
                  onClick={() => setOpenBlank(open ? null : b.n)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 bg-white px-3.5 py-3 text-left text-[14px] transition disabled:cursor-default ${
                    wrong ? "border-rose-400" : submitted ? "border-emerald-300" : open ? "border-[#004AAD]" : "border-slate-200"
                  }`}
                >
                  <span className="rounded border border-slate-300 bg-slate-50 px-1.5 text-[10px] font-black text-slate-500">{b.n}</span>
                  <span className={`flex-1 font-bold ${chosen ? (wrong ? "text-rose-600 line-through" : "text-slate-900") : "text-slate-300"}`}>{chosen ?? "เลือกคำ"}</span>
                  {wrong ? <span className="font-black text-emerald-700">{b.answer}</span> : null}
                  {!submitted ? <span className="text-slate-400">{open ? "▲" : "▼"}</span> : null}
                </button>
                {open && !submitted ? (
                  <div className="mt-1 overflow-hidden rounded-xl border-2 border-slate-200">
                    {b.options.map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => {
                          setPicks((p) => ({ ...p, [b.n]: o }));
                          setOpenBlank(null);
                        }}
                        className="block w-full border-b border-slate-100 bg-white px-4 py-3 text-left text-[14px] font-bold text-slate-800 last:border-0 hover:bg-slate-50"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }
    if (step === 1) return choiceList(set.gap, gapPick, setGapPick);
    if (step === 2 || step === 3) {
      return (
        <>
          <p className="text-[15px] font-semibold leading-7 text-slate-800">{hl.questionEn}</p>
          <p className="mb-3 mt-0.5 text-xs text-slate-500">{hl.questionTh}</p>
          <div className="min-h-[4.5rem] rounded-xl border-2 border-slate-200 bg-slate-50/60 p-3.5 text-[14px] leading-7 text-slate-800">
            {selText || <span className="text-slate-400">ลากเมาส์คลุมข้อความในบทอ่าน (บนมือถือ: แตะคำแรก แล้วแตะคำสุดท้าย)</span>}
          </div>
        </>
      );
    }
    if (step === 4) return choiceList(set.idea, ideaPick, setIdeaPick);
    return choiceList(set.title, titlePick, setTitlePick);
  }

  /* explanation — the part DET never gives */

  /** Why the span the learner dragged is not the answer, read off the two ranges — as a short tag. */
  function highlightMissTagTh(): string {
    if (!sel) return "ยังไม่ได้เลือกข้อความ";
    if (sel.para !== hl.paragraph) return "อยู่คนละย่อหน้ากับคำตอบ";
    if (!hlRange) return "ไม่ใช่ส่วนที่ตอบคำถาม";
    const [s, e] = hlRange;
    if (sel.start <= s && sel.end >= e) return "คลุมกว้างเกินไป";
    if (sel.end < s || sel.start > e) return "ไม่ใช่ส่วนที่ตอบคำถาม";
    return "ยังไม่ครบช่วงคำตอบ";
  }

  /**
   * The keyword line — `A = B (ความหมาย) ในประโยคนี้`, over the sentence that proves it.
   *
   * Authored `clueEn` wins, then a sentence the Thai explanation already quotes, then shared words.
   * When the words do not actually line up the mapping is dropped rather than faked: a
   * missing-sentence item is logic, not vocabulary, so it gets "what it has to connect to" instead.
   */
  function clue(): Clue | null {
    const pair = (fromEn: string, toEn: string) => keywordPairTh(fromEn, toEn, glossary);

    if (step === 1) {
      const key = set.gap.find((o) => o.correct);
      if (!key) return null;
      // what the inserted sentence has to hand over to — the paragraph after the gap
      const nextPara = resolved[set.gapAfter + 1] ?? resolved[set.gapAfter - 1] ?? "";
      const sentence = key.clueEn ?? splitSentences(nextPara)[0] ?? nextPara;
      if (!sentence) return null;
      const m = stemMatches(key.text, sentence);
      return {
        headTh: m.words.length ? `${pair(m.words[0]!, m.words[0]!)} ในประโยคที่ต้องเชื่อมถึง` : "ต้องเชื่อมกับประโยคนี้",
        sentence,
        hits: m.hits,
      };
    }
    if (step === 2 || step === 3) {
      const sentence = hl.clueEn ?? sentenceContaining(hlPara, hl.answer);
      const m = stemMatches(hl.questionEn, sentence);
      const marked = m.words[0];
      const gloss = marked ? glossTh(marked, glossary) : null;
      return {
        headTh: marked ? `${marked} (คำในคำถาม${gloss ? ` · ${gloss}` : ""}) ในประโยคนี้` : "คำถามถามด้วยคำอื่น — หาจากความหมายในประโยคนี้",
        sentence,
        hits: m.hits,
      };
    }
    if (step === 4 || step === 5) {
      const key = (step === 4 ? set.idea : set.title).find((o) => o.correct);
      if (!key) return null;
      const pinned = key.clueEn ?? quotedEvidence(key.whyTh, resolved);
      // two hits minimum even for a title: a 3-word title shares one generic word with half the
      // passage, and pointing at the wrong sentence teaches the wrong move
      const ev = pinned ? { sentence: pinned, ...stemMatches(key.text, pinned) } : findEvidence(resolved, key.text, 2);
      if (!ev) return null;
      const from = ev.words[0];
      const to = ev.hits[0] ? (ev.sentence.split(/\s+/).find((w) => wordKey(w) === ev.hits[0]) ?? from) : from;
      return {
        headTh: from && to ? `${pair(from, to.replace(/[^A-Za-z']/g, ""))} ในประโยคนี้` : "ตัวเลือกที่ถูกคือการพูดประโยคนี้ใหม่ด้วยคำอื่น",
        sentence: ev.sentence,
        hits: ev.hits,
      };
    }
    return null;
  }

  /** One ✓ row for the key, then one `keyword = หมวดที่ผิด` row per option ruled out. */
  function rows(): ExplainRow[] {
    const passageText = resolved.join(" ");

    if (step === 0) {
      const rowFor = (b: (typeof set.blanks)[number], mark: ExplainRow["mark"]): ExplainRow => {
        const para = set.paragraphs.find((p) => new RegExp(`\\{${b.n}\\}`).test(p)) ?? "";
        const sentence = sentenceContaining(resolveParagraph(para, set.blanks), b.answer);
        const gloss = glossTh(b.answer, glossary);
        return {
          mark,
          head: `ช่อง ${b.n} · ${b.answer}${gloss ? ` (${gloss})` : ""}`,
          noteTh: b.whyTh,
          // the head shows the KEY, so the chip has to name what the learner actually put there
          chipTh: mark === "cross" ? (picks[b.n] ? `คุณตอบ ${picks[b.n]}` : "ไม่ได้ตอบ") : undefined,
          clue: sentence ? { headTh: "", sentence, hits: [wordKey(b.answer)] } : undefined,
        };
      };
      const missed = set.blanks.filter((b) => picks[b.n] !== b.answer);
      if (missed.length) return missed.map((b) => rowFor(b, "cross"));
      return set.blanks.slice(0, 4).map((b) => rowFor(b, "key"));
    }

    if (step === 2 || step === 3) {
      const out: ExplainRow[] = [{ mark: "key", head: `คำตอบ: ${hl.answer}` }];
      if (verdict !== "correct") out.push({ mark: "cross", head: selText || "—", tagTh: highlightMissTagTh(), chipTh: "ที่คุณไฮไลต์" });
      return out;
    }

    const list = step === 1 ? set.gap : step === 4 ? set.idea : set.title;
    const pick = step === 1 ? gapPick : step === 4 ? ideaPick : titlePick;
    return [
      ...list
        .filter((o) => o.correct)
        .map<ExplainRow>((o) => ({ mark: "key", head: o.text, chipTh: pick !== null && list[pick] === o ? "ที่คุณเลือก" : undefined })),
      ...list
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => !o.correct)
        .map<ExplainRow>(({ o, i }) => {
          const c = classifyWrong(o.whyTh, o.text, passageText);
          return {
            mark: "cross",
            head: c.keywordEn,
            tagTh: c.tagTh,
            detailTh: c.detailTh,
            chipTh: pick === i ? "ที่คุณเลือก" : undefined,
          };
        }),
    ];
  }

  function feedback() {
    const tone =
      verdict === "correct"
        ? { bg: "bg-[#DCF5E6]", ink: "text-emerald-700", btn: "bg-emerald-500", label: "เยี่ยมมาก!", mark: "✓" }
        : verdict === "partial"
          ? { bg: "bg-[#FFF4D6]", ink: "text-amber-700", btn: "bg-amber-400", label: `ถูกบางส่วน · ${blankHits}/${set.blanks.length}`, mark: "!" }
          : { bg: "bg-[#FFE4E6]", ink: "text-rose-600", btn: "bg-rose-500", label: "ยังไม่ถูก", mark: "✕" };

    // the cloze answer strip stays — six to ten words are easier to scan in a row than as rows
    const key =
      step === 0 ? (
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
          {set.blanks.map((b) => (
            <span key={b.n} className={picks[b.n] === b.answer ? "text-slate-400" : "font-black underline decoration-2 underline-offset-2"}>
              {b.n}. {b.answer}
            </span>
          ))}
        </p>
      ) : null;

    const c = clue();
    return (
      <div className={`${tone.bg} px-5 py-4 sm:px-8`}>
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className={`text-[15px] font-black ${tone.ink}`}>
              {tone.mark} {tone.label}
            </p>
            <div className={tone.ink}>{key}</div>
            <div className="mt-2 max-h-[34vh] max-w-2xl overflow-y-auto rounded-xl bg-white/70 p-3.5 ring-1 ring-black/5">
              {c ? <ClueBox clue={c} /> : null}
              <ExplainRows
                rows={rows()}
                crossLabelTh={step === 0 ? "ช่องที่ยังผิด" : step === 2 || step === 3 ? "ที่คุณไฮไลต์ผิดเพราะ" : "ข้ออื่นผิดเพราะ"}
              />
            </div>
          </div>
          <button type="button" onClick={() => onDone(result())} className={`shrink-0 rounded-xl ${tone.btn} px-7 py-3 text-sm font-black uppercase tracking-wide text-white`}>
            {isLast ? "ดูสรุป" : "ต่อไป"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
        <div className="relative max-h-[42vh] overflow-y-auto border-b border-slate-200 px-5 py-5 sm:px-8 lg:max-h-[58vh] lg:border-b-0">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">บทอ่าน</p>
          {passage()}
          {glossary?.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
              {glossary.map((g) => (
                <span key={g.word} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-black/5">
                  {g.word} · <span className="text-slate-500">{g.meaningTh}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="max-h-[52vh] overflow-y-auto px-5 py-5 sm:px-8 lg:max-h-[58vh]">
          <h2 className="mb-1 text-[19px] font-black leading-7 text-slate-900">{irStepPromptTh(step)}</h2>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{irStepPromptEn(step)}</p>
          {question()}
        </div>
      </div>
      {submitted ? (
        feedback()
      ) : (
        <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-8">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-xl px-9 py-3 text-sm font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            style={canSubmit ? { background: BRAND, color: YELLOW } : undefined}
          >
            ส่งคำตอบ
          </button>
        </div>
      )}
    </>
  );
}

/* ── the runner ────────────────────────────────────────────────────────── */

export function InteractiveReadingRunner({
  sets,
  steps = ALL_STEPS,
  progressTopic = "interactive-reading",
  backHref = "/practice/lessons/reading-skills",
  celebrateTitle = "จบชุดแล้ว!",
  celebrateSub = "นี่คือรูปแบบเดียวกับ Interactive Reading ในข้อสอบจริงทุกขั้นตอน",
  glossary,
  onFinish,
  onStepDone,
  hideReport = false,
  hostOwnsProgress = false,
}: {
  sets: IrSet[];
  steps?: number[];
  progressTopic?: string;
  backHref?: string;
  celebrateTitle?: string;
  celebrateSub?: string;
  /** Reading-exam sets carry a vocabulary list; shown under the passage so it is not lost. */
  glossary?: { word: string; meaningTh: string }[];
  /** Called once when every step is answered — the mock uses it to build its own score payload. */
  onFinish?: (results: IrStepResult[]) => void;
  /**
   * Called as each step is answered. The mock needs this: its section clock can end mid-set, and it
   * has to hand in what was answered so far. Waiting for onFinish would submit an empty result and
   * score a half-finished attempt as zero.
   */
  onStepDone?: (result: IrStepResult, all: IrStepResult[]) => void;
  /** The mock renders its own report, so suppress ours. */
  hideReport?: boolean;
  /**
   * Set when the host records the attempt itself (the reading exam and the vocabulary exercise keep
   * their own progress stores, which drive their hub ticks, round stats and the server-side practice
   * log). Without this the runner would also write a lesson-progress row under a topic nothing reads.
   */
  hostOwnsProgress?: boolean;
}) {
  const uid = useLessonUserId();
  const plan: Slot[] = useMemo(() => sets.flatMap((s) => steps.map((st) => ({ set: s, step: st }))), [sets, steps]);
  const timed = steps.length === IR_STEP_COUNT && sets.length === 1;

  const [i, setI] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [results, setResults] = useState<IrStepResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useState(() => (sets[0] ? irSeconds(sets[0]) : 480));
  const rewarded = useRef(false);

  const finish = useCallback(
    (all: number[]) => {
      setFinished(true);
      if (rewarded.current) return;
      rewarded.current = true;
      sfxCelebrate("md");
      const pct = plan.length ? Math.round((all.reduce((a, b) => a + b, 0) / plan.length) * 100) : 0;
      if (!hostOwnsProgress) {
        saveUnitScore(uid, progressTopic, sets[0]?.tier ?? "easy", 0, pct).catch(() => {});
        awardXp(uid, XP.auto(pct)).catch(() => {});
      }
    },
    [uid, plan.length, progressTopic, sets, hostOwnsProgress],
  );

  // one clock for the whole set — only in full-set mode, which is what DET times
  useEffect(() => {
    if (!timed || finished) return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setScores((cur) => {
            finish(cur);
            return cur;
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timed, finished, finish]);

  function onDone(r: IrStepResult) {
    const all = [...scores, r.score];
    const allR = [...results, r];
    setScores(all);
    setResults(allR);
    onStepDone?.(r, allR);
    if (i + 1 >= plan.length) {
      onFinish?.(allR);
      return finish(all);
    }
    sfxTransition();
    setI(i + 1);
  }

  if (!plan.length) {
    return (
      <div className="py-16 text-center text-sm text-slate-400">
        ยังไม่มีบทอ่านในหมวดนี้ ·{" "}
        <Link href={backHref} className="text-[#004AAD]">
          กลับ
        </Link>
      </div>
    );
  }

  if (finished) {
    if (hideReport) return null;
    const pct = Math.round((scores.reduce((a, b) => a + b, 0) / plan.length) * 100);
    return (
      <div className="py-8">
        <CelebrateMascot title={celebrateTitle} subtitle={celebrateSub} />
        <div className="mx-auto mt-6 w-full max-w-md rounded-2xl bg-slate-50 p-6">
          <p className="text-center text-4xl font-black" style={{ color: BRAND }}>
            {pct}%
          </p>
          <div className="mt-4 space-y-1.5">
            {plan.map((slot, idx) => {
              const s = scores[idx] ?? 0;
              return (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {sets.length > 1 ? `${slot.set.topicTh} · ` : `${idx + 1}. `}
                    {IR_STEP_LABELS_TH[slot.step]}
                  </span>
                  <span className={s === 1 ? "text-emerald-600" : s > 0 ? "text-amber-600" : "text-rose-500"}>
                    {s === 1 ? "ถูก" : s > 0 ? `${Math.round(s * 100)}%` : "ยังไม่ถูก"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-center">
          <Link href={backHref} className="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-bold" style={{ background: BRAND, color: YELLOW }}>
            เสร็จแล้ว · กลับไปเลือกชุด
          </Link>
        </div>
      </div>
    );
  }

  const slot = plan[i]!;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)] ring-1 ring-black/5">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-8">
        {timed ? (
          <p className="flex items-center gap-2 text-[15px] text-slate-500">
            <span className="text-lg">🕐</span>
            <span className="text-lg font-black text-slate-800">{mmss(left)}</span>
            <span className="font-semibold">{irRemainingLabel(i)}</span>
          </p>
        ) : (
          <p className="text-[15px] font-semibold text-slate-500">
            <span className="text-lg font-black text-slate-800">
              {i + 1}/{plan.length}
            </span>{" "}
            · {slot.set.topicTh}
          </p>
        )}
        <Link href={backHref} className="text-2xl leading-none text-slate-400 hover:text-slate-600">
          ✕
        </Link>
      </div>
      <TaskCard key={i} set={slot.set} step={slot.step} onDone={onDone} isLast={i + 1 >= plan.length} glossary={glossary} />
    </div>
  );
}
