import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useScoreReveal } from "../../../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../../../components/LuxuryPressable";
import { fetchPracticeSet, finishStudySession, startStudySession, postPracticeAttempt } from "../../../../../lib/api";
import { buildContentKey, packSubIndexed } from "../../../../../lib/practice-progress";
import { READING_DIFFICULTY_MAX } from "../../../../../lib/reading-constants";
import { answersMatch, shuffleMcOptions } from "../../../../../lib/reading-utils";
import type {
  ReadingDifficulty,
  ReadingExamResultRow,
  ReadingExamUnit,
  ReadingQuestionKey,
} from "../../../../../lib/types";
import { LOAD_FAILED, errorText, scoreLine, useI18n } from "../../../../../lib/i18n";
import { ScreenLoader } from "../../../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../../../components/Motion";
import { sfxCorrect, sfxWrong } from "../../../../../lib/exam-sfx-mobile";
import { syncNotebookEntry } from "../../../../../lib/notebook-sync";
import { findVocab, stripStars, type HighlightVocab } from "../../../../../lib/vocab-match";
import { RichPassageText } from "../../../../../components/RichPassageText";
import { WordCard } from "../../../../../components/WordCard";

/** Question type label in the current language (row data keeps the English label). */
function questionLabel(
  t: (th: string, en: string) => string,
  key: string,
  fallback: string,
): string {
  if (key === "missingSentence") return t("ข้อ 1 — ย่อหน้าที่หายไป", "Q1 — Missing paragraph");
  if (key === "informationLocation") return t("ข้อ 2 — ตำแหน่งของข้อมูล", "Q2 — Information location");
  if (key === "bestTitle") return t("ข้อ 3 — ชื่อเรื่องที่เหมาะที่สุด", "Q3 — Best title");
  if (key === "mainIdea") return t("ข้อ 4 — ใจความสำคัญ", "Q4 — Main idea");
  return fallback;
}

const ORDER: {
  key: ReadingQuestionKey;
  label: string;
  pick: (s: ReadingExamUnit) => ReadingExamUnit["missingSentence"];
}[] = [
  { key: "missingSentence", label: "Q1 — Missing paragraph", pick: (s) => s.missingSentence },
  {
    key: "informationLocation",
    label: "Q2 — Information location",
    pick: (s) => s.informationLocation,
  },
  { key: "bestTitle", label: "Q3 — Best title", pick: (s) => s.bestTitle },
  { key: "mainIdea", label: "Q4 — Main idea", pick: (s) => s.mainIdea },
];

export default function ReadingSessionScreen() {
  const { round, difficulty, set, exam } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
    exam: string;
  }>();
  const { t } = useI18n();
  const roundNum = Number(round);
  const diff = difficulty as ReadingDifficulty;
  const setNumber = Number(set);
  const examNumber = Number(exam);
  const setId = `read-r${roundNum}-${diff}-s${setNumber}-e${examNumber}`;
  const maxScore = READING_DIFFICULTY_MAX[diff];

  const [readingExam, setReadingExam] = useState<ReadingExamUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"quiz" | "report">("quiz");
  const [step, setStep] = useState(0);
  const [q1Revealed, setQ1Revealed] = useState(false);
  const [answers, setAnswers] = useState<Partial<Record<ReadingQuestionKey, string>>>({});
  const [rows, setRows] = useState<ReadingExamResultRow[]>([]);
  const [score, setScore] = useState(0);
  // Tapped passage highlight (word card) + words saved to the notebook this session.
  const [cardPhrase, setCardPhrase] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(() => new Set());
  const [passageBig, setPassageBig] = useState(false);
  const questionScroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  // each new question starts at its top
  useEffect(() => {
    questionScroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const shuffledPerStep = useMemo(() => {
    if (!readingExam) return [];
    return ORDER.map(({ pick }) => {
      const block = pick(readingExam);
      return shuffleMcOptions(block.options, block.correctAnswer);
    });
  }, [readingExam]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<ReadingExamUnit>({
        skill: "reading",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
        exam: examNumber,
      });
      setReadingExam(data);
      const sid = await startStudySession({
        exerciseType: "reading",
        skill: "comprehension",
        difficulty: diff,
        setId,
      });
      sessionIdRef.current = sid;
      startedAt.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [roundNum, diff, setNumber, examNumber, setId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ScreenLoader />;

  if (error || !readingExam) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
      </View>
    );
  }

  const current = ORDER[step]!;
  const block = current.pick(readingExam);
  const { shuffled } = shuffledPerStep[step] ?? { shuffled: block.options };
  const canAdvance =
    step === 0 ? q1Revealed : Boolean(answers[current.key] && answers[current.key]!.length > 0);

  const finish = async (resultRows: ReadingExamResultRow[]) => {
    const correctCount = resultRows.filter((r) => r.isCorrect).length;
    const attained = Math.round((correctCount / 4) * maxScore);
    setRows(resultRows);
    setScore(attained);
    setPhase("report");

    // Same shape the website writes, so this score shows on web too.
    void postPracticeAttempt({
      taskType: "reading_comprehension",
      scorePct: maxScore > 0 ? (attained / maxScore) * 100 : 0,
      detail: {
        correct: correctCount,
        total: 4,
        contentKey: buildContentKey("reading", diff, roundNum, packSubIndexed(setNumber, examNumber)),
      },
    });
    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "reading",
        setId,
        score: attained,
        completed: correctCount === 4,
        duration_seconds: duration,
        submission_payload: { answers: resultRows },
        report_payload: { score: attained, maxScore, correctCount },
      });
    } catch {
      /* best-effort */
    }
  };

  const goNext = () => {
    if (!canAdvance) return;
    if (step < ORDER.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    const resultRows: ReadingExamResultRow[] = ORDER.map(({ key, label, pick }) => {
      const b = pick(readingExam);
      const userAnswer = answers[key] ?? "";
      return {
        key,
        label,
        question: b.question,
        userAnswer,
        correctAnswer: b.correctAnswer,
        isCorrect: answersMatch(userAnswer, b.correctAnswer),
        explanationThai: b.explanationThai,
      };
    });
    void finish(resultRows);
  };

  if (phase === "report") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ResultMascot ratio={maxScore > 0 ? score / maxScore : 0} message={maxScore > 0 && score / maxScore >= 0.75 ? t("เก่งมาก! ทำได้ดีเยี่ยมเลย 🎉", "Great job — excellent work! 🎉") : t("ใกล้แล้ว! ดูจุดที่พลาดด้านล่าง แล้วลองอีกครั้งนะ 💪", "Almost there! Review the misses below and try again 💪")} />
        <AnimatedScore
          value={score}
          max={maxScore}
          format={(n, m) => scoreLine(t, n, m)}
          style={styles.score}
        />
        {rows.map((row, i) => (
          <FadeInItem key={row.key} index={i + 1} style={styles.reportRow}>
            <Text style={[styles.reportLabel, row.isCorrect ? styles.ok : styles.bad]}>
              {questionLabel(t, row.key, row.label)} —{" "}
              {row.isCorrect ? t("ถูก", "Correct") : t("ผิด", "Wrong")}
            </Text>
            <Text style={styles.reportQ}>{stripStars(row.question)}</Text>
            <Text style={styles.reportA}>
              {t("คุณตอบ", "You")}: {stripStars(row.userAnswer) || "—"}
            </Text>
            <Text style={styles.reportC}>
              {t("เฉลย", "Answer")}: {stripStars(row.correctAnswer)}
            </Text>
            {row.explanationThai ? (
              <Text style={styles.reportTh}>{row.explanationThai}</Text>
            ) : null}
          </FadeInItem>
        ))}
        <LuxuryPressable style={styles.btn} onPress={() => setPhase("quiz")}>
          <Text style={styles.btnText}>{t("ทบทวนบทความ", "Review passage")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  const { passage } = readingExam;
  const correctP2 = readingExam.missingSentence.correctAnswer;
  const cardVocab = cardPhrase ? findVocab(cardPhrase, readingExam.highlightedVocab) : null;
  const wordKey = (w: string) => w.trim().toLowerCase();
  const isSaved = (phrase: string, vocab: HighlightVocab | null) =>
    savedWords.has(wordKey(phrase)) || (vocab ? savedWords.has(wordKey(vocab.word)) : false);

  const saveWord = async (v: HighlightVocab) => {
    await syncNotebookEntry({
      id: `reading-r${roundNum}-${diff}-s${setNumber}-e${examNumber}-${wordKey(v.word).replace(/\s+/g, "-")}`,
      source: "reading-comprehension",
      categoryIds: ["all", "vocabulary"],
      titleEn: v.word,
      titleTh: v.meaningTh,
      bodyEn: `${v.meaningEn}\n\nExample: ${v.example}`,
      bodyTh: `${v.meaningTh}\n\nตัวอย่าง: ${v.example}`,
      userNote: "#reading",
      createdAt: new Date().toISOString(),
    });
    setSavedWords((prev) => {
      const next = new Set(prev);
      next.add(wordKey(v.word));
      if (cardPhrase) next.add(wordKey(cardPhrase));
      return next;
    });
  };

  const pickedNow = step === 0 ? answers.missingSentence : answers[current.key];

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.metaTop}>
          {t(`ชุดที่ ${setNumber} · ข้อสอบ ${examNumber}`, `Set ${setNumber} · Exam ${examNumber}`)}
        </Text>
        <View style={styles.dots}>
          {ORDER.map((o, i) => (
            <View
              key={o.key}
              style={[styles.dot, i < step && styles.dotDone, i === step && styles.dotNow]}
            >
              <Text style={[styles.dotText, (i < step || i === step) && styles.dotTextOn]}>
                {i < step ? "✓" : i + 1}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* passage keeps its own scroll so the question below never leaves the screen */}
      <View style={[styles.passageWrap, passageBig ? styles.passageWrapBig : null]}>
        <View style={styles.passageHead}>
          <Text style={styles.passageTitle}>{t("📖 บทความ", "📖 Passage")}</Text>
          <LuxuryPressable sound="none" style={styles.sizeBtn} onPress={() => setPassageBig((b) => !b)}>
            <Text style={styles.sizeBtnText}>
              {passageBig ? t("ย่อบทความ ▴", "Smaller ▴") : t("ขยายบทความ ▾", "Bigger ▾")}
            </Text>
          </LuxuryPressable>
        </View>
        <ScrollView style={styles.passageScroll} contentContainerStyle={styles.passageInner}>
          <RichPassageText
            text={passage.p1}
            style={styles.para}
            savedWords={savedWords}
            onPressWord={setCardPhrase}
          />
          {step === 0 && !q1Revealed ? (
            <View style={styles.paraGap}>
              <Text style={styles.paraHidden}>
                {t("ย่อหน้าที่ 2 หายไป — เลือกจากตัวเลือกด้านล่าง", "Paragraph 2 is missing — pick it below")}
              </Text>
            </View>
          ) : (
            // like the website: the gap is filled with the real answer (stored p2 is often just a placeholder)
            <RichPassageText
              text={correctP2}
              style={[styles.para, step === 0 ? styles.paraRevealed : null]}
              savedWords={savedWords}
              onPressWord={setCardPhrase}
            />
          )}
          <RichPassageText
            text={passage.p3}
            style={styles.para}
            savedWords={savedWords}
            onPressWord={setCardPhrase}
          />
        </ScrollView>
      </View>

      <ScrollView ref={questionScroll} style={styles.questionPane} contentContainerStyle={styles.questionInner}>
        <Text style={styles.qLabel}>{questionLabel(t, current.key, current.label)}</Text>
        <Text style={styles.question}>{stripStars(block.question)}</Text>

        {shuffled.map((option) => {
          const picked = pickedNow === option;
          // Q1 is checked on the spot (it reveals paragraph 2), so show ✓/✗ there.
          const q1Mark = step === 0 && q1Revealed;
          const q1Right = q1Mark && option === correctP2;
          const q1Wrong = q1Mark && picked && option !== correctP2;
          return (
            <LuxuryPressable
              key={option}
              scaleTo={0.98}
              style={[
                styles.option,
                picked && styles.optionSelected,
                q1Right && styles.optionRight,
                q1Wrong && styles.optionWrong,
              ]}
              onPress={() => {
                if (step === 0) {
                  // Q1 reveals the real paragraph 2 right away — chime right/wrong once.
                  if (q1Revealed) return;
                  if (option === correctP2) sfxCorrect();
                  else sfxWrong();
                  setAnswers((a) => ({ ...a, missingSentence: option }));
                  setQ1Revealed(true);
                } else {
                  setAnswers((a) => ({ ...a, [current.key]: option }));
                }
              }}
            >
              <Text style={[styles.optionText, picked && styles.optionTextSelected]}>
                {q1Right ? "✓  " : q1Wrong ? "✗  " : ""}
                {stripStars(option)}
              </Text>
            </LuxuryPressable>
          );
        })}

        {step === 0 && q1Revealed ? (
          <Text style={[styles.revealNote, answers.missingSentence === correctP2 ? styles.ok : styles.bad]}>
            {answers.missingSentence === correctP2
              ? t("✓ ถูกต้อง! ย่อหน้าที่ 2 แสดงในบทความแล้ว", "✓ Correct! Paragraph 2 is now in the passage")
              : t("✗ ยังไม่ใช่ — ย่อหน้าที่ถูกต้องแสดงในบทความแล้ว", "✗ Not this one — the real paragraph 2 is now in the passage")}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <LuxuryPressable
          style={[styles.btn, styles.btnFooter, !canAdvance && styles.btnDisabled]}
          disabled={!canAdvance}
          onPress={goNext}
        >
          <Text style={[styles.btnText, !canAdvance && styles.btnTextDisabled]}>
            {!canAdvance
              ? t("เลือกคำตอบก่อน", "Pick an answer first")
              : step < 3
                ? t(`ถัดไป → ข้อ ${step + 2}`, `Next → Q${step + 2}`)
                : t("เสร็จสิ้น ดูผล", "Finish & see results")}
          </Text>
        </LuxuryPressable>
      </View>

      <WordCard
        phrase={cardPhrase}
        vocab={cardVocab}
        saved={cardPhrase ? isSaved(cardPhrase, cardVocab) : false}
        onSave={saveWord}
        onClose={() => setCardPhrase(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#b91c1c", fontWeight: "700", padding: 20, textAlign: "center" },
  meta: { fontWeight: "800", fontSize: 13, color: "#004AAD", marginBottom: 12 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  metaTop: { fontWeight: "800", fontSize: 13, color: "#004AAD" },
  dots: { flexDirection: "row", gap: 6 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dotDone: { backgroundColor: "#059669", borderColor: "#059669" },
  dotNow: { backgroundColor: "#004AAD", borderColor: "#004AAD" },
  dotText: { fontSize: 12, fontWeight: "900", color: "#9CA3AF" },
  dotTextOn: { color: "#fff" },
  passageWrap: {
    flex: 1,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    overflow: "hidden",
  },
  passageWrapBig: { flex: 2.4 },
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
  sizeBtnText: { fontSize: 12, fontWeight: "800", color: "#004AAD" },
  passageScroll: { flex: 1 },
  passageInner: { padding: 14, paddingBottom: 4 },
  para: { fontSize: 15, lineHeight: 24, marginBottom: 12 },
  paraRevealed: { backgroundColor: "#FFF7D1" },
  paraGap: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#C7D2FE",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#F5F7FF",
  },
  paraHidden: { fontSize: 13, fontWeight: "700", color: "#6366F1", textAlign: "center" },
  questionPane: { flex: 1.2 },
  questionInner: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  qLabel: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  question: { fontSize: 16, fontWeight: "800", marginTop: 4, marginBottom: 10, lineHeight: 23 },
  option: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionPressed: { backgroundColor: "#FFF7D1" },
  optionSelected: { backgroundColor: "#cde0ff", borderColor: "#004AAD" },
  optionRight: { backgroundColor: "#ECFDF5", borderColor: "#059669" },
  optionWrong: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  optionText: { fontSize: 14, lineHeight: 21, color: "#111" },
  optionTextSelected: { fontWeight: "700" },
  revealNote: { fontSize: 13, fontWeight: "800", marginTop: 2, marginBottom: 4 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  btn: {
    marginTop: 12,
    backgroundColor: "#004AAD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  btnFooter: { marginTop: 0 },
  btnDisabled: { backgroundColor: "#E5E7EB", borderColor: "#D1D5DB" },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  btnTextDisabled: { color: "#6B7280" },
  score: { fontSize: 24, fontWeight: "900" },
  reportRow: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reportLabel: { fontWeight: "800" },
  ok: { color: "#15803d" },
  bad: { color: "#b91c1c" },
  reportQ: { marginTop: 4, fontSize: 14 },
  reportA: { marginTop: 4, fontSize: 13 },
  reportC: { marginTop: 2, fontSize: 13, color: "#15803d", fontWeight: "700" },
  reportTh: { marginTop: 6, fontSize: 13, color: "#6B7280" },
});
