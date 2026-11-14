import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useScoreReveal } from "../../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../../components/LuxuryPressable";
import { fetchPracticeSet, finishStudySession, startStudySession, postPracticeAttempt } from "../../../../lib/api";
import { buildContentKey } from "../../../../lib/practice-progress";
import { splitFitbPassage } from "../../../../lib/fitb-passage";
import { fitbMaxScore } from "../../../../lib/fitb-constants";
import {
  assembleFitbAttempt,
  calculateFitbDetScore,
  fitbExpectedPrefix,
  fitbRemainderLength,
  gradeFitbBlank,
} from "../../../../lib/fitb-scoring";
import type { FitbBlankGrade, FitbDifficulty, FitbSet } from "../../../../lib/types";
import { LOAD_FAILED, errorText, scoreLine, setLine, useI18n } from "../../../../lib/i18n";
import { ScreenLoader } from "../../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../../components/Motion";

function gradeLabel(t: (th: string, en: string) => string, grade: string | undefined): string {
  if (grade === "exact") return t("ถูกต้อง", "exact");
  if (grade === "close") return t("เกือบถูก", "close");
  if (grade === "wrong") return t("ผิด", "wrong");
  return grade ?? "";
}

export default function FitbSessionScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const { t } = useI18n();
  const roundNum = Number(round);
  const diff = difficulty as FitbDifficulty;
  const setNumber = Number(set);
  const setId = `fitb-r${roundNum}-${diff}-s${setNumber}`;

  const [fitbSet, setFitbSet] = useState<FitbSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"quiz" | "report">("quiz");
  const [inputs, setInputs] = useState<string[]>([]);
  const [clueUsed, setClueUsed] = useState<boolean[]>([]);
  const [clueVisible, setClueVisible] = useState<boolean[]>([]);
  /** Blank receiving keystrokes, and the blank whose hint card is floating (or null). */
  const [activeBlank, setActiveBlank] = useState<number | null>(null);
  const [hintBlank, setHintBlank] = useState<number | null>(null);
  const keyInput = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [grades, setGrades] = useState<FitbBlankGrade[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [detScore, setDetScore] = useState(0);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  const n = fitbSet?.missingWords.length ?? 0;
  const maxScore = fitbMaxScore(diff);
  const segments = useMemo(
    () => (fitbSet ? splitFitbPassage(fitbSet.passage) : []),
    [fitbSet],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<FitbSet>({
        skill: "fitb",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
      });
      setFitbSet(data);
      const blanks = data.missingWords.length;
      setInputs(new Array(blanks).fill(""));
      setClueUsed(new Array(blanks).fill(false));
      setClueVisible(new Array(blanks).fill(false));
      const sid = await startStudySession({
        exerciseType: "fill-in-blank",
        skill: "literacy",
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
  }, [roundNum, diff, setNumber, setId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSubmit = useMemo(() => {
    if (!fitbSet) return false;
    for (let i = 0; i < n; i++) {
      const rem = fitbRemainderLength(fitbSet.missingWords[i]!);
      if (rem === 0) continue;
      if (inputs[i]!.trim().length !== rem) return false;
    }
    return n > 0;
  }, [fitbSet, inputs, n]);

  const toggleClue = (i: number) => {
    setHintBlank((h) => (h === i ? null : i));
    setClueVisible((v) => {
      const nv = [...v];
      nv[i] = !nv[i];
      return nv;
    });
    setClueUsed((u) => {
      if (u[i]) return u;
      const nu = [...u];
      nu[i] = true;
      return nu;
    });
  };

  const focusBlank = (i: number) => {
    setActiveBlank(i);
    // focus after the state flush so the hidden input carries this blank's value
    setTimeout(() => keyInput.current?.focus(), 0);
  };

  const typeInto = (text: string) => {
    if (activeBlank == null || !fitbSet) return;
    const mw = fitbSet.missingWords[activeBlank]!;
    const rem = fitbRemainderLength(mw);
    const next = text.replace(/[^A-Za-z'-]/g, "").slice(0, rem);
    setInputs((prev) => {
      const cp = [...prev];
      cp[activeBlank] = next;
      return cp;
    });
    // word complete → move on to the next blank that still has empty slots
    if (next.length === rem) {
      const after = fitbSet.missingWords.findIndex(
        (w, j) => j > activeBlank && (inputs[j] ?? "").length < fitbRemainderLength(w),
      );
      if (after >= 0) setActiveBlank(after);
    }
  };

  const submit = async () => {
    if (!fitbSet) return;
    const g: FitbBlankGrade[] = [];
    const ua: string[] = [];
    for (let i = 0; i < n; i++) {
      const mw = fitbSet.missingWords[i]!;
      g.push(gradeFitbBlank(mw, inputs[i] ?? ""));
      ua.push(assembleFitbAttempt(mw, inputs[i] ?? ""));
    }
    const score = calculateFitbDetScore({ grades: g, clueUsed, difficulty: diff });
    setGrades(g);
    setUserAnswers(ua);
    setDetScore(score);
    setPhase("report");

    // Same shape the website writes, so this score shows on web too.
    void postPracticeAttempt({
      taskType: "fill_in_blanks",
      scorePct: maxScore > 0 ? (score / maxScore) * 100 : 0,
      detail: {
        correct: g.filter((x) => x === "exact").length,
        total: g.length,
        contentKey: buildContentKey("fitb", diff, roundNum, setNumber),
      },
    });
    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "fill-in-blank",
        setId,
        score,
        completed: score >= maxScore,
        duration_seconds: duration,
        submission_payload: { inputs, clueUsed, grades: g },
        report_payload: { score, maxScore, userAnswers: ua },
      });
    } catch {
      /* best-effort */
    }
  };

  if (loading) return <ScreenLoader />;

  if (error || !fitbSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
      </View>
    );
  }

  if (phase === "report") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ResultMascot ratio={maxScore > 0 ? detScore / maxScore : 0} message={maxScore > 0 && detScore / maxScore >= 0.75 ? t("เก่งมาก! ทำได้ดีเยี่ยมเลย 🎉", "Great job — excellent work! 🎉") : t("ใกล้แล้ว! ดูจุดที่พลาดด้านล่าง แล้วลองอีกครั้งนะ 💪", "Almost there! Review the misses below and try again 💪")} />
        <AnimatedScore
          value={detScore}
          max={maxScore}
          format={(n, m) => scoreLine(t, n, m)}
          style={styles.score}
        />
        {fitbSet.missingWords.map((mw, i) => (
          <FadeInItem key={i} index={i + 1} style={styles.reportRow}>
            <Text style={styles.reportGrade}>
              {t(`ช่องที่ ${i + 1}`, `Blank ${i + 1}`)}: {gradeLabel(t, grades[i])}{" "}
              {clueUsed[i] ? t("(ใช้คำใบ้)", "(clue used)") : ""}
            </Text>
            <Text style={styles.reportAnswer}>
              {t("คุณตอบ", "You")}: {userAnswers[i]}
            </Text>
            <Text style={styles.reportCorrect}>
              {t("เฉลย", "Answer")}: {mw.correctWord}
            </Text>
            {mw.explanationThai ? (
              <Text style={styles.reportTh}>{mw.explanationThai}</Text>
            ) : null}
          </FadeInItem>
        ))}
        <LuxuryPressable style={styles.btn} onPress={() => setPhase("quiz")}>
          <Text style={styles.btnText}>{t("ทำอีกครั้ง", "Try again")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  let blankCursor = 0;

  const hintWord = hintBlank != null ? fitbSet.missingWords[hintBlank] : null;

  return (
    <View style={styles.screen}>
    {/* one hidden input takes the keystrokes for whichever blank is active */}
    <TextInput
      ref={keyInput}
      style={styles.keyInput}
      value={activeBlank != null ? (inputs[activeBlank] ?? "") : ""}
      onChangeText={typeInto}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      onBlur={() => setActiveBlank(null)}
    />
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.meta}>
        {setLine(t, roundNum, difficulty, setNumber)}
      </Text>
      <Text style={styles.tip}>
        {t("แตะที่คำเพื่อพิมพ์ตัวอักษรที่หายไป · 💡 = คำใบ้", "Tap a word to type the missing letters · 💡 = hint")}
      </Text>

      <View style={styles.passage}>
        <Text style={styles.passageText}>
          {segments.map((seg, idx) => {
            if (seg.type === "text") {
              return <Text key={idx}>{seg.value}</Text>;
            }
            const bi = seg.blankIndex >= 0 ? seg.blankIndex : blankCursor++;
            const mw = fitbSet.missingWords[bi];
            if (!mw) return <Text key={idx}>[?]</Text>;
            const prefix = fitbExpectedPrefix(mw);
            const rem = fitbRemainderLength(mw);
            const typed = inputs[bi] ?? "";
            const active = activeBlank === bi;
            const slots = Array.from({ length: rem }, (_, k) => typed[k] ?? "_");
            return (
              <Text key={idx}>
                <Text
                  onPress={() => focusBlank(bi)}
                  style={[styles.word, active && styles.wordActive]}
                  accessibilityRole="button"
                  accessibilityLabel={t(`ช่องที่ ${bi + 1}`, `Blank ${bi + 1}`)}
                >
                  <Text style={styles.prefix}>{prefix}</Text>
                  {slots.map((ch, k) => (
                    <Text
                      key={k}
                      style={[
                        styles.slot,
                        ch !== "_" && styles.slotFilled,
                        active && k === typed.length && styles.slotCursor,
                      ]}
                    >
                      {ch}
                      {k < rem - 1 ? "\u2009" : ""}
                    </Text>
                  ))}
                </Text>
                <Text
                  onPress={() => toggleClue(bi)}
                  style={[styles.clueIcon, hintBlank === bi && styles.clueIconOn]}
                  accessibilityRole="button"
                  accessibilityLabel={t(`คำใบ้ช่องที่ ${bi + 1}`, `Hint for blank ${bi + 1}`)}
                >
                  {" 💡 "}
                </Text>
              </Text>
            );
          })}
        </Text>
      </View>

      <LuxuryPressable
        style={[styles.btn, !canSubmit && styles.btnDisabled]}
        disabled={!canSubmit}
        sound="submit" onPress={() => void submit()}
      >
        <Text style={styles.btnText}>{t("ตรวจคำตอบ", "Check answer")}</Text>
      </LuxuryPressable>
    </ScrollView>

    {/* floating, see-through hint card: overlays the passage instead of pushing text around */}
    {hintWord ? (
      <Animated.View
        key={hintBlank}
        entering={FadeInDown.duration(240)}
        exiting={FadeOutUp.duration(180)}
        style={styles.hintCard}
        pointerEvents="box-none"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.hintLabel}>{t(`💡 คำใบ้ช่องที่ ${hintBlank! + 1}`, `💡 Hint · blank ${hintBlank! + 1}`)}</Text>
          <Text style={styles.hintText}>{hintWord.clue}</Text>
        </View>
        <LuxuryPressable style={styles.hintClose} sound="tap" onPress={() => setHintBlank(null)}>
          <Text style={styles.hintCloseText}>✕</Text>
        </LuxuryPressable>
      </Animated.View>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#b91c1c", fontWeight: "700", padding: 20, textAlign: "center" },
  meta: { fontWeight: "800", fontSize: 13, color: "#004AAD", marginBottom: 12 },
  passage: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  passageText: { fontSize: 16, lineHeight: 26 },
  tip: { fontSize: 12, color: "#6B7280", marginBottom: 10 },
  prefix: { fontWeight: "800", color: "#004AAD" },
  word: { borderRadius: 6 },
  wordActive: { backgroundColor: "#FFF3B0" },
  slot: { fontWeight: "800", color: "#94A3B8", fontFamily: "Menlo" },
  slotFilled: { color: "#111" },
  slotCursor: { color: "#004AAD", textDecorationLine: "underline" },
  clueIcon: { fontSize: 13, opacity: 0.55 },
  clueIconOn: { opacity: 1 },
  keyInput: { position: "absolute", top: 0, left: 0, width: 1, height: 1, opacity: 0 },
  hintCard: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,74,173,0.25)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  hintLabel: { fontSize: 12, fontWeight: "900", color: "#004AAD", marginBottom: 4 },
  hintText: { fontSize: 15, lineHeight: 22, color: "#111" },
  hintClose: { width: 28, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(17,24,39,0.06)" },
  hintCloseText: { fontSize: 13, fontWeight: "900", color: "#374151" },
  blankInput: {
    borderBottomWidth: 2,
    borderBottomColor: "#004AAD",
    minWidth: 48,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: "700",
  },
  clueBtn: {
    marginLeft: 4,
    backgroundColor: "#FFCC00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clueBtnText: { fontSize: 10, fontWeight: "800", color: "#004AAD" },
  clueText: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  btn: {
    marginTop: 20,
    backgroundColor: "#004AAD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  score: { fontSize: 24, fontWeight: "900" },
  reportRow: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reportGrade: { fontWeight: "800", textTransform: "capitalize" },
  reportAnswer: { marginTop: 4, fontSize: 14 },
  reportCorrect: { marginTop: 2, fontSize: 14, color: "#15803d", fontWeight: "700" },
  reportTh: { marginTop: 6, fontSize: 13, color: "#6B7280" },
});
