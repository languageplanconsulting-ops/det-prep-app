import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useScoreReveal } from "../../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../../components/LuxuryPressable";
import {
  fetchPracticeSet,
  finishStudySession,
  startStudySession,
  submitDialogueSummaryReport,
  postPracticeAttempt,
} from "../../../../lib/api";
import { buildContentKey } from "../../../../lib/practice-progress";
import {
  DIALOGUE_SUMMARY_MAX_SCORE,
  DIALOGUE_SUMMARY_MIN_WORDS,
} from "../../../../lib/dialogue-summary-constants";
import type {
  DialogueSummaryAttemptReport,
  DialogueSummaryDifficulty,
  DialogueSummaryExam,
} from "../../../../lib/types";
import { LOAD_FAILED, errorText, scoreLine, useI18n } from "../../../../lib/i18n";
import { ScreenLoader } from "../../../../components/MascotLoader";
import { MascotLoader } from "../../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../../components/Motion";

function criterionLabel(t: (th: string, en: string) => string, key: string): string {
  if (key === "Relevancy") return t("ความตรงประเด็น", "Relevancy");
  if (key === "Grammar") return t("ไวยากรณ์", "Grammar");
  if (key === "Flow") return t("ความลื่นไหล", "Flow");
  if (key === "Vocabulary") return t("คำศัพท์", "Vocabulary");
  return key;
}

function randomAttemptId(): string {
  return `ds_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function DialogueSummarySessionScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const { t } = useI18n();
  const roundNum = Number(round);
  const diff = difficulty as DialogueSummaryDifficulty;
  const setNumber = Number(set);
  const setId = `ds-r${roundNum}-${diff}-s${setNumber}`;
  const attemptId = useMemo(() => randomAttemptId(), []);

  const [exam, setExam] = useState<DialogueSummaryExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [phase, setPhase] = useState<"write" | "grading" | "report">("write");
  const [report, setReport] = useState<DialogueSummaryAttemptReport | null>(null);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report" && !!report);

  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  const meetsMin = wordCount >= DIALOGUE_SUMMARY_MIN_WORDS;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<DialogueSummaryExam>({
        skill: "dialogue_summary",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
      });
      setExam(data);
      const sid = await startStudySession({
        exerciseType: "dialogue_summary",
        skill: "conversation",
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

  const submit = async () => {
    if (!exam || !meetsMin) {
      setError(
        t(
          `เขียนอย่างน้อย ${DIALOGUE_SUMMARY_MIN_WORDS} คำ`,
          `Write at least ${DIALOGUE_SUMMARY_MIN_WORDS} words.`,
        ),
      );
      return;
    }
    setError(null);
    setPhase("grading");
    try {
      const r = await submitDialogueSummaryReport({
        attemptId,
        summary,
        exam,
      });
      setReport(r);
      setPhase("report");
      // Same shape the website writes, so this score shows on web too.
      void postPracticeAttempt({
        taskType: "dialogue_summary",
        scorePct: (r.score160 / 160) * 100,
        detail: {
          via: "dialogue_summary",
          contentKey: buildContentKey("dialogue_summary", diff, roundNum, setNumber),
        },
      });

      const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
      try {
        await finishStudySession({
          sessionId: sessionIdRef.current ?? undefined,
          exerciseType: "dialogue_summary",
          setId,
          score: r.score160,
          completed: r.score160 >= DIALOGUE_SUMMARY_MAX_SCORE,
          duration_seconds: duration,
          submission_payload: { summary, attemptId },
          report_payload: { score160: r.score160, gradingSource: r.gradingSource },
        });
      } catch {
        /* best-effort */
      }
    } catch (e) {
      setPhase("write");
      setError(e instanceof Error ? e.message : t("ตรวจไม่สำเร็จ", "Grading failed"));
    }
  };

  if (loading) return <ScreenLoader />;

  if (error && !exam) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, null)}</Text>
      </View>
    );
  }

  if (phase === "grading") {
    return (
      <View style={styles.center}>
        <MascotLoader grading label={t("กำลังตรวจสรุปของคุณ", "Grading your summary")} />
        <Text style={styles.gradingSub}>
          {t("ใช้เครดิตการตรวจในบัญชีของคุณ", "Uses grading credits on your account.")}
        </Text>
      </View>
    );
  }

  if (phase === "report" && report) {
    const criteria = [
      { key: "Relevancy", r: report.relevancy },
      { key: "Grammar", r: report.grammar },
      { key: "Flow", r: report.flow },
      { key: "Vocabulary", r: report.vocabulary },
    ] as const;

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ResultMascot ratio={DIALOGUE_SUMMARY_MAX_SCORE > 0 ? Math.round(report.score160) / DIALOGUE_SUMMARY_MAX_SCORE : 0} message={DIALOGUE_SUMMARY_MAX_SCORE > 0 && Math.round(report.score160) / DIALOGUE_SUMMARY_MAX_SCORE >= 0.75 ? t("เก่งมาก! ทำได้ดีเยี่ยมเลย 🎉", "Great job — excellent work! 🎉") : t("ใกล้แล้ว! ดูจุดที่พลาดด้านล่าง แล้วลองอีกครั้งนะ 💪", "Almost there! Review the misses below and try again 💪")} />
        <AnimatedScore
          value={Math.round(report.score160)}
          max={DIALOGUE_SUMMARY_MAX_SCORE}
          format={(n, m) => scoreLine(t, n, m)}
          style={styles.score}
        />
        {criteria.map(({ key, r }, i) => (
          <FadeInItem key={key} index={i + 1} style={styles.criterion}>
            <Text style={styles.criterionTitle}>
              {criterionLabel(t, key)} — {Math.round(r.scorePercent)}% (~{r.pointsOn160}{" "}
              {t("คะแนน", "pts")})
            </Text>
            <Text style={styles.criterionEn}>{r.summary.en}</Text>
            <Text style={styles.criterionTh}>{r.summary.th}</Text>
          </FadeInItem>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        {exam.titleEn} · {t(`ชุดที่ ${setNumber}`, `Set ${setNumber}`)}
      </Text>
      {exam.titleTh ? <Text style={styles.titleTh}>{exam.titleTh}</Text> : null}

      <View style={styles.block}>
        <Text style={styles.blockTitle}>{t("สถานการณ์", "Scenario")}</Text>
        {exam.scenarioSentences.map((s, i) => (
          <Text key={i} style={styles.line}>
            {s}
          </Text>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>{t("บทสนทนา", "Dialogue")}</Text>
        {exam.dialogue.map((t, i) => (
          <View key={i} style={styles.turn}>
            <Text style={styles.speaker}>{t.speaker}</Text>
            <Text style={styles.line}>{t.text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.prompt}>
        {t(
          `เขียนสรุปด้วยคำของคุณเอง (อย่างน้อย ${DIALOGUE_SUMMARY_MIN_WORDS} คำ)`,
          `Write a summary in your own words (min ${DIALOGUE_SUMMARY_MIN_WORDS} words).`,
        )}
      </Text>
      <Text style={styles.wordCount}>
        {t(`${wordCount} คำ`, `${wordCount} word${wordCount === 1 ? "" : "s"}`)}
        {!meetsMin
          ? t(
              ` · ต้องเขียนเพิ่มอีก ${DIALOGUE_SUMMARY_MIN_WORDS - wordCount} คำ`,
              ` · need ${DIALOGUE_SUMMARY_MIN_WORDS - wordCount} more`,
            )
          : ""}
      </Text>

      <TextInput
        style={styles.input}
        multiline
        placeholder={t("สรุปของคุณ…", "Your summary…")}
        value={summary}
        onChangeText={setSummary}
        autoCapitalize="sentences"
        autoCorrect
        textAlignVertical="top"
      />

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <LuxuryPressable
        style={[styles.btn, !meetsMin && styles.btnDisabled]}
        disabled={!meetsMin}
        sound="submit" onPress={() => void submit()}
      >
        <Text style={styles.btnText}>{t("ส่งตรวจ", "Submit for grading")}</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  grading: { marginTop: 16, fontWeight: "800", fontSize: 16 },
  gradingSub: { marginTop: 8, color: "#6B7280", fontSize: 13 },
  meta: { fontWeight: "800", fontSize: 15, color: "#004AAD" },
  titleTh: { marginTop: 4, fontSize: 14, color: "#6B7280" },
  block: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  blockTitle: { fontWeight: "900", marginBottom: 8 },
  turn: { marginTop: 10 },
  speaker: { fontWeight: "800", fontSize: 12, color: "#004AAD" },
  line: { fontSize: 14, lineHeight: 22, marginTop: 2 },
  prompt: { marginTop: 20, fontWeight: "700", fontSize: 14 },
  wordCount: { marginTop: 6, fontSize: 12, color: "#6B7280", fontWeight: "700" },
  input: {
    marginTop: 12,
    minHeight: 160,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  formError: { marginTop: 10, color: "#b91c1c", fontWeight: "700" },
  btn: {
    marginTop: 16,
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
  source: { marginTop: 6, fontSize: 12, color: "#6B7280" },
  criterion: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  criterionTitle: { fontWeight: "800" },
  criterionEn: { marginTop: 6, fontSize: 14 },
  criterionTh: { marginTop: 4, fontSize: 13, color: "#6B7280" },
});
