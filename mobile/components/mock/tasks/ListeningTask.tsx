import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../LuxuryPressable";
import { PrefixLetterInput } from "../../PrefixLetterInput";
import { useTaskAudio } from "../../../hooks/useTaskAudio";
import { fitbPrefix } from "../../../lib/campus-fitb";
import { useI18n } from "../../../lib/i18n";
import { C, Note, OptionButton, PhaseClock, PrimaryButton, SectionLabel, SubmitButton, taskStyles } from "../TaskUi";
import { num, shuffle, str, type TaskProps } from "./types";

type Mcq = { question: string; options: string[]; correctAnswer: string };
type FitbSentence = { text: string; word: { correctWord: string; prefix_length: number; explanationThai?: string } | null };
type Scenario = {
  id: string;
  kind: "mcq" | "fitb" | "fitb_with_summary";
  title: string;
  passage: string;
  audioUrl?: string;
  questions: Mcq[];
  sentences: FitbSentence[];
  summary: Mcq | null;
};

const norm = (s: string) => s.trim().toLowerCase();

function asMcq(v: unknown): Mcq | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const options = Array.isArray(o.options) ? o.options.map((x) => str(x)) : [];
  if (!options.length) return null;
  return { question: str(o.question), options, correctAnswer: str(o.correctAnswer) };
}

function parseScenarios(raw: unknown): Scenario[] {
  return (Array.isArray(raw) ? raw : []).map((s, i) => {
    const o = (s ?? {}) as Record<string, unknown>;
    const kind = o.kind === "fitb" || o.kind === "fitb_with_summary" ? o.kind : "mcq";
    return {
      id: str(o.id) || `s${i + 1}`,
      kind,
      title: str(o.title_th),
      passage: str(o.passage),
      audioUrl: str(o.audio_url) || undefined,
      questions: (Array.isArray(o.questions) ? o.questions : []).map(asMcq).filter((x): x is Mcq => !!x),
      sentences: (Array.isArray(o.sentences) ? o.sentences : []).map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        const mw = Array.isArray(r.missingWords) ? (r.missingWords[0] as Record<string, unknown> | undefined) : undefined;
        return {
          text: str(r.text),
          word: mw && typeof mw.correctWord === "string"
            ? { correctWord: mw.correctWord, prefix_length: Number(mw.prefix_length ?? 1), explanationThai: str(mw.explanationThai) || undefined }
            : null,
        };
      }),
      summary: kind === "fitb_with_summary" ? asMcq(o.summary) : null,
    };
  });
}

/** Typed remainder → full answer (prefix shown on screen + what was typed). */
function combineFitb(typed: string, correctWord: string, prefixLength: number): string {
  const clean = typed.trim();
  if (!clean) return "";
  if (norm(clean) === norm(correctWord)) return norm(correctWord);
  const { prefix } = fitbPrefix(correctWord, prefixLength);
  return norm(`${prefix}${clean}`);
}

type Answers = { mcq: string[]; fitb: string[]; summary: string };

/**
 * Mini diagnosis listening: short break, then scenarios one at a time —
 * listen (max plays), answer every item, move on. Scored on the device and
 * sent with the flattened picked / correct answers (website format).
 */
export function ListeningTask({ content, submitting, onSubmit }: TaskProps) {
  const { t } = useI18n();
  const scenarios = useMemo(() => parseScenarios(content.scenarios), [content.scenarios]);
  const maxPlays = Math.max(1, num(content.max_plays, 3));
  const preBreak = num(content.pre_break_seconds, 20);
  const provider = str(content.tts_provider) || "deepgram";
  const [breakLeft, setBreakLeft] = useState(preBreak);
  const [onBreak, setOnBreak] = useState(preBreak > 0);
  const [sIdx, setSIdx] = useState(0);
  const all = useRef<Answers[]>([]);
  const playsUsed = useRef<number[]>([]);
  const [cur, setCur] = useState<Answers>({ mcq: [], fitb: [], summary: "" });

  useEffect(() => {
    if (!onBreak) return;
    const id = setInterval(() => {
      setBreakLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setOnBreak(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onBreak]);

  const scenario = scenarios[sIdx];
  const options = useMemo(
    () => ({
      mcq: scenario?.questions.map((q) => shuffle(q.options)) ?? [],
      summary: scenario?.summary ? shuffle(scenario.summary.options) : [],
    }),
    [scenario],
  );

  if (!scenarios.length) return <Note tone="error">{t("ข้อนี้ไม่มีบทฟัง", "This listening task has no scenarios.")}</Note>;

  if (onBreak) {
    return (
      <View style={taskStyles.gap}>
        <Note>
          {t(
            str(content.pre_break_message_th) || "พักสายตาสั้น ๆ ก่อนเริ่มส่วนการฟัง เตรียมหูฟังให้พร้อม",
            str(content.pre_break_message_en) || "A short break before the listening part — get your headphones ready.",
          )}
        </Note>
        <PhaseClock label={t("พักก่อนเริ่ม", "Break")} seconds={breakLeft} />
        <PrimaryButton label={t("พร้อมแล้ว เริ่มเลย", "I'm ready — start")} onPress={() => setOnBreak(false)} />
      </View>
    );
  }

  const sc = scenario!;
  const fitbItems = sc.kind === "mcq" ? [] : sc.sentences;
  const answeredAll =
    sc.questions.every((_, i) => !!cur.mcq[i]) &&
    fitbItems.every((s, i) => !s.word || fitbPrefix(s.word.correctWord, s.word.prefix_length).remainingLength === 0 || !!str(cur.fitb[i]).trim()) &&
    (!sc.summary || !!cur.summary);
  const last = sIdx >= scenarios.length - 1;

  const finishAll = (answers: Answers[]) => {
    const selected: string[] = [];
    const correct: string[] = [];
    scenarios.forEach((s, i) => {
      const a = answers[i] ?? { mcq: [], fitb: [], summary: "" };
      s.questions.forEach((q, k) => {
        selected.push(norm(a.mcq[k] ?? ""));
        correct.push(norm(q.correctAnswer));
      });
      if (s.kind !== "mcq") {
        s.sentences.forEach((row, k) => {
          if (!row.word) return;
          selected.push(combineFitb(a.fitb[k] ?? "", row.word.correctWord, row.word.prefix_length));
          correct.push(norm(row.word.correctWord));
        });
      }
      if (s.summary) {
        selected.push(norm(a.summary));
        correct.push(norm(s.summary.correctAnswer));
      }
    });
    const hits = selected.filter((v, i) => v && v === correct[i]).length;
    onSubmit({
      selected_answers: selected,
      correct_answers: correct,
      averageScore0To100: correct.length ? (hits / correct.length) * 100 : 0,
      detail: {
        total: correct.length,
        correct: hits,
        scenarios: scenarios.map((s, i) => ({ id: s.id, kind: s.kind, plays_used: playsUsed.current[i] ?? 0 })),
        maxPlays,
      },
    });
  };

  const next = () => {
    all.current[sIdx] = cur;
    if (last) {
      finishAll(all.current);
      return;
    }
    setSIdx(sIdx + 1);
    setCur({ mcq: [], fitb: [], summary: "" });
  };

  return (
    <View style={taskStyles.gap}>
      <SectionLabel>
        {t(`บทฟัง ${sIdx + 1}/${scenarios.length}`, `SCENARIO ${sIdx + 1}/${scenarios.length}`)}
        {sc.title ? ` · ${sc.title}` : ""}
      </SectionLabel>
      <ScenarioAudio
        key={sc.id}
        url={sc.audioUrl}
        text={sc.passage}
        provider={provider}
        maxPlays={maxPlays}
        onPlay={(n) => {
          playsUsed.current[sIdx] = n;
        }}
      />
      {sc.questions.map((q, k) => (
        <View key={`q${k}`} style={st.item}>
          <Text style={taskStyles.question}>
            {k + 1}. {q.question}
          </Text>
          {options.mcq[k]!.map((o) => (
            <OptionButton
              key={o}
              label={o}
              selected={cur.mcq[k] === o}
              disabled={submitting}
              onPress={() => setCur((p) => ({ ...p, mcq: Object.assign([...p.mcq], { [k]: o }) }))}
            />
          ))}
        </View>
      ))}
      {fitbItems.map((row, k) =>
        row.word ? (
          <PrefixLetterInput
            key={`f${k}`}
            index={k}
            promptEn={row.text.replace(/\[\s*BLANK\s*\d*\s*\]/gi, "____")}
            correctWord={row.word.correctWord}
            prefixLength={row.word.prefix_length}
            value={cur.fitb[k] ?? ""}
            disabled={submitting}
            onChange={(v) => setCur((p) => ({ ...p, fitb: Object.assign([...p.fitb], { [k]: v }) }))}
          />
        ) : (
          <Text key={`f${k}`} style={taskStyles.passageText}>
            {row.text}
          </Text>
        ),
      )}
      {sc.summary ? (
        <View style={st.item}>
          <Text style={taskStyles.question}>{sc.summary.question}</Text>
          {options.summary.map((o) => (
            <OptionButton
              key={o}
              label={o}
              selected={cur.summary === o}
              disabled={submitting}
              onPress={() => setCur((p) => ({ ...p, summary: o }))}
            />
          ))}
        </View>
      ) : null}
      {last ? (
        <SubmitButton busy={submitting} disabled={!answeredAll} onPress={next} />
      ) : (
        <PrimaryButton
          label={answeredAll ? t("บทฟังถัดไป →", "Next scenario →") : t("ตอบให้ครบก่อน", "Answer every item first")}
          disabled={!answeredAll || submitting}
          onPress={next}
        />
      )}
    </View>
  );
}

function ScenarioAudio({
  url,
  text,
  provider,
  maxPlays,
  onPlay,
}: {
  url?: string;
  text: string;
  provider: string;
  maxPlays: number;
  onPlay: (plays: number) => void;
}) {
  const { t } = useI18n();
  const audio = useTaskAudio({ url, text, provider, maxPlays });
  useEffect(() => onPlay(audio.plays), [audio.plays, onPlay]);
  const exhausted = audio.playsLeft <= 0;
  return (
    <LuxuryPressable
      style={[st.play, exhausted || audio.state !== "ready" ? st.playOff : null]}
      sound="none"
      disabled={exhausted || audio.state !== "ready" || audio.playing}
      onPress={() => void audio.play()}
    >
      {audio.state === "loading" ? (
        <ActivityIndicator color={C.yellow} />
      ) : (
        <Text style={st.playText}>
          {audio.state === "error"
            ? t("เล่นเสียงไม่ได้", "Audio unavailable")
            : audio.playing
              ? t("🔊 กำลังเล่น…", "🔊 Playing…")
              : exhausted
                ? t(`🔒 ฟังครบ ${maxPlays} ครั้งแล้ว`, `🔒 All ${maxPlays} plays used`)
                : t(`🔊 ฟังบทสนทนา (เหลือ ${audio.playsLeft} ครั้ง)`, `🔊 Listen (${audio.playsLeft} left)`)}
        </Text>
      )}
    </LuxuryPressable>
  );
}

const st = StyleSheet.create({
  item: { gap: 8 },
  play: { backgroundColor: C.blue, borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52, justifyContent: "center" },
  playOff: { backgroundColor: "#6B7280" },
  playText: { color: C.yellow, fontWeight: "900", fontSize: 15 },
});
