import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { LuxuryPressable } from "./LuxuryPressable";
import { AnimatedScore, FadeInItem, ResultMascot } from "./Motion";
import { useScoreReveal } from "../hooks/useScoreReveal";
import { scoreLine, useI18n } from "../lib/i18n";
import { PRODUCTION_MAX_SCORE } from "../lib/production-constants";
import type {
  ImprovementPoint,
  PhotoAttemptReport,
  ProductionCriterionReport,
  ScoreRungSample,
  SubmissionHighlight,
  VocabularyUpgrade,
  WritingAttemptReport,
} from "../lib/production-types";

type Translate = ReturnType<typeof useI18n>["t"];
type CriterionKey = "grammar" | "vocabulary" | "coherence" | "taskRelevancy";

const CRITERIA: CriterionKey[] = ["grammar", "vocabulary", "coherence", "taskRelevancy"];

function criterionLabel(t: Translate, key: CriterionKey): string {
  if (key === "grammar") return t("ไวยากรณ์", "Grammar");
  if (key === "vocabulary") return t("คำศัพท์", "Vocabulary");
  if (key === "coherence") return t("ความลื่นไหล & การเชื่อมประโยค", "Coherence");
  return t("ตอบตรงโจทย์", "Task relevance");
}

function criterionEmoji(key: CriterionKey): string {
  if (key === "grammar") return "🧩";
  if (key === "vocabulary") return "📚";
  if (key === "coherence") return "🔗";
  return "🎯";
}

function toneFor(pct: number): { bar: string; text: string; bg: string } {
  if (pct >= 80) return { bar: "#16A34A", text: "#15803D", bg: "#ECFDF5" };
  if (pct >= 60) return { bar: "#F59E0B", text: "#B45309", bg: "#FFFBEB" };
  return { bar: "#EF4444", text: "#B91C1C", bg: "#FEF2F2" };
}

// ---------------------------------------------------------------------------
// Highlighted text: tap a span to read its note.
// ---------------------------------------------------------------------------

type Span = { key: string; start: number; end: number; good: boolean };

/** Sorted, clamped, non-overlapping spans (the grader occasionally overlaps two). */
function cleanSpans(text: string, spans: Span[]): Span[] {
  const sorted = spans
    .map((s) => ({ ...s, start: Math.max(0, s.start), end: Math.min(text.length, s.end) }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  let cursor = 0;
  for (const s of sorted) {
    if (s.start < cursor) continue;
    out.push(s);
    cursor = s.end;
  }
  return out;
}

function HighlightedText({
  text,
  spans,
  selected,
  onSelect,
}: {
  text: string;
  spans: Span[];
  selected: string | null;
  onSelect?: (key: string) => void;
}) {
  const clean = useMemo(() => cleanSpans(text, spans), [text, spans]);
  const parts: ReactNode[] = [];
  let cursor = 0;
  clean.forEach((s) => {
    if (s.start > cursor) parts.push(text.slice(cursor, s.start));
    const isSel = selected === s.key;
    parts.push(
      <Text
        key={s.key}
        onPress={onSelect ? () => onSelect(s.key) : undefined}
        style={[
          s.good ? styles.markGood : styles.markFix,
          isSel ? (s.good ? styles.markGoodSel : styles.markFixSel) : null,
        ]}
      >
        {text.slice(s.start, s.end)}
      </Text>,
    );
    cursor = s.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <Text style={styles.passage}>{parts}</Text>;
}

function SubmissionBlock({
  title,
  text,
  highlights,
  keyPrefix,
}: {
  title: string;
  text: string;
  highlights: SubmissionHighlight[];
  keyPrefix: string;
}) {
  const { t } = useI18n();
  const spans = useMemo<Span[]>(
    () =>
      highlights.map((h, i) => ({
        key: `${keyPrefix}-${h.id ?? i}`,
        start: h.start,
        end: h.end,
        good: h.isPositive,
      })),
    [highlights, keyPrefix],
  );
  const byKey = useMemo(() => {
    const m = new Map<string, SubmissionHighlight>();
    highlights.forEach((h, i) => m.set(`${keyPrefix}-${h.id ?? i}`, h));
    return m;
  }, [highlights, keyPrefix]);
  // Open on the first thing to fix, so the note area is never an empty mystery.
  const firstFix = spans.find((s) => !s.good)?.key ?? spans[0]?.key ?? null;
  const [selected, setSelected] = useState<string | null>(firstFix);
  const note = selected ? byKey.get(selected) : undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <HighlightedText text={text} spans={spans} selected={selected} onSelect={setSelected} />
      {spans.length > 0 ? (
        <>
          <View style={styles.legend}>
            <Text style={[styles.legendChip, styles.markGood]}>{t("จุดเด่น", "Strong")}</Text>
            <Text style={[styles.legendChip, styles.markFix]}>{t("ควรแก้", "Fix")}</Text>
            <Text style={styles.legendHint}>{t("แตะคำที่ไฮไลต์เพื่อดูคำอธิบาย", "Tap a highlight to see why")}</Text>
          </View>
          {note ? (
            <View style={[styles.noteBox, note.isPositive ? styles.noteGood : styles.noteFix]}>
              <Text style={styles.noteHead}>
                {note.isPositive ? t("✅ ทำได้ดี", "✅ Nice") : t("✏️ ควรแก้", "✏️ Fix this")}
              </Text>
              <Text style={styles.noteText}>{t(note.noteTh || note.noteEn, note.noteEn || note.noteTh)}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Criteria
// ---------------------------------------------------------------------------

function CriterionBar({ label, emoji, pct, index }: { label: string; emoji: string; pct: number; index: number }) {
  const tone = toneFor(pct);
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(250 + index * 140, withTiming(pct, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [pct, index, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={styles.barRow}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>
          {emoji} {label}
        </Text>
        <Text style={[styles.barPct, { color: tone.text }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: tone.bar }, fill]} />
      </View>
    </View>
  );
}

function CriterionFeedback({
  k,
  r,
  open,
  onToggle,
}: {
  k: CriterionKey;
  r: ProductionCriterionReport;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const tone = toneFor(r.scorePercent);
  const breakdown = r.breakdown ?? [];
  return (
    <View style={styles.card}>
      <LuxuryPressable style={[styles.critHeader]} sound="none" scaleTo={0.99} onPress={onToggle}>
        <Text style={styles.critTitle}>
          {criterionEmoji(k)} {criterionLabel(t, k)}
        </Text>
        <Text style={[styles.critScore, { color: tone.text, backgroundColor: tone.bg }]}>
          {Math.round(r.scorePercent)}%
        </Text>
        <Text style={styles.chev}>{open ? "▾" : "▸"}</Text>
      </LuxuryPressable>

      <View style={[styles.leadBox, { backgroundColor: tone.bg }]}>
        <Text style={styles.leadText}>{t(r.summary.th || r.summary.en, r.summary.en || r.summary.th)}</Text>
      </View>

      {open ? (
        <>
          {breakdown.length > 0 ? (
            <View style={styles.bullets}>
              {breakdown.map((b) => {
                const suggestionEn = b.suggestionEn?.trim();
                const suggestionTh = b.suggestionTh?.trim();
                const topic = t(b.topicTh || b.topicEn || "", b.topicEn || b.topicTh || "");
                return (
                  <View key={b.id} style={styles.bulletItem}>
                    <Text style={styles.bulletDot}>•</Text>
                    <View style={styles.bulletBody}>
                      {topic ? <Text style={styles.topicChip}>{topic}</Text> : null}
                      <Text style={styles.bulletText}>{t(b.th || b.en, b.en || b.th)}</Text>
                      {b.excerpt ? <Text style={styles.excerpt}>✗ “{b.excerpt}”</Text> : null}
                      {suggestionEn ? <Text style={styles.suggestion}>✓ {suggestionEn}</Text> : null}
                      {suggestionTh ? <Text style={styles.suggestionTh}>{suggestionTh}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {r.toPerfect && r.scorePercent < 100 ? (
            <View style={styles.perfectBox}>
              <Text style={styles.perfectHead}>{t("🎯 ทำยังไงให้ได้เต็ม", "🎯 How to reach 100%")}</Text>
              <Text style={styles.bulletText}>{t(r.toPerfect.missingTh || r.toPerfect.missingEn, r.toPerfect.missingEn || r.toPerfect.missingTh)}</Text>
              {r.toPerfect.examples.map((ex) => (
                <View key={ex.id} style={styles.exampleRow}>
                  <Text style={styles.exampleEn}>“{ex.en}”</Text>
                  {ex.th ? <Text style={styles.exampleTh}>{ex.th}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Extras
// ---------------------------------------------------------------------------

function VocabUpgrades({ items }: { items: VocabularyUpgrade[] }) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("📈 อัปเกรดคำศัพท์", "📈 Vocabulary upgrades")}</Text>
      {items.slice(0, 8).map((v) => (
        <View key={v.id} style={styles.vocabRow}>
          <View style={styles.vocabPair}>
            <Text style={styles.vocabOld}>{v.originalWord}</Text>
            <Text style={styles.vocabArrow}>→</Text>
            <Text style={styles.vocabNew}>{v.upgradedWord}</Text>
          </View>
          {v.meaningTh ? <Text style={styles.vocabMeaning}>{v.meaningTh}</Text> : null}
          {v.exampleEn ? <Text style={styles.vocabExample}>“{v.exampleEn}”</Text> : null}
        </View>
      ))}
    </View>
  );
}

function ScoreRung({ rung }: { rung: ScoreRungSample }) {
  const { t } = useI18n();
  const spans = useMemo<Span[]>(
    () => rung.changes.map((c) => ({ key: c.id, start: c.start, end: c.end, good: true })),
    [rung.changes],
  );
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {t(`🚀 คำตอบของคุณ ถ้าจะได้ ~${rung.target160}`, `🚀 Your answer at ~${rung.target160}`)}
      </Text>
      <Text style={styles.rungHead}>{t(rung.headlineTh || rung.headlineEn, rung.headlineEn || rung.headlineTh)}</Text>
      <HighlightedText text={rung.text} spans={spans} selected={null} />
      {rung.changes.length > 0 ? (
        <View style={styles.bullets}>
          {rung.changes.map((c) => (
            <View key={c.id} style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <View style={styles.bulletBody}>
                <Text style={styles.bulletText}>
                  {c.original ? <Text style={styles.excerptInline}>{c.original} → </Text> : null}
                  <Text style={styles.changeNew}>{rung.text.slice(c.start, c.end)}</Text>
                </Text>
                <Text style={styles.changeNote}>{t(c.noteTh || c.noteEn, c.noteEn || c.noteTh)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function KeyLearning({ points }: { points: ImprovementPoint[] }) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("📝 สรุปสิ่งที่ได้เรียนรู้", "📝 Key takeaways")}</Text>
      <View style={styles.bullets}>
        {points.map((p) => (
          <View key={p.id} style={styles.bulletItem}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={[styles.bulletText, styles.bulletBody]}>{t(p.th || p.en, p.en || p.th)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

type Props = {
  report: PhotoAttemptReport | WritingAttemptReport;
  /** Write vs speak changes the submission heading. */
  mode: "write-photo" | "speak-photo" | "essay";
  onRetry: () => void;
  onDone: () => void;
};

export function ProductionReportView({ report, mode, onRetry, onDone }: Props) {
  const { t } = useI18n();
  useScoreReveal(true);
  const score = Math.round(report.score160);
  const ratio = score / PRODUCTION_MAX_SCORE;

  const weakest = useMemo(() => {
    let worst: CriterionKey = "grammar";
    for (const k of CRITERIA) if (report[k].scorePercent < report[worst].scorePercent) worst = k;
    return worst;
  }, [report]);
  const [open, setOpen] = useState<Set<CriterionKey>>(() => new Set([weakest]));
  const toggle = (k: CriterionKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const isPhoto = "kind" in report && report.kind === "photo-speak";
  const photo = isPhoto ? (report as PhotoAttemptReport) : null;
  const essay = !isPhoto ? (report as WritingAttemptReport) : null;

  const submissionText = photo
    ? (photo.punctuatedTranscript ?? photo.transcript).trim()
    : (essay!.punctuatedEssay ?? essay!.essay).trim();
  const submissionHighlights = photo
    ? (photo.transcriptHighlights ?? [])
    : essay!.punctuatedEssay
      ? (essay!.mainSubmissionHighlights ?? [])
      : [];

  const submissionTitle =
    mode === "speak-photo"
      ? t("🎙️ สิ่งที่คุณพูด (ถอดเสียงแล้ว)", "🎙️ What you said (transcribed)")
      : mode === "write-photo"
        ? t("✍️ คำตอบของคุณ", "✍️ Your answer")
        : t("✍️ เรียงความของคุณ", "✍️ Your essay");

  const upgrades = report.vocabularyUpgradeSuggestions ?? [];
  const rung = report.scoreRungs?.rungs?.[0];
  const points = report.improvementPoints ?? [];

  let block = 0;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ResultMascot
        ratio={ratio}
        message={
          ratio >= 0.75
            ? t("เก่งมาก! คำตอบนี้แข็งแรงมาก 🎉", "Great job — a strong answer! 🎉")
            : t("ดีขึ้นได้อีก! ดูจุดที่ควรแก้ด้านล่าง แล้วลองอีกครั้งนะ 💪", "You can push this higher — check the fixes below and try again 💪")
        }
      />

      <FadeInItem index={block++} style={styles.scoreCard}>
        <AnimatedScore
          value={score}
          max={PRODUCTION_MAX_SCORE}
          format={(n, m) => scoreLine(t, n, m)}
          style={styles.score}
        />
        <Text style={styles.scoreMeta}>
          {t(`${report.wordCount} คำ`, `${report.wordCount} words`)}
          {report.taskPersonalExperienceBoostApplied
            ? t(" · ได้โบนัสจากการเล่าประสบการณ์ตัวเอง", " · bonus for using personal experience")
            : ""}
        </Text>
        <View style={styles.bars}>
          {CRITERIA.map((k, i) => (
            <CriterionBar key={k} label={criterionLabel(t, k)} emoji={criterionEmoji(k)} pct={report[k].scorePercent} index={i} />
          ))}
        </View>
      </FadeInItem>

      {photo?.imageUrl ? (
        <FadeInItem index={block++}>
          <Image source={{ uri: photo.imageUrl }} style={styles.photo} resizeMode="cover" />
        </FadeInItem>
      ) : null}

      {submissionText ? (
        <FadeInItem index={block++}>
          <SubmissionBlock
            title={submissionTitle}
            text={submissionText}
            highlights={submissionHighlights}
            keyPrefix="main"
          />
        </FadeInItem>
      ) : null}

      {essay?.followUpResponses?.map((fu, i) =>
        fu.answer.trim() ? (
          <FadeInItem key={`fu-${i}`} index={block++}>
            <SubmissionBlock
              title={t(`คำถามต่อ ${i + 1}: ${fu.promptEn}`, `Follow-up ${i + 1}: ${fu.promptEn}`)}
              text={(fu.answerPunctuated ?? fu.answer).trim()}
              highlights={fu.answerPunctuated ? (essay.followUpSubmissionHighlights?.[i] ?? []) : []}
              keyPrefix={`fu${i}`}
            />
          </FadeInItem>
        ) : null,
      )}

      <Text style={styles.sectionTitle}>{t("ผลตรวจแต่ละด้าน", "Feedback by area")}</Text>
      {CRITERIA.map((k) => (
        <FadeInItem key={k} index={block++}>
          <CriterionFeedback k={k} r={report[k]} open={open.has(k)} onToggle={() => toggle(k)} />
        </FadeInItem>
      ))}

      {upgrades.length > 0 ? (
        <FadeInItem index={block++}>
          <VocabUpgrades items={upgrades} />
        </FadeInItem>
      ) : null}

      {rung ? (
        <FadeInItem index={block++}>
          <ScoreRung rung={rung} />
        </FadeInItem>
      ) : null}

      {points.length > 0 ? (
        <FadeInItem index={block++}>
          <KeyLearning points={points} />
        </FadeInItem>
      ) : null}

      <LuxuryPressable style={[styles.btn]} onPress={onRetry}>
        <Text style={styles.btnText}>{t("ลองข้อนี้อีกครั้ง", "Try this one again")}</Text>
      </LuxuryPressable>
      <LuxuryPressable style={[styles.btnGhost]} onPress={onDone}>
        <Text style={styles.btnGhostText}>{t("กลับไปเลือกข้ออื่น", "Pick another task")}</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 48 },
  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#111",
    padding: 16,
  },
  score: { fontSize: 28, fontWeight: "900", color: "#004AAD" },
  scoreMeta: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#6B7280" },
  bars: { marginTop: 14, gap: 12 },
  barRow: {},
  barHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  barLabel: { fontSize: 14, fontWeight: "800", color: "#111" },
  barPct: { fontSize: 14, fontWeight: "900" },
  barTrack: { marginTop: 6, height: 10, borderRadius: 5, backgroundColor: "#EEF0F4", overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  photo: {
    marginTop: 14,
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#E5E7EB",
  },
  sectionTitle: { marginTop: 22, fontSize: 18, fontWeight: "900", color: "#111" },
  card: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E6EF",
    padding: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111", marginBottom: 8 },
  passage: { fontSize: 16, lineHeight: 26, color: "#1F2937" },
  markGood: {
    backgroundColor: "#DCFCE7",
    color: "#14532D",
    textDecorationLine: "underline",
    textDecorationColor: "#16A34A",
  },
  markGoodSel: { backgroundColor: "#86EFAC" },
  markFix: {
    backgroundColor: "#FEF3C7",
    color: "#78350F",
    textDecorationLine: "underline",
    textDecorationColor: "#F59E0B",
  },
  markFixSel: { backgroundColor: "#FCD34D" },
  legend: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 },
  legendChip: { fontSize: 11, fontWeight: "800", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  legendHint: { fontSize: 11, color: "#6B7280" },
  noteBox: { marginTop: 10, borderRadius: 10, borderLeftWidth: 4, padding: 10 },
  noteGood: { backgroundColor: "#F0FDF4", borderLeftColor: "#16A34A" },
  noteFix: { backgroundColor: "#FFFBEB", borderLeftColor: "#F59E0B" },
  noteHead: { fontSize: 12, fontWeight: "900", color: "#111" },
  noteText: { marginTop: 4, fontSize: 14, lineHeight: 21, color: "#1F2937" },
  critHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  critTitle: { flex: 1, fontSize: 15, fontWeight: "900", color: "#111" },
  critScore: { fontSize: 13, fontWeight: "900", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  chev: { fontSize: 14, color: "#9CA3AF", width: 14, textAlign: "center" },
  leadBox: { marginTop: 10, borderRadius: 10, padding: 10 },
  leadText: { fontSize: 14, lineHeight: 21, fontWeight: "600", color: "#1F2937" },
  bullets: { marginTop: 10, gap: 10 },
  bulletItem: { flexDirection: "row", gap: 8 },
  bulletDot: { fontSize: 16, lineHeight: 21, color: "#004AAD", fontWeight: "900" },
  bulletBody: { flex: 1 },
  bulletText: { fontSize: 14, lineHeight: 21, color: "#1F2937" },
  topicChip: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "800",
    color: "#004AAD",
    backgroundColor: "#E8F0FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 4,
  },
  excerpt: { marginTop: 4, fontSize: 13, color: "#B91C1C", fontWeight: "600" },
  excerptInline: { color: "#B91C1C", textDecorationLine: "line-through" },
  suggestion: { marginTop: 2, fontSize: 13, color: "#15803D", fontWeight: "700" },
  suggestionTh: { marginTop: 2, fontSize: 12, color: "#6B7280", lineHeight: 18 },
  perfectBox: { marginTop: 12, borderRadius: 10, backgroundColor: "#F5F3FF", padding: 10, gap: 6 },
  perfectHead: { fontSize: 13, fontWeight: "900", color: "#5B21B6" },
  exampleRow: { borderLeftWidth: 3, borderLeftColor: "#A78BFA", paddingLeft: 8 },
  exampleEn: { fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 20 },
  exampleTh: { fontSize: 12, color: "#6B7280", lineHeight: 18 },
  vocabRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F1F3F8" },
  vocabPair: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  vocabOld: { fontSize: 14, color: "#6B7280", textDecorationLine: "line-through" },
  vocabArrow: { fontSize: 14, color: "#9CA3AF" },
  vocabNew: { fontSize: 15, fontWeight: "900", color: "#15803D" },
  vocabMeaning: { marginTop: 2, fontSize: 13, color: "#374151" },
  vocabExample: { marginTop: 2, fontSize: 13, color: "#6B7280", fontStyle: "italic" },
  rungHead: { fontSize: 13, color: "#374151", marginBottom: 8, lineHeight: 19 },
  changeNew: { color: "#15803D", fontWeight: "800" },
  changeNote: { marginTop: 2, fontSize: 13, color: "#4B5563", lineHeight: 19 },
  btn: {
    marginTop: 22,
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
