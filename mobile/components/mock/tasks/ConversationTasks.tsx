import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../LuxuryPressable";
import { useTaskAudio } from "../../../hooks/useTaskAudio";
import { useTimeUp } from "../../../hooks/useStepTimer";
import { useI18n } from "../../../lib/i18n";
import {
  AnswerBox,
  C,
  Note,
  OptionButton,
  PrimaryButton,
  SectionLabel,
  SubmitButton,
  TaskInstruction,
  countWords,
  taskStyles,
} from "../TaskUi";
import { firstStr, str, type TaskProps } from "./types";

type McqTurn = { question_en: string; question_audio_url?: string; options: string[]; correct_answer: string };

function asTurn(v: unknown): McqTurn {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    question_en: str(o.question_en),
    question_audio_url: str(o.question_audio_url) || undefined,
    options: Array.isArray(o.options) ? o.options.map((x) => str(x)) : [],
    correct_answer: str(o.correct_answer),
  };
}

/** Small "listen" button for a line of the conversation (hosted audio or synthesized). */
function ListenButton({ url, text }: { url?: string; text: string }) {
  const { t } = useI18n();
  const audio = useTaskAudio({ url, text, lazy: true });
  if (audio.state === "error") return null;
  return (
    <LuxuryPressable
      style={st.listen}
      sound="none"
      disabled={audio.state === "loading" || audio.playing}
      onPress={() => void audio.play()}
    >
      {audio.state === "loading" ? (
        <ActivityIndicator size="small" color={C.blue} />
      ) : (
        <Text style={st.listenText}>{audio.playing ? t("🔊 กำลังเล่น…", "🔊 Playing…") : t("🔊 ฟัง", "🔊 Listen")}</Text>
      )}
    </LuxuryPressable>
  );
}

/** Interactive conversation — pick the best reply turn by turn (Phase A then B). */
export function ConversationMcqTask({ content, submitting, timeUp, onSubmit }: TaskProps) {
  const { t } = useI18n();
  const { partA, all } = useMemo(() => {
    const turns = (Array.isArray(content.turns) ? content.turns : []).map(asTurn);
    const a = (Array.isArray(content.part_a_questions) ? content.part_a_questions : Array.isArray(content.phase_a_turns) ? content.phase_a_turns : null)?.map(asTurn) ?? turns.slice(0, 3);
    const b = (Array.isArray(content.part_b_questions) ? content.part_b_questions : Array.isArray(content.phase_b_turns) ? content.phase_b_turns : null)?.map(asTurn) ?? turns.slice(3);
    return { partA: a, all: [...a, ...b] };
  }, [content]);
  const scenario = firstStr(content.scenario_en, content.scenario, content.scenario_text, content.scenario_description);
  const scenarioAudio = firstStr(content.scenario_audio_url, content.scenarioAudioUrl);
  const [answers, setAnswers] = useState<string[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const idx = answers.length;

  const build = (list: string[]) => {
    let correct = 0;
    all.forEach((turn, i) => {
      if (str(list[i]).trim() === turn.correct_answer.trim()) correct += 1;
    });
    return {
      user_turn_answers: list,
      turns: all.map((turn) => ({ question_en: turn.question_en, reference_answer_en: turn.correct_answer })),
      averageScore0To100: all.length ? (correct / all.length) * 100 : 0,
    };
  };

  useTimeUp(timeUp, () => onSubmit(build(pick ? [...answers, pick] : [...answers])));

  if (!all.length) return <Note tone="error">{t("ข้อนี้ไม่มีบทสนทนา", "This conversation has no turns.")}</Note>;

  const turn = all[Math.min(idx, all.length - 1)]!;
  const inA = idx < partA.length;
  const phaseTotal = inA ? partA.length : all.length - partA.length;
  const phasePos = inA ? idx + 1 : idx - partA.length + 1;
  const last = idx >= all.length - 1;

  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th={str(content.instruction_th) || "อ่านสถานการณ์ แล้วเลือกคำตอบที่ต่อบทสนทนาได้ดีที่สุด"}
        en={str(content.instruction) || "Read the scenario, then choose the best reply at each turn."}
      />
      {inA && scenario ? (
        <View style={[taskStyles.passage, { gap: 8 }]}>
          <SectionLabel>{t("สถานการณ์", "SCENARIO")}</SectionLabel>
          <Text style={taskStyles.passageText}>{scenario}</Text>
          <ListenButton url={scenarioAudio || undefined} text={scenario} />
        </View>
      ) : null}
      <SectionLabel>
        {t(`ช่วง ${inA ? "A" : "B"} · ข้อ ${phasePos}/${phaseTotal}`, `PHASE ${inA ? "A" : "B"} · QUESTION ${phasePos}/${phaseTotal}`)} ·{" "}
        {t(`รวม ${idx + 1}/${all.length}`, `${idx + 1}/${all.length} total`)}
      </SectionLabel>
      <View style={st.bubble}>
        <Text style={st.bubbleText}>{turn.question_en}</Text>
        <ListenButton key={idx} url={turn.question_audio_url} text={turn.question_en} />
      </View>
      {turn.options.map((o, i) => (
        <OptionButton
          key={`${idx}-${i}`}
          label={`${String.fromCharCode(65 + i)}. ${o}`}
          selected={pick === o}
          disabled={submitting}
          onPress={() => setPick(o)}
        />
      ))}
      {last ? (
        <SubmitButton
          busy={submitting}
          disabled={!pick}
          label={t("จบบทสนทนา · ส่งคำตอบ", "Finish conversation")}
          onPress={() => pick && onSubmit(build([...answers, pick]))}
        />
      ) : (
        <PrimaryButton
          label={t("ข้อต่อไป →", "Next question →")}
          disabled={!pick || submitting}
          onPress={() => {
            if (!pick) return;
            setAnswers([...answers, pick]);
            setPick(null);
          }}
        />
      )}
    </View>
  );
}

type SummaryTurn = { question_en: string; question_th?: string; reference_answer_en: string; reference_answer_th?: string };

function asSummaryTurn(v: unknown): SummaryTurn {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    question_en: str(o.question_en),
    question_th: str(o.question_th) || undefined,
    reference_answer_en: str(o.reference_answer_en),
    reference_answer_th: str(o.reference_answer_th) || undefined,
  };
}

const SUMMARY_MIN_WORDS = 5;

/** Conversation summary — linked to step 13's conversation, standalone chat + recap, or plain dialogue lines. */
export function ConversationSummaryTask(props: TaskProps) {
  const c = props.content;
  const turns = Array.isArray(c.turns) ? c.turns.map(asSummaryTurn) : [];
  if (Array.isArray(c.turns) && c.mock_linked_from_interactive === true) return <LinkedSummary {...props} turns={turns} />;
  if (turns.length >= 2 && turns.every((x) => x.question_en.trim() && x.reference_answer_en.trim())) {
    return <StandaloneSummary {...props} turns={turns} />;
  }
  return <PlainSummary {...props} />;
}

function LinkedSummary({ content, submitting, timeUp, onSubmit, turns }: TaskProps & { turns: SummaryTurn[] }) {
  const { t } = useI18n();
  const [summary, setSummary] = useState("");
  const userAnswers = Array.isArray(content.user_turn_answers) ? content.user_turn_answers.map((x) => str(x)) : [];
  useTimeUp(timeUp, () => onSubmit({ text: summary }));
  if (!turns.length) {
    return <Note tone="error">{t("ไม่พบบทสนทนาจากข้อก่อนหน้า", "No conversation data found from the previous step.")}</Note>;
  }
  const ok = countWords(summary) >= SUMMARY_MIN_WORDS;
  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th={str(content.summary_instruction_th) || "เขียนสรุปบทสนทนา"}
        en={str(content.summary_instruction_en) || "Write a concise summary from the conversation below."}
      />
      <View style={st.thread}>
        {turns.map((turn, i) => (
          <View key={i} style={st.threadItem}>
            <Text style={st.who}>{t("ผู้สอบ", "Examiner")}</Text>
            <Text style={st.line}>{turn.question_en}</Text>
            <Text style={st.who}>{t("คำตอบของคุณ", "Your answer")}</Text>
            <Text style={st.line}>{userAnswers[i] || "-"}</Text>
            <Text style={st.who}>{t("คำตอบตัวอย่าง", "Reference answer")}</Text>
            <Text style={[st.line, { color: C.green }]}>{turn.reference_answer_en}</Text>
          </View>
        ))}
      </View>
      <AnswerBox value={summary} onChange={setSummary} editable={!submitting} minHeight={140} minWords={SUMMARY_MIN_WORDS} />
      <SubmitButton
        busy={submitting}
        disabled={!ok}
        label={ok ? undefined : t(`เขียนอย่างน้อย ${SUMMARY_MIN_WORDS} คำ`, `Write at least ${SUMMARY_MIN_WORDS} words`)}
        onPress={() => onSubmit({ text: summary.trim() })}
      />
    </View>
  );
}

function StandaloneSummary({ content, submitting, timeUp, onSubmit, turns }: TaskProps & { turns: SummaryTurn[] }) {
  const { t } = useI18n();
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [reply, setReply] = useState("");
  const [summary, setSummary] = useState("");
  const stage: "chat" | "recap" = userAnswers.length >= turns.length ? "recap" : "chat";
  useTimeUp(timeUp, () =>
    onSubmit({
      text: summary.trim(),
      user_turn_answers: reply.trim() ? [...userAnswers, reply.trim()] : userAnswers,
    }),
  );
  if (stage === "chat") {
    const turn = turns[userAnswers.length]!;
    return (
      <View style={taskStyles.gap}>
        <TaskInstruction th={str(content.instruction_th) || "ตอบคำถามทีละข้อ"} en={str(content.instruction) || "Reply to each question."} />
        <SectionLabel>{t(`ข้อ ${userAnswers.length + 1}/${turns.length}`, `TURN ${userAnswers.length + 1}/${turns.length}`)}</SectionLabel>
        <View style={st.bubble}>
          <Text style={st.bubbleText}>{turn.question_en}</Text>
          {turn.question_th ? <Text style={taskStyles.muted}>{turn.question_th}</Text> : null}
        </View>
        <AnswerBox value={reply} onChange={setReply} editable={!submitting} minHeight={90} showWords={false} />
        <PrimaryButton
          label={t("ต่อไป →", "Next →")}
          disabled={reply.trim().length < 2 || submitting}
          onPress={() => {
            setUserAnswers([...userAnswers, reply.trim()]);
            setReply("");
          }}
        />
      </View>
    );
  }
  const ok = countWords(summary) >= SUMMARY_MIN_WORDS;
  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th={str(content.summary_instruction_th) || "สรุปบทสนทนาด้านล่าง"}
        en={str(content.summary_instruction_en) || "Read the dialogue (questions + model answers), then write your summary."}
      />
      <View style={st.thread}>
        {turns.map((turn, i) => (
          <View key={i} style={st.threadItem}>
            <Text style={st.line}>Q: {turn.question_en}</Text>
            <Text style={[st.line, { color: C.green }]}>A: {turn.reference_answer_en}</Text>
          </View>
        ))}
      </View>
      <AnswerBox value={summary} onChange={setSummary} editable={!submitting} minHeight={140} minWords={SUMMARY_MIN_WORDS} />
      <SubmitButton
        busy={submitting}
        disabled={!ok}
        onPress={() => onSubmit({ text: summary.trim(), user_turn_answers: userAnswers })}
      />
    </View>
  );
}

function PlainSummary({ content, submitting, timeUp, onSubmit }: TaskProps) {
  const [summary, setSummary] = useState("");
  const lines = Array.isArray(content.dialogue_lines) ? content.dialogue_lines.map((x) => str(x)) : [];
  const audioUrl = str(content.audio_url);
  useTimeUp(timeUp, () => onSubmit({ text: summary }));
  return (
    <View style={taskStyles.gap}>
      <TaskInstruction th={str(content.instruction_th)} en={str(content.instruction) || "Summarize the conversation."} />
      {lines.length ? (
        <View style={st.thread}>
          {lines.map((l, i) => (
            <Text key={i} style={st.line}>
              • {l}
            </Text>
          ))}
        </View>
      ) : null}
      {audioUrl ? <ListenButton url={audioUrl} text="" /> : null}
      <AnswerBox value={summary} onChange={setSummary} editable={!submitting} minHeight={140} />
      <SubmitButton busy={submitting} onPress={() => onSubmit({ text: summary })} />
    </View>
  );
}

const st = StyleSheet.create({
  listen: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF1FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 70,
    alignItems: "center",
  },
  listenText: { color: C.blue, fontWeight: "800", fontSize: 13 },
  bubble: { backgroundColor: "#F1F5FF", borderRadius: 16, borderTopLeftRadius: 4, padding: 14, gap: 8 },
  bubbleText: { fontSize: 16, fontWeight: "700", color: C.ink, lineHeight: 23 },
  thread: { backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12, gap: 12 },
  threadItem: { gap: 2, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 10 },
  who: { fontSize: 11, fontWeight: "900", color: C.sub, marginTop: 4 },
  line: { fontSize: 14, color: C.ink, lineHeight: 20 },
});
