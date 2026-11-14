import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { shuffleMcOptions } from "../../../../../lib/reading-utils";
import { VOCAB_SESSION_MAX } from "../../../../../lib/vocab-constants";
import type { VocabExamResultRow, VocabPassageUnit, VocabSessionLevel } from "../../../../../lib/types";
import { LOAD_FAILED, errorText, scoreLine, useI18n } from "../../../../../lib/i18n";
import { ScreenLoader } from "../../../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../../../components/Motion";
import { sfxCorrect, sfxWrong } from "../../../../../lib/exam-sfx-mobile";
import { AnswerSheet } from "../../../../../components/AnswerSheet";
import { contextHint, grammarHint, meaningHint } from "../../../../../lib/vocab-hints";

export default function VocabSessionScreen() {
  const { round, level, set, passage } = useLocalSearchParams<{
    round: string;
    level: string;
    set: string;
    passage: string;
  }>();
  const { t } = useI18n();
  const roundNum = Number(round);
  const sessionLevel = level as VocabSessionLevel;
  const setNumber = Number(set);
  const passageNumber = Number(passage);
  const setId = `vocab-r${roundNum}-${sessionLevel}-s${setNumber}-p${passageNumber}`;
  const maxScore = VOCAB_SESSION_MAX[sessionLevel];

  const [passageUnit, setPassageUnit] = useState<VocabPassageUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"quiz" | "report">("quiz");
  /** Picked option per blank (by blank index); undefined = not answered yet. */
  const [picks, setPicks] = useState<(string | undefined)[]>([]);
  /** Blank whose answer sheet is open, or null. */
  const [openBlank, setOpenBlank] = useState<number | null>(null);
  const [hintUsed, setHintUsed] = useState<Set<number>>(() => new Set());
  const [rows, setRows] = useState<VocabExamResultRow[]>([]);
  const [score, setScore] = useState(0);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  const parts = useMemo(
    () => (passageUnit ? passageUnit.passageText.split("[BLANK]") : []),
    [passageUnit],
  );
  const shuffledPerBlank = useMemo(() => {
    if (!passageUnit) return [];
    return passageUnit.blanks.map((b) => shuffleMcOptions(b.options, b.correctAnswer));
  }, [passageUnit]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<VocabPassageUnit>({
        skill: "vocab",
        round: roundNum,
        set: setNumber,
        passage: passageNumber,
      });
      setPassageUnit(data);
      const sid = await startStudySession({
        exerciseType: "vocabulary",
        skill: "comprehension",
        difficulty: sessionLevel,
        setId,
      });
      sessionIdRef.current = sid;
      startedAt.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [roundNum, setNumber, passageNumber, sessionLevel, setId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ScreenLoader />;

  if (error || !passageUnit) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
      </View>
    );
  }

  const blankCount = passageUnit.blanks.length;
  if (parts.length !== blankCount + 1) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {t(
            `บทความไม่ถูกต้อง: ต้องมีเครื่องหมาย [BLANK] ${blankCount} จุด`,
            `Invalid passage: expected ${blankCount} [BLANK] markers.`,
          )}
        </Text>
      </View>
    );
  }

  const filledCorrect = passageUnit.blanks.map((b, i) => (picks[i] !== undefined ? b.correctAnswer : undefined));
  const answered = picks.filter((p) => p !== undefined).length;
  const nextBlank = passageUnit.blanks.findIndex((_, i) => picks[i] === undefined);

  const finish = async (finalPicks: (string | undefined)[]) => {
    const resultRows: VocabExamResultRow[] = passageUnit.blanks.map((b, i) => ({
      blankIndex: i + 1,
      question: b.question,
      userAnswer: finalPicks[i] ?? "",
      correctAnswer: b.correctAnswer,
      isCorrect: finalPicks[i] === b.correctAnswer,
      explanationThai: b.explanationThai,
    }));
    const correctCount = resultRows.filter((r) => r.isCorrect).length;
    // score against the real number of blanks (passages have 6–10)
    const attained = Math.round((correctCount / blankCount) * maxScore);

    setRows(resultRows);
    setScore(attained);
    setPhase("report");

    // Same shape the website writes, so this score shows on web too.
    void postPracticeAttempt({
      taskType: "vocabulary_reading",
      scorePct: maxScore > 0 ? (attained / maxScore) * 100 : 0,
      detail: {
        via: "vocab_passage",
        contentKey: buildContentKey("vocab", sessionLevel, roundNum, packSubIndexed(setNumber, passageNumber)),
      },
    });
    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "vocabulary",
        setId,
        score: attained,
        completed: correctCount === blankCount,
        duration_seconds: duration,
        submission_payload: { picks: finalPicks, hintsUsed: [...hintUsed] },
        report_payload: { score: attained, maxScore, correctCount },
      });
    } catch {
      /* best-effort */
    }
  };

  const selectOption = (blank: number, option: string) => {
    const correct = passageUnit.blanks[blank]!.correctAnswer;
    // The right word is filled in straight away, so give right/wrong feedback now.
    if (option === correct) sfxCorrect();
    else sfxWrong();
    const next = [...picks];
    next[blank] = option;
    setPicks(next);
    setOpenBlank(null);
    if (passageUnit.blanks.every((_, i) => next[i] !== undefined)) {
      setTimeout(() => void finish(next), 700);
    }
  };

  const sheetBlank = openBlank != null ? passageUnit.blanks[openBlank] : null;
  const sheetHints = sheetBlank
    ? {
        meaning: meaningHint(passageUnit.correctWords?.[openBlank!], t),
        context: contextHint(passageUnit.passageText, openBlank!, filledCorrect),
        grammar: grammarHint(passageUnit.passageText, openBlank!, sheetBlank.correctAnswer, sheetBlank.options, t),
      }
    : { meaning: null, context: null, grammar: null };

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
          <FadeInItem key={row.blankIndex} index={i + 1} style={styles.reportRow}>
            <Text style={[styles.reportLabel, row.isCorrect ? styles.ok : styles.bad]}>
              {t(`ช่องที่ ${row.blankIndex}`, `Blank ${row.blankIndex}`)} —{" "}
              {row.isCorrect ? t("ถูก", "Correct") : t("ผิด", "Wrong")}
            </Text>
            <Text style={styles.reportA}>
              {t("คุณตอบ", "You")}: {row.userAnswer}
              {hintUsed.has(row.blankIndex - 1) ? t(" · ใช้คำใบ้", " · hint used") : ""}
            </Text>
            <Text style={styles.reportC}>
              {t("เฉลย", "Answer")}: {row.correctAnswer}
            </Text>
            {row.explanationThai ? (
              <Text style={styles.reportTh}>{row.explanationThai}</Text>
            ) : null}
          </FadeInItem>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.meta}>
          {t(
            `ชุดที่ ${setNumber} · บทความ ${passageNumber} · ตอบแล้ว ${answered}/${blankCount}`,
            `Set ${setNumber} · Passage ${passageNumber} · ${answered}/${blankCount} answered`,
          )}
        </Text>
        <Text style={styles.tip}>{t("แตะช่องว่างเพื่อเลือกคำตอบ", "Tap a blank to choose the answer")}</Text>

        <View style={styles.passageBox}>
          <Text style={styles.passageText}>
            {parts.map((segment, i) => {
              if (i >= blankCount) return <Text key={i}>{segment}</Text>;
              const pick = picks[i];
              const right = pick !== undefined && pick === passageUnit.blanks[i]!.correctAnswer;
              const isNext = i === nextBlank;
              return (
                <Text key={i}>
                  {segment}
                  <Text
                    onPress={pick === undefined ? () => setOpenBlank(i) : undefined}
                    style={[
                      styles.blank,
                      pick === undefined ? (isNext ? styles.blankNext : styles.blankOpen) : right ? styles.blankRight : styles.blankWrong,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t(`ช่องที่ ${i + 1}`, `Blank ${i + 1}`)}
                  >
                    {pick === undefined
                      ? ` ${i + 1} ▾ `
                      : ` ${right ? "✓" : "✗"} ${passageUnit.blanks[i]!.correctAnswer} `}
                  </Text>
                </Text>
              );
            })}
          </Text>
        </View>
      </ScrollView>

      {nextBlank >= 0 ? (
        <View style={styles.bottomBar}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(answered / blankCount) * 100}%` }]} />
          </View>
          <LuxuryPressable style={styles.nextBtn} sound="tap" onPress={() => setOpenBlank(nextBlank)}>
            <Text style={styles.nextBtnText}>
              {t(`ตอบช่องที่ ${nextBlank + 1} →`, `Answer blank ${nextBlank + 1} →`)}
            </Text>
          </LuxuryPressable>
        </View>
      ) : null}

      <AnswerSheet
        blankNumber={openBlank != null ? openBlank + 1 : null}
        total={blankCount}
        options={openBlank != null ? (shuffledPerBlank[openBlank]?.shuffled ?? sheetBlank?.options ?? []) : []}
        hints={sheetHints}
        onPick={(o) => openBlank != null && selectOption(openBlank, o)}
        onHint={() => openBlank != null && setHintUsed((s) => new Set(s).add(openBlank))}
        onClose={() => setOpenBlank(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 140 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#b91c1c", fontWeight: "700", padding: 20, textAlign: "center" },
  meta: { fontWeight: "800", fontSize: 13, color: "#004AAD", marginBottom: 12 },
  passageBox: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
    marginBottom: 16,
  },
  passageText: { fontSize: 16, lineHeight: 30 },
  tip: { fontSize: 12, color: "#6B7280", marginBottom: 10 },
  blank: { fontWeight: "900", borderRadius: 6, overflow: "hidden" },
  blankOpen: { color: "#004AAD", backgroundColor: "#E7EFFF" },
  blankNext: { color: "#111", backgroundColor: "#FFE88A" },
  blankRight: { color: "#047857", backgroundColor: "#D1FAE5" },
  blankWrong: { color: "#B91C1C", backgroundColor: "#FEE2E2" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    paddingBottom: 22,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderTopWidth: 1,
    borderTopColor: "#E7EAF1",
  },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: "#E7EAF1", overflow: "hidden", marginBottom: 10 },
  progressFill: { height: "100%", backgroundColor: "#004AAD", borderRadius: 999 },
  nextBtn: { backgroundColor: "#004AAD", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 2, borderColor: "#111" },
  nextBtnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  option: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionPressed: { backgroundColor: "#FFF7D1" },
  optionText: { fontSize: 15 },
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
  reportA: { marginTop: 4, fontSize: 13 },
  reportC: { marginTop: 2, fontSize: 13, color: "#15803d", fontWeight: "700" },
  reportTh: { marginTop: 6, fontSize: 13, color: "#6B7280" },
});
