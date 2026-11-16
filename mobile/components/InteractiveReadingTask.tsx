/**
 * One step of the DET Interactive Reading task, native — a port of TaskCard in the website's
 * src/components/reading/InteractiveReadingRunner.tsx. Same steps, same grading, same feedback:
 *
 *   0  word-fill: blanks sit inline in the passage; tapping one (or its row below) opens a sheet with
 *      its five options. Partial credit per blank.
 *   1  missing sentence: the picked option is shown in the gap box, in place.
 *   2,3 highlight: tap the first word, then the last word of the span; tap the span again to clear.
 *      Graded with the web's tolerance (any accepted span, at most two spare words).
 *   4  idea expressed, 5  best title.
 *
 * After SUBMIT the passage shows the key (correct words, correct sentence, answer span) and the
 * question pane opens with the Thai explanation the web shows in its feedback bar.
 *
 * Styling note: LuxuryPressable ignores function-style `style` props, so every style here is a plain
 * array.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "./LuxuryPressable";
import { sfxCorrect, sfxWrong } from "../lib/exam-sfx-mobile";
import { useI18n } from "../lib/i18n";
import {
  IR_STEP_PROMPTS_EN,
  IR_STEP_PROMPTS_TH,
  clozeParagraphCount,
  highlightIsCorrect,
  highlightMissTagTh,
  highlightTargets,
  irOptionOrder,
  paragraphChunks,
  phraseWordRange,
  resolveParagraph,
  resolvedParagraphs,
  wordTokens,
  type IrChoice,
  type IrSelection,
  type IrSet,
  type IrStepResult,
} from "../lib/interactive-reading";
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
} from "../lib/interactive-reading-explain";

const BRAND = "#004AAD";
const YELLOW = "#FFCC00";

type Verdict = "correct" | "partial" | "wrong";

type ExplainRow = {
  mark: "key" | "cross";
  head: string;
  tagTh?: string;
  detailTh?: string;
  noteTh?: string;
  chipTh?: string;
  clue?: Clue;
};

/** The clue sentence with the matched words marked. */
function Marked({ sentence, hits, style }: { sentence: string; hits: string[]; style?: object }) {
  const keys = new Set(hits.filter(Boolean));
  return (
    <Text style={style}>
      {sentence.split(/(\s+)/).map((chunk, i) =>
        /\S/.test(chunk) && keys.has(wordKey(chunk)) ? (
          <Text key={i} style={styles.markHit}>
            {chunk}
          </Text>
        ) : (
          <Text key={i}>{chunk}</Text>
        ),
      )}
    </Text>
  );
}

export function InteractiveReadingTask({
  set,
  step,
  gloss,
  isLast,
  onDone,
}: {
  set: IrSet;
  step: number;
  /** Thai glosses for this passage's words, from the API. */
  gloss: Record<string, string>;
  isLast: boolean;
  onDone: (result: IrStepResult) => void;
}) {
  const { t } = useI18n();
  const [submitted, setSubmitted] = useState(false);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [openBlank, setOpenBlank] = useState<number | null>(null);
  const [gapPick, setGapPick] = useState<number | null>(null);
  const [sel, setSel] = useState<IrSelection | null>(null);
  /** Set after the first tap of a highlight: the next tap in the same paragraph closes the span. */
  const [anchor, setAnchor] = useState<{ para: number; w: number } | null>(null);
  const [ideaPick, setIdeaPick] = useState<number | null>(null);
  const [titlePick, setTitlePick] = useState<number | null>(null);
  // the passage is where highlights happen, so give it the room on those steps
  const [passageBig, setPassageBig] = useState(step === 2 || step === 3);
  const questionScroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const resolved = useMemo(() => resolvedParagraphs(set), [set]);
  const isHighlight = step === 2 || step === 3;
  const hl = set.highlights[step === 2 ? 0 : 1]!;
  const hlPara = resolved[hl.paragraph - 1] ?? "";
  const hlRange = useMemo(() => phraseWordRange(hlPara, hl.answer), [hlPara, hl.answer]);
  const hlTargets = useMemo(() => highlightTargets(hlPara, hl), [hlPara, hl]);

  const selText = useMemo(() => {
    if (!sel) return "";
    return wordTokens(resolved[sel.para - 1] ?? "")
      .slice(sel.start, sel.end + 1)
      .map((tk) => tk.text)
      .join(" ");
  }, [sel, resolved]);

  const blankHits = set.blanks.filter((b) => picks[b.n] === b.answer).length;

  const score = useMemo(() => {
    if (step === 0) return set.blanks.length ? blankHits / set.blanks.length : 0;
    if (step === 1) return gapPick !== null && set.gap[gapPick]!.correct ? 1 : 0;
    if (isHighlight) return highlightIsCorrect(sel, hl, hlTargets) ? 1 : 0;
    if (step === 4) return ideaPick !== null && set.idea[ideaPick]!.correct ? 1 : 0;
    return titlePick !== null && set.title[titlePick]!.correct ? 1 : 0;
  }, [step, blankHits, set, gapPick, isHighlight, sel, hl, hlTargets, ideaPick, titlePick]);

  const verdict: Verdict = score === 1 ? "correct" : step === 0 && score > 0 ? "partial" : "wrong";

  function result(): IrStepResult {
    if (step === 0) {
      return { step, score, chosen: set.blanks.map((b) => picks[b.n] ?? ""), correct: set.blanks.map((b) => b.answer) };
    }
    const keyOf = (list: IrChoice[]) => list.find((o) => o.correct)?.text ?? "";
    if (step === 1) return { step, score, chosen: [gapPick !== null ? set.gap[gapPick]!.text : ""], correct: [keyOf(set.gap)] };
    if (isHighlight) return { step, score, chosen: [selText], correct: [hl.answer] };
    if (step === 4) return { step, score, chosen: [ideaPick !== null ? set.idea[ideaPick]!.text : ""], correct: [keyOf(set.idea)] };
    return { step, score, chosen: [titlePick !== null ? set.title[titlePick]!.text : ""], correct: [keyOf(set.title)] };
  }

  const canSubmit =
    step === 0
      ? set.blanks.every((b) => picks[b.n])
      : step === 1
        ? gapPick !== null
        : isHighlight
          ? !!sel
          : step === 4
            ? ideaPick !== null
            : titlePick !== null;

  function submit() {
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    setAnchor(null);
    if (score === 1) sfxCorrect();
    else sfxWrong();
  }

  // the verdict and explanation open at the top of the question pane — after they render, or the
  // pane keeps its old offset (web scroll anchoring) and the learner lands mid-explanation
  useEffect(() => {
    if (submitted) questionScroll.current?.scrollTo({ y: 0, animated: false });
  }, [submitted]);

  /* ── highlight taps ─────────────────────────────────────────────────── */

  function tapWord(para: number, w: number) {
    if (submitted || !isHighlight) return;
    if (anchor && anchor.para === para) {
      if (w === anchor.w) {
        // tapped the start word again: cancel
        setAnchor(null);
        setSel(null);
        return;
      }
      setSel({ para, start: Math.min(anchor.w, w), end: Math.max(anchor.w, w) });
      setAnchor(null);
      return;
    }
    if (!anchor && sel && sel.para === para && w >= sel.start && w <= sel.end) {
      // tapped inside a finished highlight: clear it
      setSel(null);
      return;
    }
    setAnchor({ para, w });
    setSel({ para, start: w, end: w });
  }

  /* ── passage ────────────────────────────────────────────────────────── */

  function blankChip(n: number) {
    const b = set.blanks.find((x) => x.n === n);
    // a marker with no blank behind it is bad content, not a reason to lose the run
    if (!b) return <Text key={`b${n}`}>___</Text>;
    const chosen = picks[n];
    const ok = chosen === b.answer;
    const shown = submitted ? b.answer : chosen;
    return (
      <Text
        key={`b${n}`}
        suppressHighlighting
        onPress={submitted ? undefined : () => setOpenBlank(n)}
        style={[
          styles.blank,
          openBlank === n ? styles.blankOpen : null,
          submitted ? (ok ? styles.blankOk : styles.blankBad) : chosen ? styles.blankFilled : null,
        ]}
      >
        {` ${n}· ${shown ?? "______"}${submitted ? "" : " ▾"} `}
      </Text>
    );
  }

  function selectableParagraph(text: string, para: number) {
    const chunks = text.split(/(\s+)/);
    let w = -1;
    const answerRange = submitted && para === hl.paragraph ? hlRange : null;
    return (
      <Text key={para} style={styles.para}>
        {chunks.map((c, i) => {
          if (!/\S/.test(c)) return <Text key={i}>{c}</Text>;
          w += 1;
          const idx = w;
          const inAns = answerRange && idx >= answerRange[0] && idx <= answerRange[1];
          const inSel = sel && sel.para === para && idx >= sel.start && idx <= sel.end;
          const isAnchor = anchor && anchor.para === para && anchor.w === idx;
          return (
            <Text
              key={i}
              suppressHighlighting
              onPress={submitted ? undefined : () => tapWord(para, idx)}
              style={inAns ? styles.wordAnswer : isAnchor ? styles.wordAnchor : inSel ? styles.wordSel : null}
            >
              {c}
            </Text>
          );
        })}
      </Text>
    );
  }

  function passage() {
    if (step === 0) {
      return set.paragraphs.slice(0, clozeParagraphCount(set)).map((p, pi) => (
        <Text key={pi} style={[styles.para, styles.paraCloze]}>
          {paragraphChunks(p).map((c, ci) => (c.kind === "text" ? <Text key={ci}>{c.text}</Text> : blankChip(c.n)))}
        </Text>
      ));
    }
    if (step === 1) {
      const before = set.paragraphs.slice(0, set.gapAfter).map((p) => resolveParagraph(p, set.blanks));
      const after = set.paragraphs[set.gapAfter] ? resolveParagraph(set.paragraphs[set.gapAfter]!, set.blanks) : "";
      const key = set.gap.find((g) => g.correct);
      return (
        <>
          {before.map((p, i) => (
            <Text key={i} style={styles.para}>
              {p}
            </Text>
          ))}
          <View style={[styles.gapBox, submitted ? styles.gapBoxDone : gapPick !== null ? styles.gapBoxPicked : null]}>
            <Text style={[styles.gapText, gapPick === null && !submitted ? styles.gapEmpty : null]}>
              {submitted ? (key?.text ?? "") : gapPick !== null ? set.gap[gapPick]!.text : t("… เลือกประโยคด้านล่าง …", "… pick a sentence below …")}
            </Text>
          </View>
          {after ? <Text style={styles.para}>{after}</Text> : null}
        </>
      );
    }
    return resolved.map((p, i) =>
      isHighlight ? (
        selectableParagraph(p, i + 1)
      ) : (
        <Text key={i} style={styles.para}>
          {p}
        </Text>
      ),
    );
  }

  /* ── options ────────────────────────────────────────────────────────── */

  function choiceList(list: IrChoice[], pick: number | null, setPick: (i: number) => void) {
    // the bank stores the key first — show the web's stable shuffle instead (same order as the site)
    return irOptionOrder(`${set.id}:${step}`, list.length).map((i) => {
      const o = list[i]!;
      const active = pick === i;
      const state = submitted ? (o.correct ? "key" : active ? "miss" : undefined) : undefined;
      return (
        <LuxuryPressable
          key={i}
          scaleTo={0.98}
          // not `disabled`: LuxuryPressable fades disabled items, and the key must stay readable
          onPress={() => {
            if (!submitted) setPick(i);
          }}
          style={[
            styles.option,
            active ? styles.optionActive : null,
            state === "key" ? styles.optionKey : null,
            state === "miss" ? styles.optionMiss : null,
          ]}
        >
          <View style={[styles.radio, active ? styles.radioOn : null]} />
          <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{o.text}</Text>
        </LuxuryPressable>
      );
    });
  }

  function question() {
    if (step === 0) {
      return set.blanks.map((b) => {
        const chosen = picks[b.n];
        const wrong = submitted && chosen !== b.answer;
        return (
          <LuxuryPressable
            key={b.n}
            sound="none"
            scaleTo={0.98}
            onPress={() => {
              if (!submitted) setOpenBlank(b.n);
            }}
            style={[styles.blankRow, wrong ? styles.blankRowBad : submitted ? styles.blankRowOk : null]}
          >
            <Text style={styles.blankNum}>{b.n}</Text>
            <Text style={[styles.blankRowText, !chosen ? styles.blankRowEmpty : null, wrong ? styles.strike : null]}>
              {chosen ?? t("เลือกคำ", "Choose a word")}
            </Text>
            {wrong ? <Text style={styles.blankRowKey}>{b.answer}</Text> : null}
            {!submitted ? <Text style={styles.chev}>▾</Text> : null}
          </LuxuryPressable>
        );
      });
    }
    if (step === 1) return choiceList(set.gap, gapPick, setGapPick);
    if (isHighlight) {
      return (
        <>
          <Text style={styles.hlQ}>{hl.questionEn}</Text>
          <Text style={styles.hlQTh}>{hl.questionTh}</Text>
          <View style={styles.selBox}>
            {selText ? (
              <Text style={styles.selText}>{selText}</Text>
            ) : (
              <Text style={styles.selHint}>
                {t(
                  "แตะคำแรกของคำตอบในบทอ่าน แล้วแตะคำสุดท้าย · แตะช่วงที่ไฮไลต์อีกครั้งเพื่อล้าง",
                  "Tap the first word of the answer in the passage, then the last word · tap the highlight again to clear",
                )}
              </Text>
            )}
          </View>
          {anchor && !submitted ? (
            <Text style={styles.anchorNote}>{t("แตะคำสุดท้ายของช่วงคำตอบ (หรือส่งเป็นคำเดียว)", "Now tap the last word (or submit one word)")}</Text>
          ) : null}
          {sel && !submitted ? (
            <LuxuryPressable
              sound="none"
              style={styles.clearBtn}
              onPress={() => {
                setSel(null);
                setAnchor(null);
              }}
            >
              <Text style={styles.clearText}>{t("ล้างไฮไลต์", "Clear highlight")}</Text>
            </LuxuryPressable>
          ) : null}
        </>
      );
    }
    if (step === 4) return choiceList(set.idea, ideaPick, setIdeaPick);
    return choiceList(set.title, titlePick, setTitlePick);
  }

  /* ── explanation (web: clue() + rows()) ─────────────────────────────── */

  function clue(): Clue | null {
    const pair = (fromEn: string, toEn: string) => keywordPairTh(fromEn, toEn, undefined, gloss);
    if (step === 1) {
      const key = set.gap.find((o) => o.correct);
      if (!key) return null;
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
    if (isHighlight) {
      const sentence = hl.clueEn ?? sentenceContaining(hlPara, hl.answer);
      const m = stemMatches(hl.questionEn, sentence);
      const w = m.words[0];
      const g = w ? glossTh(w, undefined, gloss) : null;
      return {
        headTh: w ? `${w} (คำในคำถาม${g ? ` · ${g}` : ""}) ในประโยคนี้` : "คำถามถามด้วยคำอื่น — หาจากความหมายในประโยคนี้",
        sentence,
        hits: m.hits,
      };
    }
    if (step === 4 || step === 5) {
      const key = (step === 4 ? set.idea : set.title).find((o) => o.correct);
      if (!key) return null;
      const pinned = key.clueEn ?? quotedEvidence(key.whyTh, resolved);
      const ev = pinned ? { sentence: pinned, ...stemMatches(key.text, pinned) } : findEvidence(resolved, key.text, 2);
      if (!ev) return null;
      const from = ev.words[0];
      const to = ev.hits[0] ? (ev.sentence.split(/\s+/).find((x) => wordKey(x) === ev.hits[0]) ?? from) : from;
      return {
        headTh: from && to ? `${pair(from, to.replace(/[^A-Za-z']/g, ""))} ในประโยคนี้` : "ตัวเลือกที่ถูกคือการพูดประโยคนี้ใหม่ด้วยคำอื่น",
        sentence: ev.sentence,
        hits: ev.hits,
      };
    }
    return null;
  }

  function rows(): ExplainRow[] {
    const passageText = resolved.join(" ");
    if (step === 0) {
      const rowFor = (b: IrSet["blanks"][number], mark: ExplainRow["mark"]): ExplainRow => {
        const para = set.paragraphs.find((p) => new RegExp(`\\{${b.n}\\}`).test(p)) ?? "";
        const sentence = sentenceContaining(resolveParagraph(para, set.blanks), b.answer);
        const g = glossTh(b.answer, undefined, gloss);
        return {
          mark,
          head: `ช่อง ${b.n} · ${b.answer}${g ? ` (${g})` : ""}`,
          noteTh: b.whyTh,
          chipTh: mark === "cross" ? (picks[b.n] ? `คุณตอบ ${picks[b.n]}` : "ไม่ได้ตอบ") : undefined,
          clue: sentence ? { headTh: "", sentence, hits: [wordKey(b.answer)] } : undefined,
        };
      };
      const missed = set.blanks.filter((b) => picks[b.n] !== b.answer);
      if (missed.length) return missed.map((b) => rowFor(b, "cross"));
      return set.blanks.slice(0, 4).map((b) => rowFor(b, "key"));
    }
    if (isHighlight) {
      const out: ExplainRow[] = [{ mark: "key", head: `คำตอบ: ${hl.answer}`, noteTh: hl.whyTh || undefined }];
      if (verdict !== "correct") out.push({ mark: "cross", head: selText || "—", tagTh: highlightMissTagTh(sel, hl, hlRange), chipTh: "ที่คุณไฮไลต์" });
      return out;
    }
    const list = step === 1 ? set.gap : step === 4 ? set.idea : set.title;
    const pick = step === 1 ? gapPick : step === 4 ? ideaPick : titlePick;
    return [
      ...list
        .filter((o) => o.correct)
        .map<ExplainRow>((o) => ({
          mark: "key",
          head: o.text,
          noteTh: o.whyTh || undefined,
          chipTh: pick !== null && list[pick] === o ? "ที่คุณเลือก" : undefined,
        })),
      ...list
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => !o.correct)
        .map<ExplainRow>(({ o, i }) => {
          const c = classifyWrong(o.whyTh, o.text, passageText);
          return { mark: "cross", head: c.keywordEn, tagTh: c.tagTh, detailTh: c.detailTh, chipTh: pick === i ? "ที่คุณเลือก" : undefined };
        }),
    ];
  }

  function feedback() {
    const tone =
      verdict === "correct"
        ? { box: styles.fbOk, ink: styles.inkOk, label: t("✓ เยี่ยมมาก!", "✓ Correct!") }
        : verdict === "partial"
          ? { box: styles.fbPartial, ink: styles.inkPartial, label: t(`! ถูกบางส่วน · ${blankHits}/${set.blanks.length}`, `! Partly right · ${blankHits}/${set.blanks.length}`) }
          : { box: styles.fbBad, ink: styles.inkBad, label: t("✕ ยังไม่ถูก", "✕ Not quite") };
    const c = clue();
    const all = rows();
    const keys = all.filter((r) => r.mark === "key");
    const crosses = all.filter((r) => r.mark === "cross");
    const crossLabel = step === 0 ? "ช่องที่ยังผิด" : isHighlight ? "ที่คุณไฮไลต์ผิดเพราะ" : "ข้ออื่นผิดเพราะ";
    const row = (r: ExplainRow, i: number) => (
      <View key={i} style={styles.exRow}>
        <Text style={[styles.exMark, r.mark === "key" ? styles.inkOk : styles.inkBad]}>{r.mark === "key" ? "✓" : "✕"}</Text>
        <View style={styles.exBody}>
          <Text style={styles.exLine}>
            <Text style={styles.exHead}>{r.head}</Text>
            {r.tagTh ? <Text style={styles.exTag}> = {r.tagTh}</Text> : null}
            {r.detailTh ? <Text style={styles.exDetail}> ({r.detailTh})</Text> : null}
            {r.chipTh ? <Text style={styles.exChip}>{`  ${r.chipTh}  `}</Text> : null}
          </Text>
          {r.noteTh ? <Text style={styles.exNote}>{r.noteTh}</Text> : null}
          {r.clue ? <Marked sentence={r.clue.sentence} hits={r.clue.hits} style={styles.exClue} /> : null}
        </View>
      </View>
    );
    return (
      <View style={[styles.fb, tone.box]}>
        <Text style={[styles.fbLabel, tone.ink]}>{tone.label}</Text>
        {step === 0 ? (
          <Text style={[styles.fbKeyStrip, tone.ink]}>
            {set.blanks.map((b, i) => (
              <Text key={b.n} style={picks[b.n] === b.answer ? styles.keyDim : styles.keyMiss}>
                {`${i ? "   " : ""}${b.n}. ${b.answer}`}
              </Text>
            ))}
          </Text>
        ) : null}
        <View style={styles.fbInner}>
          {c ? (
            <View style={styles.clueBox}>
              <Text style={styles.clueHead}>🔑 {c.headTh}</Text>
              <Marked sentence={c.sentence} hits={c.hits} style={styles.clueSentence} />
            </View>
          ) : null}
          {keys.map(row)}
          {crosses.length ? <Text style={styles.crossLabel}>{crossLabel}</Text> : null}
          {crosses.map(row)}
        </View>
      </View>
    );
  }

  const openB = openBlank !== null ? set.blanks.find((b) => b.n === openBlank) : undefined;
  const footerTone =
    verdict === "correct" ? styles.btnOk : verdict === "partial" ? styles.btnPartial : styles.btnBad;

  return (
    <View style={styles.wrap}>
      <View style={[styles.passageWrap, passageBig ? styles.passageWrapBig : null]}>
        <View style={styles.passageHead}>
          <Text style={styles.passageTitle}>{t("📖 บทอ่าน", "📖 Passage")}</Text>
          <LuxuryPressable sound="none" style={styles.sizeBtn} onPress={() => setPassageBig((b) => !b)}>
            <Text style={styles.sizeBtnText}>{passageBig ? t("ย่อบทอ่าน ▴", "Smaller ▴") : t("ขยายบทอ่าน ▾", "Bigger ▾")}</Text>
          </LuxuryPressable>
        </View>
        <ScrollView style={styles.flex} contentContainerStyle={styles.passageInner}>
          {passage()}
        </ScrollView>
      </View>

      <ScrollView ref={questionScroll} style={styles.questionPane} contentContainerStyle={styles.questionInner}>
        {submitted ? feedback() : null}
        <Text style={styles.prompt}>{t(IR_STEP_PROMPTS_TH[step]!, IR_STEP_PROMPTS_EN[step]!)}</Text>
        <Text style={styles.promptEn}>{IR_STEP_PROMPTS_EN[step]}</Text>
        {question()}
      </ScrollView>

      <View style={styles.footer}>
        {submitted ? (
          <LuxuryPressable style={[styles.btn, footerTone]} onPress={() => onDone(result())}>
            <Text style={styles.btnTextLight}>{isLast ? t("ดูสรุป", "See results") : t("ต่อไป", "Continue")}</Text>
          </LuxuryPressable>
        ) : (
          <LuxuryPressable
            sound="submit"
            disabled={!canSubmit}
            style={[styles.btn, !canSubmit ? styles.btnDisabled : null]}
            onPress={submit}
          >
            <Text style={[styles.btnText, !canSubmit ? styles.btnTextDisabled : null]}>
              {canSubmit
                ? t("ส่งคำตอบ", "Submit")
                : step === 0
                  ? t(`เลือกให้ครบทุกช่อง (${Object.keys(picks).length}/${set.blanks.length})`, `Fill every blank (${Object.keys(picks).length}/${set.blanks.length})`)
                  : isHighlight
                    ? t("ไฮไลต์คำตอบในบทอ่านก่อน", "Highlight the answer first")
                    : t("เลือกคำตอบก่อน", "Pick an answer first")}
            </Text>
          </LuxuryPressable>
        )}
      </View>

      <Modal visible={!!openB && !submitted} transparent animationType="slide" onRequestClose={() => setOpenBlank(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpenBlank(null)}>
          {/* inner Pressable swallows taps so the sheet itself does not close */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{t(`ช่อง ${openB?.n ?? ""} — เลือกคำ`, `Blank ${openB?.n ?? ""} — choose a word`)}</Text>
            {openB && irOptionOrder(`${set.id}:b${openB.n}`, openB.options.length).map((k) => openB.options[k]!).map((o) => {
              const active = picks[openB.n] === o;
              return (
                <LuxuryPressable
                  key={o}
                  scaleTo={0.98}
                  style={[styles.sheetOpt, active ? styles.optionActive : null]}
                  onPress={() => {
                    setPicks((p) => ({ ...p, [openB.n]: o }));
                    setOpenBlank(null);
                  }}
                >
                  <Text style={[styles.sheetOptText, active ? styles.optionTextActive : null]}>{o}</Text>
                </LuxuryPressable>
              );
            })}
            <LuxuryPressable sound="none" style={styles.sheetCancel} onPress={() => setOpenBlank(null)}>
              <Text style={styles.sheetCancelText}>{t("ปิด", "Close")}</Text>
            </LuxuryPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  flex: { flex: 1 },
  passageWrap: {
    flex: 1,
    marginHorizontal: 12,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    overflow: "hidden",
  },
  passageWrapBig: { flex: 2.2 },
  passageHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  passageTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  sizeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#EEF4FF" },
  sizeBtnText: { fontSize: 12, fontWeight: "800", color: BRAND },
  passageInner: { padding: 14, paddingBottom: 8 },
  para: { fontSize: 15, lineHeight: 26, color: "#1f2937", marginBottom: 12 },
  paraCloze: { lineHeight: 30 },
  blank: { fontWeight: "800", color: "#94a3b8", backgroundColor: "#EEF2F7", textDecorationLine: "underline" },
  blankOpen: { backgroundColor: "#DCE8FF", color: BRAND },
  blankFilled: { color: "#0f172a", backgroundColor: "#E7EFFF" },
  blankOk: { color: "#047857", backgroundColor: "#DCF5E6", textDecorationLine: "none" },
  blankBad: { color: "#be123c", backgroundColor: "#FFE4E6", textDecorationLine: "none" },
  wordSel: { backgroundColor: "#FFF0A8" },
  wordAnchor: { backgroundColor: "#FFE066" },
  wordAnswer: { backgroundColor: "#C9F0DA", color: "#065f46", fontWeight: "700" },
  gapBox: { borderWidth: 2, borderColor: "#CBD5E1", borderStyle: "dashed", borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: "#fff" },
  gapBoxPicked: { borderStyle: "solid", borderColor: BRAND, backgroundColor: "#EAF1FF" },
  gapBoxDone: { borderStyle: "solid", borderColor: "#6EE7B7", backgroundColor: "#ECFDF5" },
  gapText: { fontSize: 15, lineHeight: 24, color: "#1f2937" },
  gapEmpty: { color: "#94a3b8", textAlign: "center", fontWeight: "700", fontSize: 13 },
  questionPane: { flex: 1.3 },
  questionInner: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  prompt: { fontSize: 17, fontWeight: "900", color: "#0f172a", lineHeight: 24 },
  promptEn: { fontSize: 10, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 2, marginBottom: 10 },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionActive: { borderColor: BRAND, backgroundColor: "#EAF1FF" },
  optionKey: { borderColor: "#10b981", backgroundColor: "#ECFDF5" },
  optionMiss: { borderColor: "#fb7185", backgroundColor: "#FFF1F2" },
  optionText: { flex: 1, fontSize: 14, lineHeight: 21, color: "#334155", fontWeight: "600" },
  optionTextActive: { color: BRAND, fontWeight: "800" },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#CBD5E1", marginTop: 2 },
  radioOn: { borderColor: BRAND, backgroundColor: BRAND },
  blankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  blankRowOk: { borderColor: "#6EE7B7" },
  blankRowBad: { borderColor: "#fb7185" },
  blankNum: { fontSize: 11, fontWeight: "900", color: "#64748b", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 4, paddingHorizontal: 5, backgroundColor: "#F8FAFC" },
  blankRowText: { flex: 1, fontSize: 15, fontWeight: "800", color: "#0f172a" },
  blankRowEmpty: { color: "#CBD5E1" },
  blankRowKey: { fontSize: 15, fontWeight: "900", color: "#047857" },
  strike: { color: "#e11d48", textDecorationLine: "line-through" },
  chev: { fontSize: 14, color: "#94a3b8" },
  hlQ: { fontSize: 15, fontWeight: "700", color: "#1f2937", lineHeight: 22 },
  hlQTh: { fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 10 },
  selBox: { minHeight: 64, borderWidth: 2, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, backgroundColor: "#F8FAFC" },
  selText: { fontSize: 14, lineHeight: 22, color: "#1f2937" },
  selHint: { fontSize: 13, lineHeight: 20, color: "#94a3b8" },
  anchorNote: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#B45309" },
  clearBtn: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#F1F5F9" },
  clearText: { fontSize: 12, fontWeight: "800", color: "#475569" },
  fb: { borderRadius: 14, padding: 12, marginBottom: 14 },
  fbOk: { backgroundColor: "#DCF5E6" },
  fbPartial: { backgroundColor: "#FFF4D6" },
  fbBad: { backgroundColor: "#FFE4E6" },
  inkOk: { color: "#047857" },
  inkPartial: { color: "#B45309" },
  inkBad: { color: "#e11d48" },
  fbLabel: { fontSize: 15, fontWeight: "900" },
  fbKeyStrip: { marginTop: 4, fontSize: 13 },
  keyDim: { color: "#94a3b8" },
  keyMiss: { fontWeight: "900", textDecorationLine: "underline" },
  fbInner: { marginTop: 8, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 12, padding: 12 },
  clueBox: { borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  clueHead: { fontSize: 13, fontWeight: "900", color: "#92400E", lineHeight: 20 },
  clueSentence: { fontSize: 13, lineHeight: 20, color: "#1f2937", marginTop: 2 },
  markHit: { backgroundColor: "#FFE68A", fontWeight: "900", color: "#0f172a" },
  exRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  exMark: { fontSize: 13, fontWeight: "900", marginTop: 1 },
  exBody: { flex: 1 },
  exLine: { fontSize: 13, lineHeight: 20 },
  exHead: { fontWeight: "900", color: "#0f172a" },
  exTag: { color: "#334155" },
  exDetail: { color: "#64748b" },
  exChip: { fontSize: 10, fontWeight: "900", color: "#475569", backgroundColor: "#E2E8F0" },
  exNote: { fontSize: 12, lineHeight: 19, color: "#475569", marginTop: 1 },
  exClue: { fontSize: 12, lineHeight: 19, color: "#64748b", marginTop: 1 },
  crossLabel: { fontSize: 11, fontWeight: "900", color: "#64748b", letterSpacing: 0.5, marginTop: 4, marginBottom: 6 },
  footer: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#fff" },
  btn: { backgroundColor: BRAND, paddingVertical: 15, borderRadius: 12, borderWidth: 3, borderColor: "#111", alignItems: "center" },
  btnOk: { backgroundColor: "#10b981" },
  btnPartial: { backgroundColor: "#f59e0b" },
  btnBad: { backgroundColor: "#f43f5e" },
  btnDisabled: { backgroundColor: "#E5E7EB", borderColor: "#D1D5DB" },
  btnText: { color: YELLOW, fontWeight: "900", fontSize: 16 },
  btnTextLight: { color: "#fff", fontWeight: "900", fontSize: 16 },
  btnTextDisabled: { color: "#6B7280", fontSize: 14 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28 },
  sheetTitle: { fontSize: 15, fontWeight: "900", color: "#0f172a", marginBottom: 10 },
  sheetOpt: { borderWidth: 2, borderColor: "#E2E8F0", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 8, backgroundColor: "#fff" },
  sheetOptText: { fontSize: 16, fontWeight: "800", color: "#1f2937" },
  sheetCancel: { alignItems: "center", paddingVertical: 10 },
  sheetCancelText: { fontSize: 14, fontWeight: "800", color: "#64748b" },
});
