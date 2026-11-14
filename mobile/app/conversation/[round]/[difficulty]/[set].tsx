import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useScoreReveal } from "../../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../../components/LuxuryPressable";
import {
  fetchPracticeSet,
  finishStudySession,
  postPracticeAttempt,
  startStudySession,
} from "../../../../lib/api";
import { buildContentKey } from "../../../../lib/practice-progress";
import {
  CONVERSATION_FULL_SCORE,
  CONVERSATION_MAIN_Q_COUNT,
  CONVERSATION_SCENARIO_Q_COUNT,
} from "../../../../lib/conversation-constants";
import { computeItemOk, conversationScore } from "../../../../lib/conversation-scoring";
import type { ConversationDifficulty, ConversationExam } from "../../../../lib/types";
import { LOAD_FAILED, errorText, scoreLine, useI18n } from "../../../../lib/i18n";
import { ScreenLoader } from "../../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../../components/Motion";
import { ChoiceQuestion } from "../../../../components/ChoiceQuestion";
import { ExplanationView } from "../../../../components/ExplanationView";
import { ListenCard } from "../../../../components/ListenCard";

type Stage = "intro" | "scenario" | "main" | "report";

export default function ConversationSessionScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const { t } = useI18n();
  const roundNum = Number(round);
  const diff = difficulty as ConversationDifficulty;
  const setNumber = Number(set);
  const setId = `ic-r${roundNum}-${diff}-s${setNumber}`;
  const maxScore = CONVERSATION_FULL_SCORE;

  const [exam, setExam] = useState<ConversationExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [scenarioStep, setScenarioStep] = useState(0);
  const [mainStep, setMainStep] = useState(0);
  const [scenarioPicks, setScenarioPicks] = useState<(number | null)[]>(() =>
    Array.from({ length: CONVERSATION_SCENARIO_Q_COUNT }, () => null),
  );
  const [mainPicks, setMainPicks] = useState<(number | null)[]>(() =>
    Array.from({ length: CONVERSATION_MAIN_Q_COUNT }, () => null),
  );
  const [itemOk, setItemOk] = useState<boolean[]>([]);
  /** Wrong tries per question before finding the answer (scenario then main). */
  const [tries, setTries] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(stage === "report");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<ConversationExam>({
        skill: "conversation",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
      });
      setExam(data);
      const sid = await startStudySession({
        exerciseType: "interactive_conversation",
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

  const finish = async (sp: (number | null)[], mp: (number | null)[]) => {
    if (!exam) return;
    const correctScenario = exam.scenarioQuestions.map((q) => q.correctIndex);
    const correctMain = exam.mainQuestions.map((q) => q.correctIndex);
    const ok = computeItemOk(sp, mp, {
      correctScenarioIndex: correctScenario,
      correctMainIndex: correctMain,
    });
    const correctCount = ok.filter(Boolean).length;
    const attained = conversationScore(correctCount, maxScore);
    setItemOk(ok);
    setScore(attained);
    setStage("report");

    // Same shape the website writes, so this score shows on web too.
    void postPracticeAttempt({
      taskType: "interactive_listening",
      scorePct: maxScore > 0 ? (attained / maxScore) * 100 : 0,
      detail: {
        correct: correctCount,
        total: ok.length,
        itemOk: ok,
        contentKey: buildContentKey("conversation", diff, roundNum, setNumber),
      },
    });
    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "interactive_conversation",
        setId,
        score: attained,
        completed: correctCount === ok.length,
        duration_seconds: duration,
        submission_payload: { scenarioPicks: sp, mainPicks: mp, wrongTries: tries },
        report_payload: { score: attained, maxScore, itemOk: ok },
      });
    } catch {
      /* best-effort */
    }
  };

  if (loading) return <ScreenLoader />;

  if (error || !exam) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
      </View>
    );
  }

  if (stage === "report") {
    const rows = [
      ...exam.scenarioQuestions.map((q, i) => ({
        label: t(`คำถามสถานการณ์ ข้อ ${i + 1}`, `Scenario Q${i + 1}`),
        q,
        picked: scenarioPicks[i],
        prompt: q.question,
      })),
      ...exam.mainQuestions.map((q, i) => ({
        label: t(`คำถามหลัก ข้อ ${i + 1}`, `Main Q${i + 1}`),
        q,
        picked: mainPicks[i],
        prompt: q.question,
      })),
    ];
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ResultMascot
          ratio={maxScore > 0 ? score / maxScore : 0}
          message={
            maxScore > 0 && score / maxScore >= 0.75
              ? t("เก่งมาก! ทำได้ดีเยี่ยมเลย 🎉", "Great job — excellent work! 🎉")
              : t("ใกล้แล้ว! ดูจุดที่พลาดด้านล่าง แล้วลองอีกครั้งนะ 💪", "Almost there! Review the misses below and try again 💪")
          }
        />
        <AnimatedScore value={score} max={maxScore} format={(n, m) => scoreLine(t, n, m)} style={styles.score} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryPill}>
            {t(`✓ ตอบถูกครั้งแรก ${itemOk.filter(Boolean).length}/${itemOk.length}`, `✓ Right first time ${itemOk.filter(Boolean).length}/${itemOk.length}`)}
          </Text>
          {tries.some((n) => n > 0) ? (
            <Text style={[styles.summaryPill, styles.summaryPillSoft]}>
              {t(`ลองใหม่ ${tries.reduce((a, n) => a + n, 0)} ครั้ง`, `${tries.reduce((a, n) => a + n, 0)} retries`)}
            </Text>
          ) : null}
        </View>

        {rows.map((row, i) => (
          <FadeInItem key={row.label} index={i + 1} style={styles.reportCard}>
            <View style={styles.reportHead}>
              <Text style={styles.reportLabel}>{row.label}</Text>
              <Text style={[styles.statusPill, itemOk[i] ? styles.statusOk : styles.statusBad]}>
                {itemOk[i] ? t("✓ ถูก", "✓ Correct") : t("✗ ผิดครั้งแรก", "✗ Wrong first try")}
              </Text>
            </View>
            <Text style={styles.reportPrompt}>{row.prompt}</Text>
            <ExplanationView
              explanation={row.q.explanation}
              options={row.q.options}
              correctIndex={row.q.correctIndex}
              picked={row.picked}
            />
          </FadeInItem>
        ))}
      </ScrollView>
    );
  }

  if (stage === "intro") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.meta}>{exam.title}</Text>
        <ListenCard
          text={exam.scenario}
          label={t("สถานการณ์ — ฟังก่อน แล้วค่อยอ่าน", "Scenario — listen first, then read")}
          autoPlay={false}
        />
        {exam.highlightedWords.length > 0 ? (
          <View style={styles.vocabBox}>
            <Text style={styles.vocabTitle}>{t("คำศัพท์สำคัญ", "Key vocabulary")}</Text>
            {exam.highlightedWords.map((h) => (
              <Text key={h.word} style={styles.vocabLine}>
                <Text style={styles.vocabWord}>{h.word}</Text> — {h.translation}
              </Text>
            ))}
          </View>
        ) : null}
        <LuxuryPressable style={styles.btn} onPress={() => setStage("scenario")}>
          <Text style={styles.btnText}>{t("เริ่มฟังคำถาม →", "Start the questions →")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  if (stage === "scenario") {
    const q = exam.scenarioQuestions[scenarioStep]!;
    const last = scenarioStep >= CONVERSATION_SCENARIO_Q_COUNT - 1;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.step}>
          {t(
            `คำถามสถานการณ์ ${scenarioStep + 1}/${CONVERSATION_SCENARIO_Q_COUNT}`,
            `Scenario question ${scenarioStep + 1}/${CONVERSATION_SCENARIO_Q_COUNT}`,
          )}
        </Text>
        <ListenCard text={q.question} label={t("ฟังคำถาม แล้วเลือกคำตอบที่เหมาะที่สุด", "Listen, then choose the best reply")} />
        <ChoiceQuestion
          key={`s${scenarioStep}`}
          options={q.options}
          correctIndex={q.correctIndex}
          explanation={q.explanation}
          nextLabel={last ? t("ไปคำถามหลัก →", "On to the main questions →") : t("ข้อถัดไป →", "Next →")}
          onDone={(firstPick, wrongTries) => {
            const next = [...scenarioPicks];
            next[scenarioStep] = firstPick;
            setScenarioPicks(next);
            setTries((tr) => [...tr, wrongTries]);
            if (!last) {
              setScenarioStep((s) => s + 1);
            } else {
              setStage("main");
              setMainStep(0);
            }
          }}
        />
      </ScrollView>
    );
  }

  const mq = exam.mainQuestions[mainStep]!;
  const lastMain = mainStep >= CONVERSATION_MAIN_Q_COUNT - 1;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.step}>
        {t(
          `คำถามหลัก ${mainStep + 1}/${CONVERSATION_MAIN_Q_COUNT}`,
          `Main question ${mainStep + 1}/${CONVERSATION_MAIN_Q_COUNT}`,
        )}
      </Text>
      <ListenCard text={mq.transcript} label={t("ฟังบทสนทนา (แตะดูข้อความได้)", "Listen to the dialogue (tap to show text)")} />
      <Text style={styles.question}>{mq.question}</Text>
      <ChoiceQuestion
        key={`m${mainStep}`}
        options={mq.options}
        correctIndex={mq.correctIndex}
        explanation={mq.explanation}
        nextLabel={lastMain ? t("ดูผลคะแนน →", "See results →") : t("ข้อถัดไป →", "Next →")}
        onDone={(firstPick, wrongTries) => {
          const next = [...mainPicks];
          next[mainStep] = firstPick;
          setMainPicks(next);
          setTries((tr) => [...tr, wrongTries]);
          if (!lastMain) setMainStep((s) => s + 1);
          else void finish(scenarioPicks, next);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#b91c1c", fontWeight: "700", padding: 20, textAlign: "center" },
  meta: { fontWeight: "800", fontSize: 16, color: "#004AAD" },
  note: { marginTop: 8, fontSize: 12, color: "#6B7280", lineHeight: 18 },
  passageBox: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  scenario: { fontSize: 15, lineHeight: 24 },
  vocabBox: { marginTop: 16, padding: 12, backgroundColor: "#FFF7D1", borderRadius: 8 },
  vocabTitle: { fontWeight: "800", marginBottom: 8 },
  vocabLine: { fontSize: 14, marginTop: 4 },
  vocabWord: { fontWeight: "900", color: "#004AAD" },
  btn: {
    marginTop: 20,
    backgroundColor: "#004AAD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  step: { fontWeight: "800", fontSize: 12, color: "#6B7280" },
  question: { fontSize: 16, fontWeight: "700", marginTop: 8, marginBottom: 12 },
  transcriptLabel: { fontSize: 11, fontWeight: "800", color: "#6B7280", marginBottom: 6 },
  transcript: { fontSize: 14, lineHeight: 22, fontStyle: "italic" },
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
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 },
  summaryPill: { fontSize: 13, fontWeight: "800", color: "#047857", backgroundColor: "#ECFDF5", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
  summaryPillSoft: { color: "#92400E", backgroundColor: "#FFFBEB" },
  reportCard: { marginTop: 14, padding: 12, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  reportHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  statusPill: { fontSize: 12, fontWeight: "900", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  statusOk: { color: "#047857", backgroundColor: "#D1FAE5" },
  statusBad: { color: "#B91C1C", backgroundColor: "#FEE2E2" },
  reportPrompt: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 10, lineHeight: 21 },
  hint: { marginTop: 8, color: "#6B7280" },
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
  reportExp: { marginTop: 6, fontSize: 13, color: "#6B7280" },
});
