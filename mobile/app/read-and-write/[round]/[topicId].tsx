import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ExamTimer } from "../../../components/ExamTimer";
import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { MascotCoach } from "../../../components/MascotCoach";
import { MascotLoader, ScreenLoader } from "../../../components/MascotLoader";
import { FadeInItem } from "../../../components/Motion";
import { RuleList, StarterChips, TimeUpNotice, WordCountLine } from "../../../components/ProductionBits";
import { ProductionReportView } from "../../../components/ProductionReportView";
import { useCountdown } from "../../../hooks/useCountdown";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { LOAD_FAILED, errorText, roundLabel, useI18n } from "../../../lib/i18n";
import {
  fetchWritingFollowUp,
  fetchWritingTopic,
  gradingErrorText,
  recordProductionResult,
  startProductionSession,
  submitWritingReport,
} from "../../../lib/production-api";
import {
  ESSAY_MIN_WORDS,
  ESSAY_WRITE_SECONDS,
  PRODUCTION_TASK_TYPE,
  countWords,
  randomAttemptId,
} from "../../../lib/production-constants";
import {
  IW_FOLLOW_SECONDS,
  IW_LAUNCH_EN,
  IW_LAUNCH_TH,
  IW_MAIN_SECONDS,
  IW_MIN_TOTAL_WORDS,
  IW_PREP_SECONDS,
  iwFallbackFollowUp,
} from "../../../lib/interactive-writing";
import type { WritingAttemptReport, WritingFollowUpPrompt, WritingTopic } from "../../../lib/production-types";

/** "iw-*" phases are DET Interactive Writing: read 30 s → write 5 min → follow-up revealed → 3 min. */
type Phase = "intro" | "write" | "iw-prep" | "iw-write" | "iw-loading" | "iw-follow" | "grading" | "report";
type Interactive = { followUp: WritingFollowUpPrompt; answer: string };

const STARTERS = ["I believe that…", "There are two main reasons…", "Firstly,…", "For example,…", "In conclusion,…"];

/** Website's study-session exercise type for read-and-write. */
const EXERCISE_TYPE = "read_then_write";

export default function ReadAndWriteSessionScreen() {
  const { round, topicId } = useLocalSearchParams<{ round: string; topicId: string }>();
  const { t } = useI18n();
  const { back } = useLuxuryRouter();

  const [topic, setTopic] = useState<WritingTopic | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [essay, setEssay] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [timed, setTimed] = useState(true);
  const [timeUp, setTimeUp] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [report, setReport] = useState<WritingAttemptReport | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const attemptIdRef = useRef(randomAttemptId("rw"));

  const [iwFollowUp, setIwFollowUp] = useState<WritingFollowUpPrompt | null>(null);
  const [iwAnswer, setIwAnswer] = useState("");

  const timer = useCountdown(ESSAY_WRITE_SECONDS, phase === "write" && timed && !timeUp && !sent, () =>
    setTimeUp(true),
  );
  // One clock re-armed for each Interactive Writing step; onDone always sees the current phase.
  const iwTimer = useCountdown(
    IW_PREP_SECONDS,
    (phase === "iw-prep" || phase === "iw-write" || phase === "iw-follow") && !sent,
    () => {
      if (phase === "iw-prep") beginIwWrite();
      else if (phase === "iw-write") void requestFollowUp();
      else if (phase === "iw-follow") submitInteractive(true);
    },
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await fetchWritingTopic(topicId);
      setTopic(next);
      sessionIdRef.current = await startProductionSession(EXERCISE_TYPE, next.id);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : LOAD_FAILED);
    }
  }, [topicId]);

  useEffect(() => {
    void load();
  }, [load]);

  const words = countWords(essay);
  const iwTotalWords = words + countWords(iwAnswer);
  const locked = timed && (timeUp || sent);
  const prompts = topic?.followUps ?? [];

  const start = () => {
    attemptIdRef.current = randomAttemptId("rw");
    startedAtRef.current = Date.now();
    setEssay("");
    setFollowUps(prompts.map(() => ""));
    setTimed(true);
    setTimeUp(false);
    setSent(false);
    setSubmitError(null);
    setReport(null);
    timer.reset(ESSAY_WRITE_SECONDS);
    setPhase("write");
  };

  const startInteractive = () => {
    attemptIdRef.current = randomAttemptId("rw");
    startedAtRef.current = Date.now();
    setEssay("");
    setIwAnswer("");
    setIwFollowUp(null);
    setSent(false);
    setSubmitError(null);
    setReport(null);
    iwTimer.reset(IW_PREP_SECONDS);
    setPhase("iw-prep");
  };

  function beginIwWrite() {
    iwTimer.reset(IW_MAIN_SECONDS);
    setPhase("iw-write");
  }

  /** The follow-up only appears once the main response is in, as on the real test. */
  async function requestFollowUp() {
    if (!topic) return;
    setPhase("iw-loading");
    let next: WritingFollowUpPrompt;
    try {
      next = await fetchWritingFollowUp(topic, essay);
    } catch {
      next = iwFallbackFollowUp(topic);
    }
    setIwFollowUp(next);
    iwTimer.reset(IW_FOLLOW_SECONDS);
    setPhase("iw-follow");
  }

  function submitInteractive(fromTimeUp = false) {
    if (!iwFollowUp) return;
    if (iwTotalWords < IW_MIN_TOTAL_WORDS) {
      setSubmitError(
        fromTimeUp
          ? t(
              `หมดเวลาแล้ว แต่ต้องมีอย่างน้อย ${IW_MIN_TOTAL_WORDS} คำรวมทั้งสองส่วนจึงจะตรวจได้ — เขียนต่อให้ครบแล้วกดส่ง`,
              `Time's up, but grading needs at least ${IW_MIN_TOTAL_WORDS} words across both parts — add a little more, then submit.`,
            )
          : t(
              `ต้องมีอย่างน้อย ${IW_MIN_TOTAL_WORDS} คำรวมทั้งสองส่วน (ตอนนี้ ${iwTotalWords} คำ)`,
              `Grading needs at least ${IW_MIN_TOTAL_WORDS} words across both parts (now ${iwTotalWords}).`,
            ),
      );
      return;
    }
    void submit({ followUp: iwFollowUp, answer: iwAnswer });
  }

  const submit = async (interactive?: Interactive) => {
    if (!topic) return;
    if (!interactive && words < ESSAY_MIN_WORDS) {
      setSubmitError(t(`เขียนอย่างน้อย ${ESSAY_MIN_WORDS} คำก่อนส่งตรวจ`, `Write at least ${ESSAY_MIN_WORDS} words before submitting.`));
      return;
    }
    setSent(true);
    setSubmitError(null);
    setPending(false);
    setPhase("grading");
    const backTo: Phase = interactive ? "iw-follow" : "write";
    try {
      const text = essay.trim();
      const answers = interactive
        ? [interactive.answer.trim()]
        : prompts.map((_, i) => (followUps[i] ?? "").trim());
      const outcome = await submitWritingReport(
        {
          attemptId: attemptIdRef.current,
          // Interactive Writing grades the revealed follow-up as the topic's one follow-up.
          topic: interactive ? { ...topic, followUps: [interactive.followUp] } : topic,
          essay: text,
          followUpAnswers: answers,
          ...(interactive ? { format: "interactive" as const, prepMinutes: IW_PREP_SECONDS / 60 } : {}),
        },
        () => setPending(true),
      );
      if (outcome.kind === "still-working") {
        setSent(false);
        setPhase(backTo);
        setSubmitError(
          t(
            "ยังตรวจไม่เสร็จ แต่เรียงความของคุณถูกเก็บไว้แล้ว — ลองกดส่งอีกครั้งในอีกสักครู่ จะได้ผลเดิมโดยไม่เสียเครดิตซ้ำ",
            "Still grading, but your essay is saved — send again in a little while to get the same result without using another credit.",
          ),
        );
        return;
      }
      const r = outcome.report;
      setReport(r);
      setPhase("report");
      void recordProductionResult({
        sessionId: sessionIdRef.current,
        exerciseType: EXERCISE_TYPE,
        taskType: PRODUCTION_TASK_TYPE.essay,
        setId: topic.id,
        attemptId: r.attemptId,
        score160: r.score160,
        startedAt: startedAtRef.current,
        idField: "topicId",
        submissionPayload: {
          kind: EXERCISE_TYPE,
          topicId: topic.id,
          titleEn: topic.titleEn,
          titleTh: topic.titleTh,
          essay: text,
          followUpAnswers: answers,
          ...(interactive ? { format: "interactive", followUpPromptEn: interactive.followUp.promptEn } : {}),
        },
        reportPayload: r,
      });
      sessionIdRef.current = null;
      void startProductionSession(EXERCISE_TYPE, topic.id).then((id) => {
        sessionIdRef.current = id;
      });
    } catch (e) {
      setSent(false);
      setPhase(backTo);
      setSubmitError(gradingErrorText(t, e));
    }
  };

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, loadError)}</Text>
        <LuxuryPressable style={[styles.btn, styles.btnSmall]} onPress={() => void load()}>
          <Text style={styles.btnText}>{t("ลองใหม่", "Retry")}</Text>
        </LuxuryPressable>
      </View>
    );
  }
  if (!topic) return <ScreenLoader />;

  if (phase === "report" && report) {
    return <ProductionReportView report={report} mode="essay" onRetry={() => setPhase("intro")} onDone={back} />;
  }

  if (phase === "grading") {
    return (
      <View style={styles.center}>
        <MascotLoader
          grading
          label={
            pending
              ? t("กำลังตรวจอยู่ โปรดรอสักครู่ — เรียงความถูกบันทึกแล้ว", "Still grading — your essay is saved")
              : t("กำลังตรวจเรียงความของคุณ", "Grading your essay")
          }
        />
      </View>
    );
  }

  const promptCard = (
    <View style={styles.promptCard}>
      <Text style={styles.promptLabel}>{t("โจทย์", "Prompt")}</Text>
      <Text style={styles.prompt}>{topic.promptEn}</Text>
      {topic.promptTh ? <Text style={styles.promptTh}>{topic.promptTh}</Text> : null}
    </View>
  );

  if (phase === "intro") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <FadeInItem index={0}>
          <Text style={styles.meta}>{roundLabel(t, round)}</Text>
          <Text style={styles.title}>{topic.titleEn}</Text>
          {topic.titleTh ? <Text style={styles.titleTh}>{topic.titleTh}</Text> : null}
          {promptCard}
        </FadeInItem>
        <FadeInItem index={1}>
          <Text style={styles.modeHead}>{t("เลือกรูปแบบการฝึก", "Choose a format")}</Text>
          <LuxuryPressable style={[styles.modeCard, styles.modeCardNew]} sound="submit" scaleTo={0.98} onPress={startInteractive}>
            <View style={styles.modeTop}>
              <Text style={styles.modeTitle}>Interactive Writing</Text>
              <Text style={styles.newBadge}>{t("รูปแบบใหม่", "New format")}</Text>
            </View>
            <Text style={styles.modeSub}>
              {t(
                `รูปแบบที่ใช้ในข้อสอบ DET จริงตั้งแต่ ${IW_LAUNCH_TH} แทน Read, Then Write แบบเดิม`,
                `Used on the real DET since ${IW_LAUNCH_EN}, replacing Read, Then Write`,
              )}
            </Text>
            <Text style={styles.modeLine}>{t("⏱ อ่านโจทย์ 30 วินาที → เขียน 5 นาที", "⏱ Read 30 s → write 5 min")}</Text>
            <Text style={styles.modeLine}>
              {t("➕ ส่งแล้วได้ “คำถามต่อ” 1 ข้อ เขียนต่ออีก 3 นาที", "➕ Then one follow-up question, 3 more minutes")}
            </Text>
            <Text style={styles.modeLine}>{t("📊 ตรวจรวมทั้งสองส่วนเหมือนสอบจริง", "📊 Both parts scored together, like the real test")}</Text>
          </LuxuryPressable>
          <LuxuryPressable style={[styles.modeCard]} sound="tap" scaleTo={0.98} onPress={start}>
            <Text style={styles.modeTitle}>{t("เขียนเรียงความปกติ", "Classic essay")}</Text>
            <Text style={styles.modeSub}>{t("แบบเดิม เหมาะกับฝึกโครงเรียงความ", "The original format — good for practising structure")}</Text>
            <Text style={styles.modeLine}>
              {t(`✍️ เขียน 5 นาที อย่างน้อย ${ESSAY_MIN_WORDS} คำ`, `✍️ 5 minutes, at least ${ESSAY_MIN_WORDS} words`)}
            </Text>
          </LuxuryPressable>
        </FadeInItem>
        <Text style={styles.classicHead}>{t("เคล็ดลับเรียงความ", "Essay tips")}</Text>
        <FadeInItem index={2}>
          <RuleList
            rules={[
              { icon: "⏱", text: t("มีเวลา 5 นาที เวลาเริ่มนับเมื่อกดเริ่ม", "You have 5 minutes — the clock starts when you tap Start") },
              { icon: "✍️", text: t(`อย่างน้อย ${ESSAY_MIN_WORDS} คำ (แนะนำ 100 คำขึ้นไป)`, `At least ${ESSAY_MIN_WORDS} words (100+ is better)`) },
              { icon: "🧱", text: t("โครง: เลือกข้าง → เหตุผล + ตัวอย่าง → สรุป", "Structure: take a side → reasons + examples → conclusion") },
              ...(prompts.length > 0
                ? [{ icon: "➕", text: t(`มีคำถามต่ออีก ${prompts.length} ข้อ ตอบสั้นๆ ในเวลาเดียวกัน`, `${prompts.length} follow-up question(s) to answer briefly in the same time`) }]
                : []),
            ]}
          />
          <StarterChips title={t("🧱 วลีเริ่มประโยค", "🧱 Useful starters")} starters={STARTERS} />
        </FadeInItem>
        <FadeInItem index={2} style={styles.coach}>
          <MascotCoach
            text={t("ใช้ 30 วินาทีแรกวางแผน 2 เหตุผลในหัว แล้วค่อยเขียน", "Spend the first 30 seconds picking two reasons, then write")}
            sub={t("ยกตัวอย่างจากชีวิตตัวเองได้คะแนนตอบตรงโจทย์เพิ่ม", "A personal example boosts your task score")}
          />
        </FadeInItem>
      </ScrollView>
    );
  }

  if (phase === "iw-loading") {
    return (
      <View style={styles.center}>
        <MascotLoader label={t("ส่งส่วนที่ 1 แล้ว — กำลังเตรียมคำถามต่อ", "Part 1 sent — preparing your follow-up")} />
      </View>
    );
  }

  if (phase === "iw-prep" || phase === "iw-write" || phase === "iw-follow") {
    const onFollow = phase === "iw-follow";
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.steps}>
          <Text style={[styles.step, onFollow ? styles.stepDone : styles.stepOn]}>
            {onFollow ? "✓ " : "1 · "}
            {t("เขียน 5 นาที", "Write 5 min")}
          </Text>
          <Text style={[styles.step, onFollow ? styles.stepOn : styles.stepOff]}>{t("2 · คำถามต่อ 3 นาที", "2 · Follow-up 3 min")}</Text>
        </View>
        <ExamTimer
          left={iwTimer.left}
          total={phase === "iw-prep" ? IW_PREP_SECONDS : onFollow ? IW_FOLLOW_SECONDS : IW_MAIN_SECONDS}
          label={phase === "iw-prep" ? t("เวลาอ่านโจทย์", "Time to read") : t("เวลาเขียน", "Time to write")}
          urgentAt={phase === "iw-prep" ? 5 : 30}
        />
        {promptCard}

        {phase === "iw-prep" ? (
          <>
            <Text style={styles.prepNote}>
              {t("อ่านโจทย์ให้เข้าใจ คิด 2 เหตุผลไว้ในหัว เวลาเขียนจะเริ่มเองเมื่อหมด 30 วินาที", "Read the prompt and pick two reasons. Writing starts automatically after 30 seconds.")}
            </Text>
            <LuxuryPressable style={[styles.btn]} sound="submit" onPress={beginIwWrite}>
              <Text style={styles.btnText}>{t("เริ่มเขียนเลย", "Start writing now")}</Text>
            </LuxuryPressable>
          </>
        ) : null}

        {phase === "iw-write" ? (
          <>
            <TextInput
              style={[styles.input]}
              multiline
              autoFocus
              value={essay}
              onChangeText={setEssay}
              placeholder={t("เขียนคำตอบภาษาอังกฤษที่นี่…", "Write your response here…")}
              autoCapitalize="sentences"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
            />
            <Text style={styles.wordLine}>{t(`${words} คำ`, `${words} words`)}</Text>
            <LuxuryPressable style={[styles.btn]} sound="submit" onPress={() => void requestFollowUp()}>
              <Text style={styles.btnText}>{t("ส่งส่วนที่ 1 → ไปคำถามต่อ", "Submit part 1 → follow-up")}</Text>
            </LuxuryPressable>
          </>
        ) : null}

        {onFollow && iwFollowUp ? (
          <>
            <View style={styles.mainDone}>
              <Text style={styles.mainDoneLabel}>{t(`คำตอบส่วนที่ 1 · ${words} คำ`, `Your part 1 · ${words} words`)}</Text>
              <Text style={styles.mainDoneText} numberOfLines={6}>
                {essay.trim() || t("(ไม่ได้เขียน)", "(empty)")}
              </Text>
            </View>
            <View style={[styles.promptCard, styles.followCard]}>
              <Text style={styles.promptLabel}>{t("คำถามต่อ", "Follow-up")}</Text>
              <Text style={styles.prompt}>{iwFollowUp.promptEn}</Text>
              {iwFollowUp.promptTh ? <Text style={styles.promptTh}>{iwFollowUp.promptTh}</Text> : null}
            </View>
            <TextInput
              style={[styles.input, styles.inputFollow]}
              multiline
              autoFocus
              editable={!sent}
              value={iwAnswer}
              onChangeText={setIwAnswer}
              placeholder={t("เขียนตอบคำถามต่อที่นี่…", "Write your follow-up response here…")}
              autoCapitalize="sentences"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
            />
            <Text style={styles.wordLine}>
              {t(`${countWords(iwAnswer)} คำ · รวม ${iwTotalWords} คำ`, `${countWords(iwAnswer)} words · ${iwTotalWords} in total`)}
            </Text>
            {submitError ? <Text style={styles.formError}>{submitError}</Text> : null}
            <LuxuryPressable style={[styles.btn]} sound="submit" disabled={sent} onPress={() => submitInteractive()}>
              <Text style={styles.btnText}>{t("ส่งตรวจทั้งสองส่วน", "Submit both parts")}</Text>
            </LuxuryPressable>
          </>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {timed ? (
        <ExamTimer left={timer.left} total={ESSAY_WRITE_SECONDS} label={t("เวลาเขียน", "Time to write")} urgentAt={30} />
      ) : (
        <Text style={styles.untimed}>{t("โหมดฝึก: ไม่จับเวลา", "Practice mode: untimed")}</Text>
      )}
      {promptCard}

      <TextInput
        style={[styles.input, locked ? styles.inputLocked : null]}
        multiline
        autoFocus
        editable={!locked}
        value={essay}
        onChangeText={setEssay}
        placeholder={t("เขียนเรียงความภาษาอังกฤษที่นี่…", "Write your essay here…")}
        autoCapitalize="sentences"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
      />
      <WordCountLine count={words} min={ESSAY_MIN_WORDS} />

      {prompts.map((fu, i) => (
        <View key={`fu-${i}`} style={styles.followUp}>
          <Text style={styles.followUpLabel}>{t(`คำถามต่อ ${i + 1}`, `Follow-up ${i + 1}`)}</Text>
          <Text style={styles.followUpPrompt}>{fu.promptEn}</Text>
          {fu.promptTh ? <Text style={styles.followUpTh}>{fu.promptTh}</Text> : null}
          <TextInput
            style={[styles.inputSmall, locked ? styles.inputLocked : null]}
            multiline
            editable={!locked}
            value={followUps[i] ?? ""}
            onChangeText={(v) =>
              setFollowUps((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              })
            }
            placeholder={t("คำตอบสั้นๆ…", "Short answer…")}
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
          />
        </View>
      ))}

      {timed && timeUp ? <TimeUpNotice count={words} min={ESSAY_MIN_WORDS} onKeepWriting={() => setTimed(false)} /> : null}
      {submitError ? <Text style={styles.formError}>{submitError}</Text> : null}

      <LuxuryPressable style={[styles.btn]} sound="submit" disabled={words < ESSAY_MIN_WORDS} onPress={() => void submit()}>
        <Text style={styles.btnText}>{t("ส่งตรวจ", "Submit for feedback")}</Text>
      </LuxuryPressable>
      <LuxuryPressable style={[styles.btnGhost]} onPress={start}>
        <Text style={styles.btnGhostText}>{t("เริ่มใหม่", "Start over")}</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F4F6FB" },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  meta: { fontSize: 12, fontWeight: "800", color: "#004AAD" },
  title: { marginTop: 4, fontSize: 21, fontWeight: "900", color: "#111" },
  titleTh: { marginTop: 2, fontSize: 14, color: "#6B7280" },
  promptCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
  },
  promptLabel: { fontSize: 11, fontWeight: "900", color: "#004AAD", letterSpacing: 0.5 },
  prompt: { marginTop: 4, fontSize: 15, fontWeight: "700", color: "#111", lineHeight: 22 },
  promptTh: { marginTop: 6, fontSize: 13, color: "#6B7280", lineHeight: 20 },
  coach: { marginTop: 16 },
  untimed: { fontSize: 13, fontWeight: "800", color: "#6B7280", textAlign: "center" },
  input: {
    marginTop: 12,
    minHeight: 220,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    lineHeight: 24,
  },
  inputSmall: {
    marginTop: 8,
    minHeight: 80,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  inputLocked: { backgroundColor: "#F3F4F6", color: "#4B5563" },
  followUp: {
    marginTop: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  followUpLabel: { fontSize: 12, fontWeight: "900", color: "#004AAD" },
  followUpPrompt: { marginTop: 4, fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 20 },
  followUpTh: { marginTop: 2, fontSize: 12, color: "#6B7280", lineHeight: 18 },
  formError: { marginTop: 10, color: "#b91c1c", fontWeight: "700", lineHeight: 20 },
  btn: {
    marginTop: 16,
    backgroundColor: "#004AAD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  btnSmall: { paddingHorizontal: 24, paddingVertical: 12 },
  classicHead: { marginTop: 22, fontSize: 14, fontWeight: "900", color: "#6B7280" },
  modeHead: { marginTop: 20, fontSize: 16, fontWeight: "900", color: "#111" },
  modeCard: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
  },
  modeCardNew: { backgroundColor: "#FFF8D6", borderWidth: 3 },
  modeTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  modeTitle: { fontSize: 17, fontWeight: "900", color: "#004AAD" },
  newBadge: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFCC00",
    backgroundColor: "#004AAD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  modeSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#3f3f46", lineHeight: 18 },
  modeLine: { marginTop: 4, fontSize: 13, color: "#374151", lineHeight: 19 },
  steps: { flexDirection: "row", gap: 8, marginBottom: 10 },
  step: { fontSize: 11, fontWeight: "900", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  stepOn: { backgroundColor: "#004AAD", color: "#FFCC00" },
  stepOff: { backgroundColor: "#E5E7EB", color: "#6B7280" },
  stepDone: { backgroundColor: "#DCF5E6", color: "#166534" },
  prepNote: { marginTop: 12, fontSize: 13, color: "#374151", lineHeight: 20 },
  wordLine: { marginTop: 6, fontSize: 12, fontWeight: "800", color: "#6B7280" },
  mainDone: {
    marginTop: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  mainDoneLabel: { fontSize: 11, fontWeight: "900", color: "#6B7280" },
  mainDoneText: { marginTop: 4, fontSize: 13, color: "#4B5563", lineHeight: 19 },
  followCard: { borderColor: "#004AAD" },
  inputFollow: { minHeight: 170 },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  btnGhost: {
    marginTop: 10,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#111",
    alignItems: "center",
  },
  btnGhostText: { color: "#111", fontWeight: "800", fontSize: 15 },
});
