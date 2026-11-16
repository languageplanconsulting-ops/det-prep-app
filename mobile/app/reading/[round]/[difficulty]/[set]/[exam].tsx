/**
 * Reading exam — the DET "Interactive Reading" task, native.
 *
 * A port of the website's InteractiveReadingRunner as the web reading exam runs it
 * (src/components/reading/ReadingSessionGate.tsx): one passage, six steps in DET's order, ONE
 * countdown for the whole set, the passage growing as you go. The passage comes from
 * /api/practice/content/interactive-reading, which picks it with the same function as the web exam
 * page, so the same slot opens the same text on both and the synced score means the same thing.
 *
 * Scoring (same as web): each step scores 0..1 (word-fill is right blanks / all blanks); the exam
 * score is mean(step scores over all six) × the difficulty's max. When the clock hits zero, what was
 * answered is submitted and every step not answered counts as 0.
 */
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useScoreReveal } from "../../../../../hooks/useScoreReveal";
import { useLuxuryRouter } from "../../../../../hooks/useLuxuryRouter";
import { LuxuryPressable } from "../../../../../components/LuxuryPressable";
import { InteractiveReadingTask } from "../../../../../components/InteractiveReadingTask";
import { finishStudySession, startStudySession, postPracticeAttempt } from "../../../../../lib/api";
import { fetchInteractiveReadingSet } from "../../../../../lib/interactive-reading-api";
import {
  IR_STEP_COUNT,
  IR_STEP_LABELS_EN,
  IR_STEP_LABELS_TH,
  irRemainingLabel,
  irSeconds,
  resolvedParagraphs,
  type IrSet,
  type IrStepResult,
} from "../../../../../lib/interactive-reading";
import { buildContentKey, packSubIndexed } from "../../../../../lib/practice-progress";
import { READING_DIFFICULTY_MAX } from "../../../../../lib/reading-constants";
import type { ReadingDifficulty } from "../../../../../lib/types";
import { LOAD_FAILED, errorText, scoreLine, useI18n } from "../../../../../lib/i18n";
import { ScreenLoader } from "../../../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../../../components/Motion";
import { sfxNavigate } from "../../../../../lib/exam-sfx-mobile";

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function ReadingSessionScreen() {
  const { round, difficulty, set, exam } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
    exam: string;
  }>();
  const { t } = useI18n();
  const { back } = useLuxuryRouter();
  const roundNum = Number(round);
  const diff = difficulty as ReadingDifficulty;
  const setNumber = Number(set);
  const examNumber = Number(exam);
  const setId = `read-r${roundNum}-${diff}-s${setNumber}-e${examNumber}`;
  const maxScore = READING_DIFFICULTY_MAX[diff];

  const [irSet, setIrSet] = useState<IrSet | null>(null);
  const [gloss, setGloss] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"quiz" | "report">("quiz");
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<IrStepResult[]>([]);
  const [left, setLeft] = useState(480);
  const [timedOut, setTimedOut] = useState(false);
  const [score, setScore] = useState(0);
  const [showPassage, setShowPassage] = useState(false);
  const resultsRef = useRef<IrStepResult[]>([]);
  const finishedRef = useRef(false);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { set: data, gloss: g } = await fetchInteractiveReadingSet({
        round: roundNum,
        difficulty: diff,
        set: setNumber,
        exam: examNumber,
      });
      setIrSet(data);
      setGloss(g);
      setLeft(irSeconds(data));
      startedAt.current = Date.now();
      try {
        sessionIdRef.current = await startStudySession({
          exerciseType: "reading",
          skill: "comprehension",
          difficulty: diff,
          setId,
        });
      } catch {
        /* the study log is best-effort; the exam still runs */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [roundNum, diff, setNumber, examNumber, setId]);

  useEffect(() => {
    void load();
  }, [load]);

  const finish = useCallback(
    (answered: IrStepResult[], outOfTime: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      // out of all SIX steps: on a time-up the unanswered ones are zeros, not ignored
      const earned = answered.reduce((a, r) => a + r.score, 0);
      const attained = Math.round((earned / IR_STEP_COUNT) * maxScore);
      const correctCount = Math.round(earned);
      setResults(answered);
      setTimedOut(outOfTime);
      setScore(attained);
      setPhase("report");

      // Same shape the website writes (src/lib/reading-storage.ts saveReadingAttempt), so this
      // score shows on web too.
      void postPracticeAttempt({
        taskType: "reading_comprehension",
        scorePct: maxScore > 0 ? (attained / maxScore) * 100 : 0,
        detail: {
          correct: correctCount,
          total: IR_STEP_COUNT,
          contentKey: buildContentKey("reading", diff, roundNum, packSubIndexed(setNumber, examNumber)),
        },
      });
      const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
      void finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "reading",
        setId,
        score: attained,
        completed: !outOfTime && answered.length === IR_STEP_COUNT,
        duration_seconds: duration,
        submission_payload: { format: "interactive-reading", irSetId: irSet?.id, steps: answered, timedOut: outOfTime },
        report_payload: { score: attained, maxScore, correctCount, total: IR_STEP_COUNT },
      }).catch(() => {
        /* best-effort */
      });
    },
    [maxScore, diff, roundNum, setNumber, examNumber, setId, irSet?.id],
  );

  // one clock for the whole set
  const ticking = phase === "quiz" && !!irSet && !loading;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [ticking]);
  useEffect(() => {
    if (ticking && left <= 0) finish(resultsRef.current, true);
  }, [ticking, left, finish]);

  const onStepDone = (r: IrStepResult) => {
    if (finishedRef.current) return;
    const all = [...resultsRef.current, r];
    resultsRef.current = all;
    setResults(all);
    if (all.length >= IR_STEP_COUNT) {
      finish(all, false);
      return;
    }
    sfxNavigate();
    setStep(all.length);
  };

  if (loading) return <ScreenLoader />;

  if (error || !irSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
        <LuxuryPressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>{t("ลองใหม่", "Retry")}</Text>
        </LuxuryPressable>
      </View>
    );
  }

  if (phase === "report") {
    const ratio = maxScore > 0 ? score / maxScore : 0;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ResultMascot
          ratio={ratio}
          message={
            ratio >= 0.75
              ? t("เก่งมาก! ทำได้ดีเยี่ยมเลย 🎉", "Great job — excellent work! 🎉")
              : t("ใกล้แล้ว! ดูจุดที่พลาดด้านล่าง แล้วลองอีกครั้งนะ 💪", "Almost there! Review the misses below and try again 💪")
          }
        />
        <AnimatedScore value={score} max={maxScore} format={(n, m) => scoreLine(t, n, m)} style={styles.score} />
        <Text style={styles.reportSub}>
          {t(
            "รูปแบบเดียวกับ Interactive Reading ในข้อสอบจริงครบทั้ง 6 ขั้นตอน",
            "The same six steps as the real DET Interactive Reading task",
          )}
        </Text>
        {timedOut ? (
          <Text style={styles.timeUp}>
            {t("⏰ หมดเวลา — ข้อที่ยังไม่ได้ตอบนับเป็น 0", "⏰ Time's up — unanswered steps score 0")}
          </Text>
        ) : null}

        {Array.from({ length: IR_STEP_COUNT }, (_, idx) => {
          const r = results.find((x) => x.step === idx);
          const s = r?.score ?? 0;
          const tone = !r ? styles.muted : s === 1 ? styles.ok : s > 0 ? styles.partial : styles.bad;
          const verdict = !r
            ? t("ไม่ได้ตอบ", "Not answered")
            : s === 1
              ? t("ถูก", "Correct")
              : s > 0
                ? `${Math.round(s * 100)}%`
                : t("ยังไม่ถูก", "Wrong");
          return (
            <FadeInItem key={idx} index={idx + 1} style={styles.reportRow}>
              <View style={styles.reportHead}>
                <Text style={styles.reportLabel}>
                  {idx + 1}. {t(IR_STEP_LABELS_TH[idx]!, IR_STEP_LABELS_EN[idx]!)}
                </Text>
                <Text style={[styles.reportVerdict, tone]}>{verdict}</Text>
              </View>
              {r && idx === 0 ? (
                <Text style={styles.reportA}>
                  {r.correct.map((c, i) => (
                    <Text key={i} style={r.chosen[i] === c ? styles.ok : styles.bad}>
                      {`${i ? "  ·  " : ""}${c}${r.chosen[i] === c ? " ✓" : ` (${r.chosen[i] || "—"})`}`}
                    </Text>
                  ))}
                </Text>
              ) : r ? (
                <>
                  {s < 1 ? (
                    <Text style={styles.reportA}>
                      {t("คุณตอบ", "You")}: {r.chosen[0] || "—"}
                    </Text>
                  ) : null}
                  <Text style={styles.reportC}>
                    {t("เฉลย", "Answer")}: {r.correct[0]}
                  </Text>
                </>
              ) : null}
            </FadeInItem>
          );
        })}

        <LuxuryPressable sound="none" style={styles.ghostBtn} onPress={() => setShowPassage((v) => !v)}>
          <Text style={styles.ghostText}>
            {showPassage ? t("ซ่อนบทอ่าน ▴", "Hide passage ▴") : t("อ่านบทอ่านฉบับเต็มอีกครั้ง ▾", "Read the full passage ▾")}
          </Text>
        </LuxuryPressable>
        {showPassage ? (
          <View style={styles.reviewBox}>
            {resolvedParagraphs(irSet).map((p, i) => (
              <Text key={i} style={styles.reviewPara}>
                {p}
              </Text>
            ))}
          </View>
        ) : null}

        <LuxuryPressable style={styles.btn} onPress={back}>
          <Text style={styles.btnText}>{t("เสร็จแล้ว · กลับไปเลือกข้อสอบ", "Done · back to exams")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  const urgent = left <= 60;
  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.clockRow}>
          <Text style={styles.clockIcon}>🕐</Text>
          <Text style={[styles.clock, urgent ? styles.clockUrgent : null]}>{mmss(left)}</Text>
          <Text style={styles.clockLabel}>{irRemainingLabel(step, t)}</Text>
        </View>
        <View style={styles.dots}>
          {Array.from({ length: IR_STEP_COUNT }, (_, i) => (
            <View key={i} style={[styles.dot, i < step ? styles.dotDone : null, i === step ? styles.dotNow : null]}>
              <Text style={[styles.dotText, i <= step ? styles.dotTextOn : null]}>{i < step ? "✓" : i + 1}</Text>
            </View>
          ))}
        </View>
      </View>
      <InteractiveReadingTask
        key={step}
        set={irSet}
        step={step}
        gloss={gloss}
        isLast={step + 1 >= IR_STEP_COUNT}
        onDone={onStepDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  retry: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#004AAD", borderRadius: 10 },
  retryText: { color: "#FFCC00", fontWeight: "800" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  clockRow: { flexDirection: "row", alignItems: "baseline", gap: 6, flexShrink: 1 },
  clockIcon: { fontSize: 15 },
  clock: { fontSize: 20, fontWeight: "900", color: "#0f172a", fontVariant: ["tabular-nums"] },
  clockUrgent: { color: "#DC2626" },
  clockLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", flexShrink: 1 },
  dots: { flexDirection: "row", gap: 4 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dotDone: { backgroundColor: "#059669", borderColor: "#059669" },
  dotNow: { backgroundColor: "#004AAD", borderColor: "#004AAD" },
  dotText: { fontSize: 11, fontWeight: "900", color: "#9CA3AF" },
  dotTextOn: { color: "#fff" },
  score: { fontSize: 24, fontWeight: "900" },
  reportSub: { marginTop: 4, fontSize: 13, color: "#64748b" },
  timeUp: { marginTop: 8, fontSize: 13, fontWeight: "800", color: "#e11d48" },
  reportRow: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reportHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  reportLabel: { flex: 1, fontWeight: "800", color: "#1f2937" },
  reportVerdict: { fontWeight: "900" },
  ok: { color: "#15803d" },
  partial: { color: "#B45309" },
  bad: { color: "#b91c1c" },
  muted: { color: "#94a3b8" },
  reportA: { marginTop: 6, fontSize: 13, lineHeight: 20, color: "#374151" },
  reportC: { marginTop: 2, fontSize: 13, lineHeight: 20, color: "#15803d", fontWeight: "700" },
  ghostBtn: { marginTop: 16, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#EEF4FF" },
  ghostText: { fontSize: 13, fontWeight: "800", color: "#004AAD" },
  reviewBox: { marginTop: 10, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: "#111", backgroundColor: "#f9fafb" },
  reviewPara: { fontSize: 15, lineHeight: 24, color: "#1f2937", marginBottom: 10 },
  btn: {
    marginTop: 18,
    backgroundColor: "#004AAD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
});
