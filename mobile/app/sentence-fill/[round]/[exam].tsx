import { type Href, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ExamTimer } from "../../../components/ExamTimer";
import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { ScreenLoader } from "../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../components/Motion";
import { useCountdown } from "../../../hooks/useCountdown";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { useScoreReveal } from "../../../hooks/useScoreReveal";
import { finishStudySession, postPracticeAttempt, startStudySession } from "../../../lib/api";
import { LOAD_FAILED, errorText, scoreLine, useI18n } from "../../../lib/i18n";
import {
  SFITB_MAX_SCORE,
  SFITB_SECONDS_PER_ITEM,
  SFITB_TASK_TYPE,
  fetchSfitbExam,
  sfitbContentKey,
  sfitbIsCorrect,
  sfitbPrefix,
  sfitbRemainderLength,
  sfitbScore,
  type SfitbExam,
} from "../../../lib/sentence-fitb";

type Result = { typed: string; correct: boolean; hintUsed: boolean };
const EXERCISE_TYPE = "sentence_fitb";
const LAST_EXAM = 50;

/** Real-DET sentence Fill in the Blanks: one sentence at a time, 20 s each, the clock moves you on. */
export default function SentenceFillExamScreen() {
  const { round, exam } = useLocalSearchParams<{ round: string; exam: string }>();
  const roundNum = Number(round);
  const examNum = Number(exam);
  const { t } = useI18n();
  const { replace } = useLuxuryRouter();

  const [data, setData] = useState<SfitbExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"intro" | "run" | "report">("intro");
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startedAt = useRef(Date.now());

  useScoreReveal(phase === "report");

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await fetchSfitbExam(roundNum, examNum);
      setData(e);
      sessionIdRef.current = await startStudySession({ exerciseType: EXERCISE_TYPE, skill: "literacy", setId: e.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    }
  }, [roundNum, examNum]);

  useEffect(() => {
    void load();
  }, [load]);

  const timer = useCountdown(SFITB_SECONDS_PER_ITEM, phase === "run", () => next());

  const item = data?.items[idx];

  const finish = async (all: Result[]) => {
    if (!data) return;
    setResults(all);
    setPhase("report");
    const score = sfitbScore(all);
    const correct = all.filter((r) => r.correct).length;
    // Same shape the website writes, so the score shows on both.
    void postPracticeAttempt({
      taskType: SFITB_TASK_TYPE,
      scorePct: (score / SFITB_MAX_SCORE) * 100,
      detail: { correct, total: all.length, score160: score, contentKey: sfitbContentKey(data.round, data.exam) },
    });
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: EXERCISE_TYPE,
        setId: data.id,
        score,
        completed: true,
        duration_seconds: Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000)),
        submission_payload: { answers: all.map((r) => r.typed), hintsUsed: all.map((r) => r.hintUsed) },
        report_payload: { score, maxScore: SFITB_MAX_SCORE, correct, total: all.length },
      });
    } catch {
      /* best-effort */
    }
  };

  function next() {
    if (!data || !item || phase !== "run") return;
    const all = [...results, { typed, correct: sfitbIsCorrect(item, typed), hintUsed }];
    if (idx + 1 >= data.items.length) {
      void finish(all);
      return;
    }
    setResults(all);
    setIdx(idx + 1);
    setTyped("");
    setHintOpen(false);
    setHintUsed(false);
    timer.reset(SFITB_SECONDS_PER_ITEM);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const start = () => {
    setIdx(0);
    setTyped("");
    setResults([]);
    setHintOpen(false);
    setHintUsed(false);
    startedAt.current = Date.now();
    timer.reset(SFITB_SECONDS_PER_ITEM);
    setPhase("run");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
        <LuxuryPressable style={[styles.btn]} onPress={() => void load()}>
          <Text style={styles.btnText}>{t("ลองใหม่", "Retry")}</Text>
        </LuxuryPressable>
      </View>
    );
  }
  if (!data || !item) return <ScreenLoader />;

  if (phase === "intro") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <FadeInItem index={0} style={styles.card}>
          <Text style={styles.badge}>{t("รูปแบบข้อสอบจริงปัจจุบัน", "Current real-test format")}</Text>
          <Text style={styles.title}>{t(`เติมคำในประโยค · ชุดที่ ${data.exam}`, `Fill in the Blanks · set ${data.exam}`)}</Text>
          <Text style={styles.meta}>{t(`รอบที่ ${data.round} · ${data.items.length} ประโยค`, `Round ${data.round} · ${data.items.length} sentences`)}</Text>
          {[
            t("📝 ประโยคละ 1 คำ ให้ตัวอักษรแรกมาแล้ว เติมที่เหลือให้ครบทุกช่อง", "📝 One word per sentence — the first letters are given, fill in the rest"),
            t(`⏱ ข้อละ ${SFITB_SECONDS_PER_ITEM} วินาที หมดเวลาระบบส่งให้อัตโนมัติ ย้อนกลับไม่ได้`, `⏱ ${SFITB_SECONDS_PER_ITEM} seconds each — time's up moves you on, no going back`),
            t("🎯 วัดคำศัพท์ในบริบท + รูปคำ (-ly, -tion, -ing, พหูพจน์)", "🎯 Tests vocabulary in context and word form (-ly, -tion, -ing, plurals)"),
            t("💡 ดูคำใบ้ภาษาไทยได้ แต่ข้อนั้นได้ครึ่งคะแนน (ข้อสอบจริงไม่มีคำใบ้)", "💡 A Thai hint is available but halves that item (the real test has none)"),
          ].map((line) => (
            <Text key={line} style={styles.rule}>
              {line}
            </Text>
          ))}
        </FadeInItem>
        <LuxuryPressable style={[styles.btn]} sound="submit" onPress={start}>
          <Text style={styles.btnText}>{t("เริ่มทำข้อสอบ", "Start")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  if (phase === "report") {
    const score = sfitbScore(results);
    const correct = results.filter((r) => r.correct).length;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ResultMascot
          ratio={score / SFITB_MAX_SCORE}
          message={
            score / SFITB_MAX_SCORE >= 0.75
              ? t("เก่งมาก! คลังคำแน่นจริง 🎉", "Great job — strong vocabulary! 🎉")
              : t("ดูคำที่พลาดด้านล่าง แล้วลองอีกครั้งนะ 💪", "Review the misses below and try again 💪")
          }
        />
        <AnimatedScore value={score} max={SFITB_MAX_SCORE} format={(n, m) => scoreLine(t, n, m)} style={styles.score} />
        <Text style={styles.scoreSub}>{t(`ถูก ${correct} จาก ${results.length} ข้อ`, `${correct} of ${results.length} correct`)}</Text>
        {data.items.map((it, i) => {
          const r = results[i];
          const [b, a] = it.sentence.split("{blank}");
          return (
            <FadeInItem key={it.id} index={i + 1} style={[styles.row, r?.correct ? styles.rowOk : styles.rowBad]}>
              <Text style={[styles.rowGrade, r?.correct ? styles.ok : styles.bad]}>
                {t(`ข้อ ${i + 1}`, `Item ${i + 1}`)} · {it.level} ·{" "}
                {r?.correct ? (r.hintUsed ? t("✓ ถูก (ใช้คำใบ้)", "✓ correct (hint)") : t("✓ ถูก", "✓ correct")) : t("✗ ผิด", "✗ wrong")}
              </Text>
              <Text style={styles.rowSentence}>
                {b}
                <Text style={styles.answer}>{it.answer}</Text>
                {a}
              </Text>
              {!r?.correct ? (
                <Text style={styles.yours}>
                  {t("คุณตอบ", "You")}: {r && r.typed.trim() ? sfitbPrefix(it) + r.typed.trim() : t("(ไม่ได้ตอบ)", "(no answer)")}
                </Text>
              ) : null}
              <Text style={styles.meaning}>
                {it.answer} = {it.meaningTh}
              </Text>
              <Text style={styles.explain}>{it.explanationTh}</Text>
            </FadeInItem>
          );
        })}
        <LuxuryPressable style={[styles.btn]} sound="submit" onPress={start}>
          <Text style={styles.btnText}>{t("ทำชุดนี้อีกครั้ง", "Try this set again")}</Text>
        </LuxuryPressable>
        {data.exam < LAST_EXAM ? (
          <LuxuryPressable style={[styles.btnGhost]} onPress={() => replace(`/sentence-fill/${data.round}/${data.exam + 1}` as Href)}>
            <Text style={styles.btnGhostText}>{t("ชุดถัดไป →", "Next set →")}</Text>
          </LuxuryPressable>
        ) : null}
      </ScrollView>
    );
  }

  const prefix = sfitbPrefix(item);
  const remLen = sfitbRemainderLength(item);
  const [before, after] = item.sentence.split("{blank}");

  return (
    <View style={styles.screen}>
      <TextInput
        ref={inputRef}
        style={styles.keyInput}
        value={typed}
        onChangeText={(v) => setTyped(v.replace(/[^A-Za-z'-]/g, "").slice(0, remLen))}
        onSubmitEditing={() => typed.length > 0 && next()}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoFocus
        blurOnSubmit={false}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ExamTimer left={timer.left} total={SFITB_SECONDS_PER_ITEM} label={t(`ข้อ ${idx + 1}/${data.items.length}`, `Item ${idx + 1}/${data.items.length}`)} urgentAt={5} />
        <Text style={styles.instr}>Complete the sentence with the correct word</Text>
        <LuxuryPressable style={[styles.sentenceCard]} sound="none" scaleTo={1} onPress={() => inputRef.current?.focus()}>
          <Text style={styles.sentence}>
            {before}
            <Text style={styles.prefix}>{prefix}</Text>
            <Text style={[styles.slot, styles.slotFilled]}>{typed}</Text>
            <Text style={[styles.slot, styles.slotEmpty]}>{"_".repeat(Math.max(0, remLen - typed.length))}</Text>
            {after}
          </Text>
        </LuxuryPressable>
        {hintOpen ? <Text style={styles.hint}>💡 {item.hintTh}</Text> : null}
        <View style={styles.actions}>
          <LuxuryPressable
            style={[styles.hintBtn]}
            sound="tap"
            onPress={() => {
              setHintOpen((v) => !v);
              setHintUsed(true);
              inputRef.current?.focus();
            }}
          >
            <Text style={styles.hintBtnText}>{t("💡 คำใบ้ (ครึ่งคะแนน)", "💡 Hint (half marks)")}</Text>
          </LuxuryPressable>
          <LuxuryPressable style={[styles.submit, typed.length === 0 ? styles.submitOff : null]} sound="submit" disabled={typed.length === 0} onPress={next}>
            <Text style={styles.submitText}>SUBMIT</Text>
          </LuxuryPressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F4F6FB" },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: "#111", padding: 18 },
  badge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "900",
    color: "#FFCC00",
    backgroundColor: "#004AAD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  title: { marginTop: 10, fontSize: 20, fontWeight: "900", color: "#111" },
  meta: { marginTop: 2, fontSize: 13, fontWeight: "700", color: "#6B7280", marginBottom: 8 },
  rule: { marginTop: 8, fontSize: 14, color: "#374151", lineHeight: 21 },
  keyInput: { position: "absolute", top: 0, left: 0, width: 1, height: 1, opacity: 0 },
  instr: { marginTop: 18, fontSize: 16, fontWeight: "800", color: "#111", textAlign: "center" },
  sentenceCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  sentence: { fontSize: 18, lineHeight: 32, color: "#111" },
  prefix: { fontWeight: "800", color: "#004AAD", fontFamily: "Menlo", letterSpacing: 3 },
  slot: { fontWeight: "800", fontFamily: "Menlo", letterSpacing: 3 },
  slotFilled: { color: "#111" },
  slotEmpty: { color: "#1CB0F6" },
  hint: {
    marginTop: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    lineHeight: 21,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  hintBtn: {
    flex: 1,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  hintBtnText: { fontSize: 13, fontWeight: "800", color: "#92400E" },
  submit: { flex: 1, backgroundColor: "#1CB0F6", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitOff: { backgroundColor: "#CBD5E1" },
  submitText: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  score: { fontSize: 26, fontWeight: "900", textAlign: "center" },
  scoreSub: { marginTop: 4, fontSize: 14, fontWeight: "800", color: "#4B5563", textAlign: "center" },
  row: { marginTop: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, padding: 12 },
  rowOk: { borderColor: "#A7F3D0" },
  rowBad: { borderColor: "#FECACA" },
  rowGrade: { fontSize: 12, fontWeight: "900" },
  ok: { color: "#047857" },
  bad: { color: "#B91C1C" },
  rowSentence: { marginTop: 6, fontSize: 15, lineHeight: 23, color: "#1F2937" },
  answer: { fontWeight: "900", color: "#047857" },
  yours: { marginTop: 4, fontSize: 13, color: "#B91C1C", fontWeight: "700" },
  meaning: { marginTop: 6, fontSize: 14, fontWeight: "800", color: "#111" },
  explain: { marginTop: 2, fontSize: 13, color: "#4B5563", lineHeight: 20 },
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
