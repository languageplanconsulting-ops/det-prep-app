import type { Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";

import { LuxuryPressable } from "../LuxuryPressable";
import { MascotLoader, ScreenLoader } from "../MascotLoader";
import { FadeInItem } from "../Motion";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import { useStepTimer } from "../../hooks/useStepTimer";
import { useI18n } from "../../lib/i18n";
import {
  ApiError,
  cancelMockSession,
  fetchMiniSession,
  fetchMockSession,
  submitMiniStep,
  submitMockStep,
} from "../../lib/mock-api";
import {
  MINI_STEP_COUNT,
  MOCK_STEP_COUNT,
  SLOW_GRADED_TASKS,
  fmtClock,
  taskMeta,
  type MockResponseEntry,
  type MockStepItem,
} from "../../lib/mock-test";
import { sfxNavigate } from "../../lib/exam-sfx-mobile";
import { GATED_TASKS, TaskRouter } from "./TaskRouter";
import { C, Note, PhaseClock, PrimaryButton } from "./TaskUi";

export type RunnerKind = "mock" | "mini";

type RunnerSession = {
  id: string;
  status: string;
  current_step: number;
  responses: MockResponseEntry[];
  targets: Record<string, unknown>;
  title: string;
  items: MockStepItem[];
};

async function loadSession(kind: RunnerKind, id: string): Promise<RunnerSession> {
  if (kind === "mock") {
    const s = await fetchMockSession(id);
    return {
      id: s.id,
      status: s.status,
      current_step: Number(s.current_step ?? 1),
      responses: Array.isArray(s.responses) ? s.responses : [],
      targets: (s.targets ?? {}) as Record<string, unknown>,
      title: s.mock_fixed_sets?.user_title || s.mock_fixed_sets?.name || "Mock",
      items: s.mock_fixed_set_items ?? [],
    };
  }
  const s = await fetchMiniSession(id);
  return {
    id: s.id,
    status: s.status,
    current_step: Number(s.current_step ?? 1),
    responses: Array.isArray(s.responses) ? s.responses : [],
    targets: (s.targets ?? {}) as Record<string, unknown>,
    title: s.mini_diagnosis_sets?.user_title || s.mini_diagnosis_sets?.name || "Mini diagnosis",
    items: s.mini_diagnosis_set_items ?? [],
  };
}

const MINI_INTRO: Record<string, { th: string; en: string }> = {
  dictation: {
    th: "ฟังประโยคแล้วพิมพ์ตามที่ได้ยิน ฟังได้ 3 ครั้ง เวลาจะเริ่มนับหลังฟังจบครั้งแรก",
    en: "Listen and type the sentence. You can play it 3 times; the clock starts after the first listen.",
  },
  real_english_word: {
    th: "แตะเลือกเฉพาะคำที่เป็นภาษาอังกฤษจริง เลือกคำลวงจะถูกหักคะแนน",
    en: "Select only the real English words — picking a fake word costs points.",
  },
  vocabulary_reading: {
    th: "เติมคำศัพท์ในบทความ เลือกย่อหน้าที่หายไป แล้วตอบคำถามการอ่าน",
    en: "Fill the vocabulary gaps, choose the missing paragraph, then answer the reading questions.",
  },
  fill_in_blanks: {
    th: "ตัวอักษรแรกของแต่ละคำให้มาแล้ว พิมพ์ส่วนที่เหลือให้ครบคำ",
    en: "The first letters are given — type the rest of each word.",
  },
  interactive_listening: {
    th: "ฟังสถานการณ์แล้วตอบคำถามให้ครบ แต่ละบทฟังได้จำนวนครั้งจำกัด",
    en: "Listen to each situation and answer every question. Plays are limited.",
  },
  write_about_photo: {
    th: "เขียนบรรยายภาพเป็นภาษาอังกฤษให้ได้มากและชัดที่สุดในเวลาที่มี",
    en: "Describe the photo in English — as clearly and fully as you can in the time.",
  },
  read_then_speak: {
    th: "อ่านโจทย์ แล้วกดอัดเสียงพูดตอบอย่างน้อย 15 คำ แก้ข้อความที่ระบบได้ยินผิดได้",
    en: "Read the prompt, then record an answer of at least 15 words. You can fix misheard words.",
  },
};

/**
 * The timed exam runner shared by the 20-step mock and the 9-step mini
 * diagnosis: loads the session, shows one step at a time with its clock,
 * submits each answer to the website's submit-step and reconciles with the
 * server on any conflict, so a run can always be resumed (web or app).
 */
export function ExamRunner({ kind, sessionId }: { kind: RunnerKind; sessionId: string }) {
  const { t } = useI18n();
  const { replace } = useLuxuryRouter();
  const timer = useStepTimer();
  const stepCount = kind === "mock" ? MOCK_STEP_COUNT : MINI_STEP_COUNT;

  const [session, setSession] = useState<RunnerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resting, setResting] = useState<{ nextLabel: string } | null>(null);
  const [introSeen, setIntroSeen] = useState<Record<number, boolean>>({});
  const [confirmQuit, setConfirmQuit] = useState(false);
  const submittingRef = useRef(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const goReport = useCallback(() => {
    replace((kind === "mock" ? `/mock-test/report/${sessionId}` : `/mock-test/mini-report/${sessionId}`) as Href);
  }, [kind, replace, sessionId]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const s = await loadSession(kind, sessionId);
        if (s.status === "completed") {
          goReport();
          return;
        }
        if (s.status === "cancelled" || s.status === "abandoned") {
          replace(`/mock-test?closed=${s.status}` as Href);
          return;
        }
        setSession(s);
      } catch (e) {
        if (!opts?.silent) {
          setError(
            e instanceof ApiError && e.message === "timeout"
              ? t("โหลดข้อสอบนานผิดปกติ ลองใหม่อีกครั้ง", "Loading took too long — please try again.")
              : e instanceof Error
                ? e.message
                : t("โหลดข้อสอบไม่สำเร็จ", "Could not load this exam"),
          );
        }
      } finally {
        if (!opts?.silent) setLoading(false);
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [goReport, kind, replace, sessionId, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const stepIndex = session?.current_step ?? 1;
  const current = useMemo(() => session?.items.find((i) => i.step_index === stepIndex) ?? null, [session, stepIndex]);
  const skipTimer = session?.targets?.skipTimerMode === true;
  const retakeSteps = Array.isArray(session?.targets?.retakeSteps) ? (session!.targets.retakeSteps as unknown[]) : [];
  const stepKey = current ? `${sessionId}:${current.step_index}` : null;
  const showMiniIntro = kind === "mini" && !!current && !introSeen[current.step_index];

  // Arm the clock for each new step. Dictation / speak-about-photo (and every
  // mini step until its intro is dismissed) start paused.
  useEffect(() => {
    if (!current || !stepKey || skipTimer) {
      timer.stop();
      return;
    }
    const limit = Number(current.time_limit_sec ?? 0) || 60;
    const holdForTask = GATED_TASKS.has(current.task_type) && !(kind === "mini" && current.task_type !== "dictation");
    timer.start(stepKey, limit, { paused: holdForTask || kind === "mini" });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, skipTimer]);

  // Mini: the clock runs once the intro is dismissed (dictation waits for its audio).
  const dismissIntro = () => {
    if (!current) return;
    setIntroSeen((p) => ({ ...p, [current.step_index]: true }));
    if (current.task_type !== "dictation") timer.resume();
  };

  // Pause the clock while the app is in the background (web pauses on hidden tabs).
  const wasRunning = useRef(false);
  const timerRef = useRef(timer);
  timerRef.current = timer;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      const tm = timerRef.current;
      if (state === "active") {
        if (wasRunning.current) tm.resume();
        wasRunning.current = false;
      } else if (tm.running) {
        wasRunning.current = true;
        tm.pause();
      }
    });
    return () => sub.remove();
  }, []);

  const timeUp =
    kind === "mock" && !skipTimer && !resting && !loading && !!stepKey && timer.armedKey === stepKey && timer.expired;

  const submit = useCallback(
    async (answer: unknown) => {
      if (!session || !current || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setNotice(null);
      const slow = current.is_ai_graded === true || SLOW_GRADED_TASKS.has(current.task_type);
      // Mini grades writing/speaking inline, so it can take a while; mock grades those in the background.
      const timeoutMs = kind === "mini" ? (slow ? 150000 : 30000) : slow ? 120000 : 30000;
      try {
        const res =
          kind === "mock"
            ? await submitMockStep(sessionId, current.step_index, answer, timeoutMs)
            : await submitMiniStep(sessionId, current.step_index, answer, timeoutMs);
        if (res.complete) {
          timer.stop();
          goReport();
          return;
        }
        sfxNavigate();
        const restSec = Number(current.rest_after_step_sec ?? 0);
        const nextItem = session.items.find((i) => i.step_index === current.step_index + 1);
        if (!skipTimer && restSec > 0) {
          timer.start(`rest:${current.step_index}`, restSec);
          setResting({ nextLabel: nextItem ? t(taskMeta(nextItem.task_type).th, taskMeta(nextItem.task_type).en) : "" });
          submittingRef.current = false;
          setSubmitting(false);
          return;
        }
        // Step 13 feeds step 14, retakes jump between steps, mini re-reads its state: ask the server.
        if (kind === "mini" || current.step_index === 13 || retakeSteps.length > 0) {
          await load();
          return;
        }
        const submitted = current;
        setSession((prev) =>
          prev
            ? {
                ...prev,
                current_step: submitted.step_index + 1,
                responses: prev.responses.some((r) => r.step_index === submitted.step_index)
                  ? prev.responses
                  : [...prev.responses, { step_index: submitted.step_index, task_type: submitted.task_type, answer }],
              }
            : prev,
        );
        submittingRef.current = false;
        setSubmitting(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        const status = e instanceof ApiError ? e.status : 0;
        if (msg === "Session already closed" || msg === "Step already submitted") {
          await load();
          return;
        }
        if (status === 409 || msg.startsWith("Invalid step order") || msg.startsWith("Session changed during submit")) {
          await load();
          setNotice(t("บันทึกคำตอบก่อนหน้าแล้ว และพามายังข้อที่ถูกต้อง ทำต่อได้เลย", "Your earlier answer was saved — you're on the right question now."));
          return;
        }
        if (status === 0) {
          // Network drop / timeout: unknown whether it landed — reload the true step.
          await load();
          setNotice(
            t(
              "การส่งใช้เวลานานผิดปกติ โหลดความคืบหน้าใหม่แล้ว — ถ้ายังอยู่ข้อเดิมให้กดส่งอีกครั้ง",
              "Sending took unusually long. Progress reloaded — if you're still on the same question, submit again.",
            ),
          );
          return;
        }
        submittingRef.current = false;
        setSubmitting(false);
        setNotice(
          status === 503
            ? t("ระบบตรวจคำตอบไม่ว่างชั่วคราว คำตอบยังไม่ถูกบันทึก — กดส่งอีกครั้ง", "Grading is busy right now and your answer wasn't saved — please submit again.")
            : msg || t("ส่งคำตอบไม่สำเร็จ", "Could not submit"),
        );
      }
    },
    [current, goReport, kind, load, retakeSteps.length, session, sessionId, skipTimer, t, timer],
  );

  // Rest finished → continue.
  useEffect(() => {
    if (!resting || !timer.expired) return;
    setResting(null);
    void load();
  }, [resting, timer.expired, load]);

  // Backstop: if a task didn't hand in its answer at 00:00, submit an empty one.
  useEffect(() => {
    if (!timeUp) return;
    const id = setTimeout(() => {
      if (!submittingRef.current) void submit({ timedOut: true, answer: null });
    }, 8000);
    return () => clearTimeout(id);
  }, [timeUp, submit]);

  const quit = async () => {
    setConfirmQuit(false);
    if (kind === "mock") {
      try {
        await cancelMockSession(sessionId);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : t("ยกเลิกไม่สำเร็จ", "Could not cancel"));
        return;
      }
    }
    replace("/mock-test" as Href);
  };

  if (loading && !session) return <ScreenLoader label={t("กำลังเปิดข้อสอบ…", "Opening your exam…")} />;
  if (error) {
    return (
      <View style={st.center}>
        <Note tone="error">{error}</Note>
        <PrimaryButton label={t("ลองอีกครั้ง", "Try again")} onPress={() => void load()} />
        <PrimaryButton tone="ghost" label={t("กลับศูนย์ข้อสอบ", "Back to the mock center")} onPress={() => replace("/mock-test" as Href)} />
      </View>
    );
  }
  if (loading) return <MascotLoader label={t("กำลังเตรียมข้อต่อไป…", "Preparing the next question…")} />;
  if (!session || !current) {
    return (
      <View style={st.center}>
        <Note tone="error">{t(`ไม่พบข้อ ${stepIndex} ในชุดนี้`, `Step ${stepIndex} is missing from this set.`)}</Note>
        <PrimaryButton tone="ghost" label={t("กลับศูนย์ข้อสอบ", "Back to the mock center")} onPress={() => replace("/mock-test" as Href)} />
      </View>
    );
  }

  if (resting) {
    return (
      <View style={st.center}>
        <FadeInItem style={st.restCard}>
          <Text style={st.restLabel}>{t("พักสั้น ๆ", "SHORT BREAK")}</Text>
          <Text style={st.restTitle}>{t(`พัก ${Math.round(timer.limitSec)} วินาที`, `${Math.round(timer.limitSec)}-second break`)}</Text>
          <Text style={st.restSub}>
            {t("พักสายตา ผ่อนมือ หายใจลึก ๆ แล้วไปต่อข้อถัดไป", "Rest your eyes, relax your hands, breathe — then carry on.")}
          </Text>
          <PhaseClock label={t("เหลือเวลาพัก", "Break left")} seconds={timer.remainingSec} />
          {resting.nextLabel ? (
            <Text style={st.restNext}>{t(`ต่อไป: ${resting.nextLabel}`, `Next: ${resting.nextLabel}`)}</Text>
          ) : null}
          <PrimaryButton
            tone="yellow"
            label={t("พร้อมแล้ว ไปต่อเลย", "I'm ready — continue")}
            onPress={() => {
              setResting(null);
              timer.stop();
              void load();
            }}
          />
        </FadeInItem>
      </View>
    );
  }

  // Step 14 shows the conversation from step 13.
  let content = (current.content ?? {}) as Record<string, unknown>;
  if (kind === "mock" && current.task_type === "conversation_summary") {
    const prev = session.responses.find((r) => r.step_index === 13 && r.task_type === "interactive_conversation_mcq");
    const a = (prev?.answer ?? null) as { turns?: unknown[]; user_turn_answers?: unknown[] } | null;
    if (a) {
      content = {
        ...content,
        turns: (content.turns as unknown[] | undefined) ?? a.turns ?? [],
        user_turn_answers: a.user_turn_answers ?? [],
        mock_linked_from_interactive: true,
      };
    }
  }

  const meta = taskMeta(current.task_type);
  const answered = session.responses.length;
  const timerColor = timer.critical ? C.red : timer.warning ? "#EAB308" : C.blue;
  const clockHeld = !skipTimer && !timer.running && !timer.expired;
  const gradingInline = kind === "mini" && submitting && (current.is_ai_graded === true || SLOW_GRADED_TASKS.has(current.task_type));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={st.bar}>
        <View style={st.barTop}>
          <Text style={st.barTitle} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={st.barStep}>
            {t("ข้อ", "Step")} <Text style={st.barStepNum}>{stepIndex}</Text>/{stepCount}
          </Text>
        </View>
        {skipTimer ? (
          <Text style={st.barNote}>{t("โหมดตัวอย่าง · ไม่จับเวลา", "Preview mode · untimed")}</Text>
        ) : (
          <View style={st.timerRow}>
            <View style={st.timerTrack}>
              <View style={[st.timerFill, { width: `${Math.round(timer.progress * 100)}%`, backgroundColor: timerColor }]} />
            </View>
            <Text style={[st.timerText, { color: timer.critical ? C.red : timer.warning ? "#A16207" : "#334155" }]}>
              {fmtClock(timer.remainingSec)}
            </Text>
          </View>
        )}
        <View style={st.rail}>
          {Array.from({ length: stepCount }, (_, i) => i + 1).map((n) => (
            <View
              key={n}
              style={[st.railDot, n < stepIndex ? st.railDone : n === stepIndex ? st.railNow : null]}
            />
          ))}
        </View>
      </View>

      <ScrollView ref={scrollRef} style={st.screen} contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        {notice ? (
          <LuxuryPressable style={st.notice} sound="none" onPress={() => setNotice(null)}>
            <Text style={st.noticeText}>💡 {notice}</Text>
          </LuxuryPressable>
        ) : null}

        <FadeInItem key={stepKey ?? "x"} style={st.card}>
          <Text style={st.cardLabel}>
            {meta.emoji} {t(`ข้อ ${stepIndex}`, `STEP ${stepIndex}`)} · {t(meta.th, meta.en)}
          </Text>
          <Text style={st.cardHint}>{t(meta.hintTh, meta.hintEn)}</Text>
          {clockHeld && !showMiniIntro && timer.armedKey === stepKey ? (
            <Text style={st.held}>
              {current.task_type === "dictation"
                ? t("⏸ เวลาจะเริ่มนับหลังฟังเสียงจบครั้งแรก", "⏸ The clock starts after your first listen")
                : t("⏸ เวลาจะเริ่มเมื่อภาพแสดงแล้ว", "⏸ The clock starts once the photo shows")}
            </Text>
          ) : null}
          {timeUp ? <Note tone="warn">{t("หมดเวลา — กำลังส่งคำตอบที่ทำไว้", "Time's up — handing in what you have")}</Note> : null}
          {kind === "mini" && timer.expired && timer.armedKey === stepKey ? (
            <Note tone="warn">{t("หมดเวลาที่แนะนำแล้ว — ส่งคำตอบได้เลย", "Suggested time is up — submit when ready")}</Note>
          ) : null}

          {showMiniIntro ? (
            <View style={st.intro}>
              <Text style={st.introText}>
                {t(MINI_INTRO[current.task_type]?.th ?? meta.hintTh, MINI_INTRO[current.task_type]?.en ?? meta.hintEn)}
              </Text>
              <Text style={st.introTime}>
                {t(`เวลา ${fmtClock(Number(current.time_limit_sec ?? 60))} นาที`, `Time: ${fmtClock(Number(current.time_limit_sec ?? 60))}`)}
              </Text>
              <PrimaryButton label={t("เริ่มข้อนี้", "Start this step")} onPress={dismissIntro} />
            </View>
          ) : (
            <>
              {gradingInline ? <MascotLoader grading /> : null}
              {/* Stays mounted while grading so a failed grade never loses the answer. */}
              <View style={gradingInline ? st.hidden : null}>
                <TaskRouter
                  key={stepKey ?? "task"}
                  taskType={current.task_type}
                  content={content}
                  variant={kind}
                  submitting={submitting}
                  timeUp={timeUp}
                  onSubmit={(payload) => void submit(payload)}
                  onReady={() => {
                    const tm = timerRef.current;
                    if (!skipTimer && tm.armedKey === stepKey && !tm.running && !tm.expired) tm.resume();
                  }}
                />
              </View>
            </>
          )}
        </FadeInItem>

        <Text style={st.progressText}>
          {t(`ทำแล้ว ${answered} ข้อ · เหลือ ${Math.max(0, stepCount - answered)} ข้อ`, `${answered} done · ${Math.max(0, stepCount - answered)} left`)}
        </Text>

        {confirmQuit ? (
          <View style={st.quitBox}>
            <Text style={st.quitTitle}>
              {kind === "mock" ? t("ออกและยกเลิกการสอบนี้?", "Quit and cancel this mock?") : t("ออกจากแบบทดสอบ?", "Leave the diagnosis?")}
            </Text>
            <Text style={st.quitSub}>
              {kind === "mock"
                ? t("การสอบชุดนี้จะถูกปิดและเครดิตจะไม่คืน — ถ้าแค่อยากพัก กดย้อนกลับได้เลย ทำต่อทีหลังได้", "This run will be closed and the credit isn't refunded. Just want a pause? Go back instead — you can resume later.")
                : t("คำตอบที่ส่งแล้วถูกบันทึกไว้", "Answers you've submitted are saved.")}
            </Text>
            <View style={st.quitRow}>
              <View style={{ flex: 1 }}>
                <PrimaryButton tone="ghost" label={t("ทำต่อ", "Keep going")} onPress={() => setConfirmQuit(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton tone="red" label={kind === "mock" ? t("ยกเลิกการสอบ", "Cancel mock") : t("ออก", "Leave")} onPress={() => void quit()} />
              </View>
            </View>
          </View>
        ) : (
          <LuxuryPressable style={st.quitLink} sound="tap" onPress={() => setConfirmQuit(true)}>
            <Text style={st.quitLinkText}>{kind === "mock" ? t("ออกจากการสอบ", "Quit this mock") : t("ออกจากแบบทดสอบ", "Leave")}</Text>
          </LuxuryPressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 60, gap: 12 },
  center: { flex: 1, padding: 20, justifyContent: "center", gap: 12, backgroundColor: C.bg },
  hidden: { display: "none" },
  bar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  barTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  barTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: C.sub },
  barStep: { fontSize: 13, fontWeight: "700", color: C.sub },
  barStepNum: { fontSize: 15, fontWeight: "900", color: C.ink },
  barNote: { fontSize: 12, fontWeight: "700", color: C.blue },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timerTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#E5E7EB", overflow: "hidden" },
  timerFill: { height: "100%", borderRadius: 4 },
  timerText: { fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"], minWidth: 52, textAlign: "right" },
  rail: { flexDirection: "row", gap: 3 },
  railDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" },
  railDone: { backgroundColor: "#10B981" },
  railNow: { backgroundColor: C.yellow },
  notice: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FCD34D", borderRadius: 14, padding: 12 },
  noticeText: { fontSize: 13, fontWeight: "700", color: "#92400E", lineHeight: 19 },
  card: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  cardLabel: { fontSize: 12, fontWeight: "900", color: C.blue, letterSpacing: 0.5 },
  cardHint: { fontSize: 13, color: C.sub, marginTop: -6 },
  held: { fontSize: 12, fontWeight: "800", color: "#A16207" },
  intro: { gap: 12, paddingVertical: 8 },
  introText: { fontSize: 16, lineHeight: 24, fontWeight: "700", color: C.ink },
  introTime: { fontSize: 13, fontWeight: "800", color: C.blue },
  progressText: { textAlign: "center", fontSize: 12, color: C.sub, fontWeight: "700" },
  quitLink: { alignSelf: "center", padding: 8 },
  quitLinkText: { fontSize: 13, fontWeight: "800", color: C.red },
  quitBox: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#FCA5A5", padding: 14, gap: 10 },
  quitTitle: { fontSize: 16, fontWeight: "900", color: C.ink },
  quitSub: { fontSize: 13, color: C.sub, lineHeight: 19 },
  quitRow: { flexDirection: "row", gap: 10 },
  restCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 20, gap: 12 },
  restLabel: { fontSize: 11, fontWeight: "900", color: C.blue, letterSpacing: 1 },
  restTitle: { fontSize: 24, fontWeight: "900", color: C.ink },
  restSub: { fontSize: 14, color: C.sub, lineHeight: 21 },
  restNext: { fontSize: 13, fontWeight: "800", color: C.blue },
});
