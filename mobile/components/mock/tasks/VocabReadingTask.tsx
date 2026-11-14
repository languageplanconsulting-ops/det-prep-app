import { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTimeUp } from "../../../hooks/useStepTimer";
import { useI18n } from "../../../lib/i18n";
import { C, Note, OptionButton, PrimaryButton, SectionLabel, SubmitButton, TaskInstruction, taskStyles } from "../TaskUi";
import { shuffle, str, stripMarkers, type TaskProps } from "./types";

type Mc = { question: string; correctAnswer: string; options: string[]; explanationThai?: string };

function asMc(v: unknown): Mc | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const options = Array.isArray(o.options) ? o.options.map((x) => stripMarkers(str(x))) : [];
  if (!options.length) return null;
  return {
    question: stripMarkers(str(o.question)),
    correctAnswer: stripMarkers(str(o.correctAnswer)),
    options,
    explanationThai: str(o.explanationThai) || undefined,
  };
}

const MARKER = /\[\s*BLANK(?:\s*\d+)?\s*\]/gi;

type Seg = { kind: "text"; text: string } | { kind: "blank"; n: number };

function segments(p: string, startAt: number): { segs: Seg[]; count: number } {
  const segs: Seg[] = [];
  let last = 0;
  let n = startAt;
  const re = new RegExp(MARKER.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(p)) !== null) {
    if (m.index > last) segs.push({ kind: "text", text: p.slice(last, m.index) });
    segs.push({ kind: "blank", n });
    n += 1;
    last = m.index + m[0].length;
  }
  if (last < p.length) segs.push({ kind: "text", text: p.slice(last) });
  return { segs, count: n - startAt };
}

type ReadingKey = "missingParagraph" | "informationLocation" | "mainIdea" | "bestTitle";

const READING_LABEL: Record<ReadingKey, { th: string; en: string; web: string }> = {
  missingParagraph: { th: "ย่อหน้าที่หายไป", en: "Missing paragraph", web: "Most suitable missing paragraph" },
  informationLocation: { th: "ตำแหน่งของข้อมูล", en: "Information location", web: "Information location" },
  mainIdea: { th: "ใจความสำคัญ", en: "Main idea", web: "Main idea expressed" },
  bestTitle: { th: "ชื่อเรื่องที่เหมาะที่สุด", en: "Best title", web: "Best title" },
};

/**
 * Vocabulary in context (gaps in paragraphs 1 and 3) → missing paragraph →
 * reading questions. Scored on the device and sent as averageScore0To100 with
 * the picked / correct answers, the same shape the website submits.
 */
export function VocabReadingTask({ content, submitting, timeUp, onSubmit, variant }: TaskProps) {
  const { t } = useI18n();
  const passage = (content.passage ?? {}) as Record<string, unknown>;
  const p1 = stripMarkers(str(passage.p1));
  const p2 = stripMarkers(str(passage.p2));
  const p3 = stripMarkers(str(passage.p3));

  const vocab = useMemo(
    () => (Array.isArray(content.vocabularyQuestions) ? content.vocabularyQuestions : []).map(asMc).filter((x): x is Mc => !!x).slice(0, 6),
    [content.vocabularyQuestions],
  );
  const readingKeys: ReadingKey[] =
    variant === "mock"
      ? ["missingParagraph", "informationLocation", "mainIdea", "bestTitle"]
      : ["missingParagraph", "informationLocation", "bestTitle", "mainIdea"];
  const reading = useMemo(
    () =>
      readingKeys
        .map((k) => ({ key: k, block: asMc(content[k]) }))
        .filter((x): x is { key: ReadingKey; block: Mc } => !!x.block),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, variant],
  );
  const shuffledVocab = useMemo(() => vocab.map((b) => shuffle(b.options)), [vocab]);
  const shuffledReading = useMemo(() => reading.map((r) => shuffle(r.block.options)), [reading]);

  const s1 = useMemo(() => segments(p1, 0), [p1]);
  const s3 = useMemo(() => segments(p3, s1.count), [p3, s1.count]);
  const markerCount = s1.count + s3.count;

  const [vocabPicks, setVocabPicks] = useState<string[]>(() => vocab.map(() => ""));
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<"vocab" | "reading">(vocab.length ? "vocab" : "reading");
  const [rIdx, setRIdx] = useState(0);
  const [rPick, setRPick] = useState<string | null>(null);
  const [rLocked, setRLocked] = useState(false);
  const readingPicks = useRef<string[]>([]);
  const done = useRef(false);

  const blocks = [...vocab, ...reading.map((r) => r.block)];

  const finish = () => {
    if (done.current) return;
    done.current = true;
    const selected = [...vocab.map((_, i) => vocabPicks[i] ?? ""), ...reading.map((_, i) => readingPicks.current[i] ?? "")];
    const correctList = blocks.map((b) => b.correctAnswer);
    let correct = 0;
    selected.forEach((s, i) => {
      if (s && s === correctList[i]) correct += 1;
    });
    const total = blocks.length;
    const payload: Record<string, unknown> = {
      averageScore0To100: total > 0 ? (correct / total) * 100 : 0,
      detail: { total, correct, vocabCount: vocab.length, readingCount: Math.max(0, total - vocab.length) },
      selected_answers: selected,
      correct_answers: correctList,
      question_prompts: blocks.map((b) => b.question),
    };
    if (variant === "mock") {
      payload.question_labels = [
        ...vocab.map((_, i) => `Q${i + 1} — Vocabulary`),
        ...reading.map((r, i) => `Q${vocab.length + i + 1} — ${READING_LABEL[r.key].web}`),
      ];
    }
    onSubmit(payload);
  };

  useTimeUp(timeUp, finish);

  if (!p1 && !p3) {
    return <Note tone="error">{t("ข้อนี้ไม่มีบทความ", "This reading task has no passage.")}</Note>;
  }

  const vocabDone = vocab.every((_, i) => !!vocabPicks[i]);
  const gapText = p2 || reading.find((r) => r.key === "missingParagraph")?.block.correctAnswer || "";
  const missingAnswered = phase === "reading" && (reading[0]?.key !== "missingParagraph" || rIdx > 0 || rLocked);

  const blankChip = (n: number, key: string) => {
    if (n >= vocab.length) {
      // More gaps than graded questions: show the authored answer in place.
      const authored = asMc((content.vocabularyQuestions as unknown[] | undefined)?.[n]);
      return (
        <Text key={key} style={st.filled}>
          {authored?.correctAnswer || "____"}
        </Text>
      );
    }
    const pick = vocabPicks[n];
    if (phase === "reading") {
      return (
        <Text key={key} style={st.filled}>
          {vocab[n]!.correctAnswer}
        </Text>
      );
    }
    return (
      <Text
        key={key}
        style={[st.chip, active === n ? st.chipActive : null, pick ? st.chipPicked : null]}
        onPress={() => setActive(n)}
      >
        {` ${n + 1}. ${pick || "______"} `}
      </Text>
    );
  };

  const renderPara = (segs: Seg[], keyBase: string) => (
    <Text style={taskStyles.passageText}>
      {segs.map((sg, i) => (sg.kind === "text" ? <Text key={`${keyBase}${i}`}>{sg.text}</Text> : blankChip(sg.n, `${keyBase}${i}`)))}
    </Text>
  );

  const extraVocab = vocab.map((_, i) => i).filter((i) => i >= markerCount);

  return (
    <View style={taskStyles.gap}>
      {str(content.titleEn) ? <Text style={st.title}>{stripMarkers(str(content.titleEn))}</Text> : null}
      <View style={[taskStyles.passage, { gap: 12 }]}>
        {renderPara(s1.segs, "a")}
        <View style={[st.gap, missingAnswered ? st.gapFilled : null]}>
          <Text style={missingAnswered ? taskStyles.passageText : st.gapText}>
            {missingAnswered
              ? gapText
              : phase === "reading" && rPick && reading[rIdx]?.key === "missingParagraph"
                ? rPick
                : t("[ ย่อหน้าที่หายไป ]", "[ Missing paragraph ]")}
          </Text>
        </View>
        {renderPara(s3.segs, "b")}
      </View>

      {phase === "vocab" ? (
        <>
          <SectionLabel>{t("ส่วนที่ 1 · คำศัพท์ในบริบท", "PART 1 · VOCABULARY IN CONTEXT")}</SectionLabel>
          <TaskInstruction th="แตะช่องว่างในบทความ แล้วเลือกคำที่เหมาะที่สุด" en="Tap a gap in the passage, then pick the best word." />
          {vocab[active] ? (
            <View style={st.box}>
              <Text style={taskStyles.question}>
                {t(`ช่องที่ ${active + 1}`, `Gap ${active + 1}`)}
                {active >= markerCount && vocab[active]!.question ? ` — ${vocab[active]!.question}` : ""}
              </Text>
              {shuffledVocab[active]!.map((o) => (
                <OptionButton
                  key={o}
                  label={o}
                  selected={vocabPicks[active] === o}
                  disabled={submitting}
                  onPress={() => {
                    const next = vocabPicks.map((x, j) => (j === active ? o : x));
                    setVocabPicks(next);
                    const nextOpen = next.findIndex((x, j) => !x && j !== active);
                    if (nextOpen >= 0) setActive(nextOpen);
                  }}
                />
              ))}
            </View>
          ) : null}
          {extraVocab.length ? (
            <View style={st.chipRow}>
              {extraVocab.map((i) => (
                <OptionButton
                  key={i}
                  label={t(`คำถามที่ ${i + 1}`, `Question ${i + 1}`)}
                  selected={active === i}
                  onPress={() => setActive(i)}
                />
              ))}
            </View>
          ) : null}
          <Text style={taskStyles.muted}>
            {t(`ตอบแล้ว ${vocabPicks.filter(Boolean).length}/${vocab.length}`, `${vocabPicks.filter(Boolean).length}/${vocab.length} answered`)}
          </Text>
          <PrimaryButton
            label={vocabDone ? t("ไปส่วนการอ่าน →", "Continue to reading →") : t("ตอบให้ครบทุกช่องก่อน", "Answer every gap first")}
            disabled={!vocabDone || submitting}
            onPress={() => setPhase("reading")}
          />
        </>
      ) : reading[rIdx] ? (
        <>
          <SectionLabel>
            {t(`ส่วนที่ 2 · การอ่าน ${rIdx + 1}/${reading.length}`, `PART 2 · READING ${rIdx + 1}/${reading.length}`)} ·{" "}
            {t(READING_LABEL[reading[rIdx]!.key].th, READING_LABEL[reading[rIdx]!.key].en)}
          </SectionLabel>
          <Text style={taskStyles.question}>{reading[rIdx]!.block.question}</Text>
          {shuffledReading[rIdx]!.map((o) => (
            <OptionButton
              key={o}
              label={o}
              selected={rPick === o}
              disabled={submitting || rLocked}
              state={rLocked ? (o === reading[rIdx]!.block.correctAnswer ? "correct" : rPick === o ? "wrong" : null) : null}
              onPress={() => setRPick(o)}
            />
          ))}
          {rLocked && reading[rIdx]!.block.explanationThai ? <Note>{reading[rIdx]!.block.explanationThai}</Note> : null}
          {!rLocked ? (
            <PrimaryButton
              label={t("ยืนยันคำตอบ", "Check answer")}
              disabled={!rPick || submitting}
              onPress={() => {
                readingPicks.current[rIdx] = rPick ?? "";
                setRLocked(true);
              }}
            />
          ) : rIdx < reading.length - 1 ? (
            <PrimaryButton
              label={t("ข้อต่อไป →", "Next question →")}
              onPress={() => {
                setRIdx(rIdx + 1);
                setRPick(null);
                setRLocked(false);
              }}
            />
          ) : (
            <SubmitButton busy={submitting} onPress={finish} />
          )}
        </>
      ) : (
        <SubmitButton busy={submitting} onPress={finish} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "900", color: C.ink },
  chip: { color: C.blue, fontWeight: "800", backgroundColor: "#EAF1FF" },
  chipActive: { backgroundColor: C.yellow, color: C.ink },
  chipPicked: { textDecorationLine: "underline" },
  filled: { color: C.green, fontWeight: "800" },
  gap: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#94A3B8",
    borderRadius: 10,
    padding: 10,
  },
  gapFilled: { borderStyle: "solid", borderColor: "#A7F3D0", backgroundColor: "#F0FDF4" },
  gapText: { fontSize: 14, color: C.sub, fontStyle: "italic" },
  box: { gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
