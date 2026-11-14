import { useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { ScreenLoader } from "../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../components/Motion";
import { Card, HistoryRow, SkillBar, TrendBars, reportStyles as rs, scoreColor } from "../../../components/mock/ReportUi";
import { C, Note, PrimaryButton } from "../../../components/mock/TaskUi";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { useScoreReveal } from "../../../hooks/useScoreReveal";
import { fitbPrefix } from "../../../lib/campus-fitb";
import { useI18n } from "../../../lib/i18n";
import { fetchMiniHistory, fetchMiniReport } from "../../../lib/mock-api";
import {
  MINI_BREAKDOWN,
  MINI_PRACTICE_NOTE,
  SKILL_META,
  SKILL_PRACTICE_HREF,
  cefrFromTotal,
  fmtDateTime,
  pickBilingual,
  taskLabel,
  type MiniResponseEntry,
  type MiniResult,
  type MockSkill,
  type MockStepItem,
} from "../../../lib/mock-test";

type T = (th: string, en: string) => string;

/** Objective answer review lines for one step (what you answered vs the key). */
function objectiveLines(item: MockStepItem, resp: MiniResponseEntry | undefined): { you: string; key: string; ok: boolean }[] {
  const a = (resp?.answer ?? {}) as Record<string, unknown>;
  const c = (item.content ?? {}) as Record<string, unknown>;
  if (item.task_type === "dictation") {
    const you = String(a.answer ?? "");
    const key = String(c.reference_sentence ?? "");
    return [{ you, key, ok: you.trim().toLowerCase() === key.trim().toLowerCase() }];
  }
  if (item.task_type === "fill_in_blanks") {
    const words = Array.isArray(c.missingWords) ? (c.missingWords as { correctWord?: string; prefix_length?: number }[]) : [];
    const typed = Array.isArray(a.answers) ? (a.answers as unknown[]).map((x) => String(x ?? "")) : [];
    return words.map((w, i) => {
      const correct = String(w.correctWord ?? "");
      const { prefix } = fitbPrefix(correct, Number(w.prefix_length ?? 1));
      const you = typed[i]?.trim() ? `${prefix}${typed[i]!.trim()}` : "";
      return { you, key: correct, ok: you.toLowerCase() === correct.toLowerCase() };
    });
  }
  if (Array.isArray(a.selected_answers) && Array.isArray(a.correct_answers)) {
    const sel = (a.selected_answers as unknown[]).map((x) => String(x ?? ""));
    const cor = (a.correct_answers as unknown[]).map((x) => String(x ?? ""));
    return cor.map((key, i) => ({ you: sel[i] ?? "", key, ok: (sel[i] ?? "").trim().toLowerCase() === key.trim().toLowerCase() }));
  }
  return [];
}

function StepReview({ item, resp, t, lang }: { item: MockStepItem; resp?: MiniResponseEntry; t: T; lang: "th" | "en" }) {
  const [open, setOpen] = useState(false);
  const score = typeof resp?.score === "number" ? Math.round(resp.score) : null;
  const points = resp?.review?.improvementPoints ?? [];
  const lines = points.length ? [] : objectiveLines(item, resp);
  const text = String(((resp?.answer ?? {}) as Record<string, unknown>).text ?? "");
  const summary = lang === "th" ? resp?.review?.summaryTh : resp?.review?.summaryEn;
  return (
    <View style={st.step}>
      <LuxuryPressable style={st.stepHead} sound="none" scaleTo={0.99} onPress={() => setOpen((o) => !o)}>
        <Text style={st.stepTitle}>
          {t(`ข้อ ${item.step_index}`, `Step ${item.step_index}`)} · {taskLabel(t, item.task_type)}
        </Text>
        <View style={[st.badge, { backgroundColor: score == null ? "#9CA3AF" : scoreColor(score) }]}>
          <Text style={st.badgeText}>{score ?? "—"}</Text>
        </View>
        <Text style={st.chev}>{open ? "▴" : "▾"}</Text>
      </LuxuryPressable>
      {open ? (
        <View style={st.stepBody}>
          {text ? <Text style={st.answerText}>“{text}”</Text> : null}
          {summary ? <Text style={rs.muted}>{summary}</Text> : null}
          {points.slice(0, 5).map((p, i) => (
            <Text key={i} style={st.point}>
              • {(lang === "th" ? p.th : p.en) || p.en || p.th}
            </Text>
          ))}
          {lines.slice(0, 12).map((l, i) => (
            <View key={i} style={st.objLine}>
              <Text style={[st.objMark, { color: l.ok ? C.green : C.red }]}>{l.ok ? "✓" : "✗"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.objYou}>
                  {t("คุณตอบ: ", "You: ")}
                  {l.you || "—"}
                </Text>
                {!l.ok ? (
                  <Text style={st.objKey}>
                    {t("คำตอบ: ", "Answer: ")}
                    {l.key}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          {!text && !points.length && !lines.length ? <Text style={rs.muted}>{t("ไม่มีรายละเอียดเพิ่มเติม", "No further detail")}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Mini diagnosis report: estimated DET score, skills, focus and step review. */
export default function MiniReportScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const id = String(sessionId);
  const { t, lang } = useI18n();
  const { push, replace } = useLuxuryRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MiniResult | null>(null);
  const [items, setItems] = useState<MockStepItem[]>([]);
  const [history, setHistory] = useState<MiniResult[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useScoreReveal(!!result);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rep, hist] = await Promise.all([fetchMiniReport(id), fetchMiniHistory().catch(() => [])]);
      setResult(rep.result);
      setItems((rep.stepItems ?? []).slice().sort((a, b) => a.step_index - b.step_index));
      setHistory(hist);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ScreenLoader label={t("กำลังสรุปผล…", "Building your report…")} />;
  if (error || !result) {
    return (
      <View style={[rs.screen, { justifyContent: "center", padding: 20, gap: 12 }]}>
        <Note tone="error">{t("เปิดผลไม่สำเร็จ", "Could not open this report")}</Note>
        <PrimaryButton label={t("ลองอีกครั้ง", "Try again")} onPress={() => void load()} />
        <PrimaryButton tone="ghost" label={t("กลับศูนย์ข้อสอบ", "Back to the mock center")} onPress={() => replace("/mock-test" as Href)} />
      </View>
    );
  }

  const total = Math.round(Number(result.actual_total ?? 0));
  const skills: Record<MockSkill, number> = {
    reading: Math.round(Number(result.actual_reading ?? 0)),
    listening: Math.round(Number(result.actual_listening ?? 0)),
    writing: Math.round(Number(result.actual_writing ?? 0)),
    speaking: Math.round(Number(result.actual_speaking ?? 0)),
  };
  const sorted = (Object.entries(skills) as [MockSkill, number][]).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0]![0];
  const weakest = sorted[sorted.length - 1]![0];
  const responses = result.report_payload?.responses ?? [];
  const breakdown = result.report_payload?.scoreBreakdown ?? {};
  const level = pickBilingual(result.level_label, lang);
  const past = [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <ScrollView style={rs.screen} contentContainerStyle={rs.content}>
      <ResultMascot
        ratio={total / 160}
        message={
          total >= 110
            ? t("พื้นฐานดีมาก! ไปลองข้อสอบจำลองเต็มชุดได้เลย", "Strong base! You're ready for a full mock test.")
            : t("นี่คือจุดเริ่มต้นที่ดี ดูทักษะที่ควรฝึกก่อนด้านล่าง", "A good starting point — see which skill to train first below.")
        }
      />

      <FadeInItem index={0} style={rs.hero}>
        <Text style={rs.heroLabel}>{t("คะแนนประมาณการ · เทียบสเกล DET 10–160", "ESTIMATED SCORE · DET SCALE 10–160")}</Text>
        <AnimatedScore value={total} max={160} format={(n) => `≈${n}`} style={rs.heroScore} />
        <View style={rs.heroChips}>
          <View style={rs.chip}>
            <Text style={rs.chipText}>CEFR {cefrFromTotal(total)}</Text>
          </View>
          {level ? (
            <View style={[rs.chip, rs.chipGhost]}>
              <Text style={[rs.chipText, rs.chipGhostText]}>{level}</Text>
            </View>
          ) : null}
        </View>
        <Text style={rs.heroDate}>{fmtDateTime(result.created_at, lang)}</Text>
      </FadeInItem>

      <Card index={1} title={t("คะแนนรายทักษะ", "Skill scores")}>
        {sorted.map(([k, v]) => (
          <SkillBar key={k} skill={k} score={v} tag={k === weakest ? t("แก้ก่อน", "fix first") : undefined} />
        ))}
      </Card>

      <View style={rs.row}>
        <FadeInItem index={2} style={[st.half, { borderColor: "#A7F3D0" }]}>
          <Text style={[st.halfLabel, { color: C.green }]}>{t("จุดแข็ง", "STRENGTH")}</Text>
          <Text style={st.halfTitle}>
            {SKILL_META[strongest].emoji} {t(SKILL_META[strongest].th, SKILL_META[strongest].en)}
          </Text>
          <Text style={rs.muted}>{t("ทักษะนี้เป็นฐานที่ดี ใช้ต่อยอดทักษะอื่นได้เลย", "A solid base to build the other skills on.")}</Text>
        </FadeInItem>
        <FadeInItem index={3} style={[st.half, { borderColor: "#FCA5A5" }]}>
          <Text style={[st.halfLabel, { color: C.red }]}>{t("ควรเน้น", "FOCUS")}</Text>
          <Text style={st.halfTitle}>
            {SKILL_META[weakest].emoji} {t(SKILL_META[weakest].th, SKILL_META[weakest].en)}
          </Text>
          <Text style={rs.muted}>{t(MINI_PRACTICE_NOTE[weakest].th, MINI_PRACTICE_NOTE[weakest].en)}</Text>
        </FadeInItem>
      </View>

      <PrimaryButton
        tone="yellow"
        label={t(`เริ่มฝึก${SKILL_META[weakest].th}เลย →`, `Start practising ${SKILL_META[weakest].en} →`)}
        onPress={() => push(SKILL_PRACTICE_HREF[weakest] as Href)}
      />

      <Card index={4} title={t("ทบทวนทีละข้อ", "Step by step")}>
        <Text style={rs.muted}>{t("แตะแต่ละข้อเพื่อดูคำตอบและคำแนะนำ", "Tap a step to see your answer and feedback")}</Text>
        {items.map((it) => (
          <StepReview key={it.step_index} item={it} resp={responses.find((r) => r.step_index === it.step_index)} t={t} lang={lang} />
        ))}
      </Card>

      <Card index={5}>
        <LuxuryPressable style={st.toggle} sound="tap" onPress={() => setShowBreakdown((v) => !v)}>
          <Text style={st.toggleText}>{t("คะแนนคิดจากอะไรบ้าง", "How the score is worked out")}</Text>
          <Text style={st.chev}>{showBreakdown ? "▴" : "▾"}</Text>
        </LuxuryPressable>
        {showBreakdown ? (
          <View style={{ gap: 4 }}>
            {(["listening", "speaking", "reading", "writing"] as MockSkill[]).map((k) => (
              <View key={k} style={{ marginBottom: 6 }}>
                <Text style={{ fontWeight: "900", color: SKILL_META[k].color }}>
                  {t(SKILL_META[k].th, SKILL_META[k].en)} · {skills[k]}
                </Text>
                {MINI_BREAKDOWN[k].map((p) => (
                  <View key={p.key} style={rs.line}>
                    <Text style={rs.lineLabel}>
                      {taskLabel(t, p.key)} ({p.pct}%)
                    </Text>
                    <Text style={rs.lineScore}>{Math.round(Number(breakdown[k]?.[p.key] ?? 0))}</Text>
                  </View>
                ))}
              </View>
            ))}
            {breakdown.supporting ? (
              <View>
                <Text style={{ fontWeight: "900", color: C.ink }}>{t("คะแนนดิบแต่ละส่วน", "Raw task scores")}</Text>
                {Object.entries(breakdown.supporting).map(([k, v]) => (
                  <View key={k} style={rs.line}>
                    <Text style={rs.lineLabel}>
                      {taskLabel(t, k)}
                      {k === "real_english_word" ? t(" (ไว้ดูประกอบ ไม่คิดในสูตร)", " (for reference, not in the formula)") : ""}
                    </Text>
                    <Text style={rs.lineScore}>{Math.round(Number(v ?? 0))}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      {past.length > 1 ? (
        <Card index={6} title={t("ผลเช็กระดับที่ผ่านมา", "Past diagnoses")}>
          <TrendBars scores={past.slice(-8).map((h) => Math.round(h.actual_total))} />
          {[...past].reverse().slice(0, 5).map((h) => (
            <HistoryRow
              key={h.session_id}
              title={pickBilingual(h.level_label, lang) || t("เช็กระดับ", "Mini diagnosis")}
              sub={fmtDateTime(h.created_at, lang)}
              score={Math.round(h.actual_total)}
              onPress={h.session_id === result.session_id ? undefined : () => push(`/mock-test/mini-report/${h.session_id}` as Href)}
            />
          ))}
        </Card>
      ) : null}

      <View style={{ gap: 10 }}>
        <PrimaryButton label={t("ไปศูนย์ข้อสอบจำลอง", "Go to the mock center")} onPress={() => replace("/mock-test" as Href)} />
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  half: { flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, padding: 12, gap: 4 },
  halfLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  halfTitle: { fontSize: 15, fontWeight: "900", color: C.ink },
  step: { borderBottomWidth: 1, borderBottomColor: "#F1F3F8" },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  stepTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: C.ink },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, minWidth: 44, alignItems: "center" },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  chev: { fontSize: 14, color: "#9CA3AF", fontWeight: "900" },
  stepBody: { paddingBottom: 12, gap: 6 },
  answerText: { fontSize: 14, color: C.ink, fontStyle: "italic", lineHeight: 20 },
  point: { fontSize: 13, color: C.ink, lineHeight: 19 },
  objLine: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  objMark: { fontSize: 15, fontWeight: "900", width: 16 },
  objYou: { fontSize: 13, color: C.ink },
  objKey: { fontSize: 12, color: C.green, fontWeight: "700" },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleText: { fontSize: 15, fontWeight: "900", color: C.ink },
});
