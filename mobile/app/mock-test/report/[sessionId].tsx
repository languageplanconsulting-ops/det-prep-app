import { useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { MascotLoader, ScreenLoader } from "../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../components/Motion";
import {
  Card,
  CoachTips,
  HistoryRow,
  SkillBar,
  TargetCell,
  TargetGrid,
  TrendBars,
  reportStyles as rs,
  scoreColor,
} from "../../../components/mock/ReportUi";
import { Note, PrimaryButton } from "../../../components/mock/TaskUi";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { useScoreReveal } from "../../../hooks/useScoreReveal";
import { useI18n } from "../../../lib/i18n";
import { fetchMockHistory, fetchMockReport, fetchMockResultStatus, fetchMockSets } from "../../../lib/mock-api";
import {
  SKILL_META,
  SKILL_PRACTICE_HREF,
  cefrFromTotal,
  fmtDateTime,
  mockRecommendations,
  scoredRows,
  skillWeightRows,
  taskAverages,
  taskLabel,
  type MockFixedResult,
  type MockSkill,
} from "../../../lib/mock-test";

const POLL_MS = 5000;

const WAIT_LINES: { th: string; en: string }[] = [
  { th: "กำลังรวมคะแนนทั้ง 20 ข้อ…", en: "Adding up all 20 steps…" },
  { th: "กำลังตรวจข้อเขียนของคุณ…", en: "Checking your writing…" },
  { th: "กำลังฟังคำตอบที่คุณพูด…", en: "Reviewing your spoken answers…" },
  { th: "กำลังคำนวณคะแนนรายทักษะ…", en: "Working out your skill scores…" },
  { th: "ใกล้เสร็จแล้ว กำลังเตรียมรายงาน…", en: "Almost there — preparing your report…" },
];

/** Waits for background grading, then shows the full mock report. */
export default function MockReportScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const id = String(sessionId);
  const { t, lang } = useI18n();
  const { push, replace } = useLuxuryRouter();
  const [phase, setPhase] = useState<"checking" | "waiting" | "ready" | "not-finished" | "error">("checking");
  const [result, setResult] = useState<MockFixedResult | null>(null);
  const [setNames, setSetNames] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<MockFixedResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [line, setLine] = useState(0);
  const [waited, setWaited] = useState(0);
  const alive = useRef(true);

  useScoreReveal(phase === "ready" && !!result);

  const fetchReport = useCallback(async () => {
    const [{ result: r }, sets, hist] = await Promise.all([
      fetchMockReport(id),
      fetchMockSets().catch(() => []),
      fetchMockHistory().catch(() => []),
    ]);
    if (!alive.current) return;
    setResult(r);
    setSetNames(Object.fromEntries(sets.map((s) => [s.id, s.name])));
    setHistory(hist);
    setPhase("ready");
  }, [id]);

  useEffect(() => {
    alive.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const st = await fetchMockResultStatus(id);
        if (!alive.current) return;
        if (st.ready) {
          await fetchReport();
          return;
        }
        if (st.sessionStatus && st.sessionStatus !== "completed") {
          setPhase("not-finished");
          return;
        }
        setPhase("waiting");
      } catch (e) {
        if (!alive.current) return;
        // A transient error on the poller is fine; keep waiting unless it's a hard 404.
        const msg = e instanceof Error ? e.message : "";
        if (msg === "Session not found") {
          setErrorMsg(msg);
          setPhase("error");
          return;
        }
        setPhase((p) => (p === "checking" ? "waiting" : p));
      }
      timer = setTimeout(() => void poll(), POLL_MS);
    };
    void poll();
    return () => {
      alive.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [id, fetchReport]);

  useEffect(() => {
    if (phase !== "waiting") return;
    const a = setInterval(() => setLine((n) => (n + 1) % WAIT_LINES.length), 2800);
    const b = setInterval(() => setWaited((n) => n + 1), 1000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [phase]);

  const rows = useMemo(() => scoredRows(result?.report_payload?.responses), [result]);

  if (phase === "checking") return <ScreenLoader label={t("กำลังเปิดผลสอบ…", "Opening your results…")} />;

  if (phase === "waiting") {
    const l = WAIT_LINES[line]!;
    return (
      <View style={[rs.screen, { justifyContent: "center", padding: 20, gap: 14 }]}>
        <MascotLoader grading label={t(l.th, l.en)} />
        <Note>
          {t(
            "กำลังตรวจข้อเขียนและข้อพูดของคุณ ปกติใช้เวลาไม่กี่นาที — ออกจากหน้านี้ได้ ผลจะรออยู่ที่ศูนย์ข้อสอบจำลอง",
            "Your writing and speaking answers are being scored — usually a few minutes. You can leave; the report will wait for you in the mock center.",
          )}
        </Note>
        <Text style={[rs.muted, { textAlign: "center" }]}>
          {t(`รอมาแล้ว ${Math.floor(waited / 60)}:${String(waited % 60).padStart(2, "0")}`, `Waiting ${Math.floor(waited / 60)}:${String(waited % 60).padStart(2, "0")}`)}
        </Text>
        <PrimaryButton tone="ghost" label={t("กลับศูนย์ข้อสอบ", "Back to the mock center")} onPress={() => replace("/mock-test" as Href)} />
      </View>
    );
  }

  if (phase === "not-finished") {
    return (
      <View style={[rs.screen, { justifyContent: "center", padding: 20, gap: 12 }]}>
        <Note tone="warn">{t("การสอบชุดนี้ยังทำไม่จบ ทำต่อให้ครบก่อนจึงจะมีผล", "This mock isn't finished yet — complete it to get your report.")}</Note>
        <PrimaryButton label={t("ทำต่อ", "Resume")} onPress={() => replace(`/mock-test/run/${id}` as Href)} />
      </View>
    );
  }

  if (phase === "error" || !result) {
    return (
      <View style={[rs.screen, { justifyContent: "center", padding: 20, gap: 12 }]}>
        <Note tone="error">{errorMsg ?? t("เปิดผลสอบไม่สำเร็จ", "Could not open this report")}</Note>
        <PrimaryButton tone="ghost" label={t("กลับศูนย์ข้อสอบ", "Back to the mock center")} onPress={() => replace("/mock-test" as Href)} />
      </View>
    );
  }

  const total = Math.round(Number(result.actual_total ?? 0));
  const skills: Record<MockSkill, number> = {
    listening: Math.round(Number(result.actual_listening ?? 0)),
    speaking: Math.round(Number(result.actual_speaking ?? 0)),
    reading: Math.round(Number(result.actual_reading ?? 0)),
    writing: Math.round(Number(result.actual_writing ?? 0)),
  };
  const targets = {
    total: Math.round(Number(result.target_total ?? 0)),
    listening: Math.round(Number(result.target_listening ?? 0)),
    speaking: Math.round(Number(result.target_speaking ?? 0)),
    reading: Math.round(Number(result.target_reading ?? 0)),
    writing: Math.round(Number(result.target_writing ?? 0)),
  };
  const hasTargets = Object.values(targets).some((v) => v > 0);
  const weakest = (Object.entries(skills) as [MockSkill, number][]).sort((a, b) => a[1] - b[1]).slice(0, 2);
  const lowTasks = new Set([...taskAverages(rows)].sort((a, b) => a.average - b.average).slice(0, 3).map((x) => x.task));
  const steps = [...(result.report_payload?.responses ?? [])].sort((a, b) => a.step_index - b.step_index);
  const tips = mockRecommendations(t, total, targets.total, rows);
  const setName = setNames[result.set_id] ?? "Mock";
  const past = [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const prevIdx = past.findIndex((h) => h.session_id === result.session_id) - 1;
  const prev = prevIdx >= 0 ? past[prevIdx] : null;
  const delta = prev ? total - Math.round(prev.actual_total) : null;
  const message =
    total >= 120
      ? t("ยอดเยี่ยม! ระดับนี้พร้อมยื่นหลายมหาวิทยาลัยแล้ว 🎉", "Excellent — this level meets many university requirements 🎉")
      : total >= 95
        ? t("ทำได้ดี! เก็บจุดอ่อนอีกนิดคะแนนจะขยับเร็ว 💪", "Good work! Fix a couple of weak spots and you'll climb fast 💪")
        : t("ไม่เป็นไร ดูจุดที่ควรฝึกด้านล่าง แล้วลองใหม่เดือนหน้า", "That's okay — see what to practise below and try again next month.");

  return (
    <ScrollView style={rs.screen} contentContainerStyle={rs.content}>
      <ResultMascot ratio={total / 160} message={message} />

      <FadeInItem index={0} style={rs.hero}>
        <Text style={rs.heroLabel}>{t("คะแนนประมาณการ DET · ข้อสอบจำลอง 20 ข้อ", "ESTIMATED DET SCORE · 20-STEP MOCK")}</Text>
        <AnimatedScore value={total} max={160} format={(n) => String(n)} style={rs.heroScore} />
        <Text style={rs.heroOf}>/ 160</Text>
        <View style={rs.heroChips}>
          <View style={rs.chip}>
            <Text style={rs.chipText}>CEFR {cefrFromTotal(total)}</Text>
          </View>
          {delta != null ? (
            <View style={[rs.chip, rs.chipGhost]}>
              <Text style={[rs.chipText, rs.chipGhostText]}>
                {delta >= 0 ? t(`▲ +${delta} จากครั้งก่อน`, `▲ +${delta} vs last time`) : t(`▼ ${delta} จากครั้งก่อน`, `▼ ${delta} vs last time`)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={rs.heroDate}>
          {setName} · {fmtDateTime(result.created_at, lang)}
        </Text>
      </FadeInItem>

      <FadeInItem index={1} style={rs.weakCard}>
        <Text style={rs.weakLabel}>{t("ทำอะไรต่อให้คะแนนขึ้นเร็วสุด", "FASTEST WAY TO A HIGHER SCORE")}</Text>
        <Text style={rs.weakTitle}>
          {t("จุดอ่อน: ", "Focus on: ")}
          {weakest.map(([k]) => t(SKILL_META[k].th, SKILL_META[k].en)).join(t(" และ ", " and "))}
        </Text>
        <Text style={rs.weakSub}>{t("เก็บ 2 ทักษะนี้ก่อน จะขึ้นถึงเป้าได้เร็วสุด", "Lift these two skills first — it's the quickest route to your goal.")}</Text>
        <View style={rs.row}>
          {weakest.map(([k], i) => (
            <LuxuryPressable
              key={k}
              style={[rs.weakBtn, { flex: 1 }, i > 0 ? rs.weakBtnAlt : null]}
              onPress={() => push(SKILL_PRACTICE_HREF[k] as Href)}
            >
              <Text style={[rs.weakBtnText, i > 0 ? rs.weakBtnTextAlt : null]}>
                {SKILL_META[k].emoji} {t(`ฝึก${SKILL_META[k].th}`, `Practise ${SKILL_META[k].en}`)} →
              </Text>
            </LuxuryPressable>
          ))}
        </View>
      </FadeInItem>

      {hasTargets ? (
        <FadeInItem index={2}>
          <TargetGrid>
            <TargetCell label={t("รวม", "Total")} actual={total} target={targets.total} primary />
            {(["listening", "speaking", "reading", "writing"] as MockSkill[]).map((k) => (
              <TargetCell key={k} label={t(SKILL_META[k].th, SKILL_META[k].en)} actual={skills[k]} target={targets[k]} />
            ))}
          </TargetGrid>
        </FadeInItem>
      ) : null}

      <Card index={3} title={t("คะแนนรายทักษะ", "Skill scores")}>
        {(["speaking", "listening", "reading", "writing"] as MockSkill[]).map((k) => (
          <SkillBar key={k} skill={k} score={skills[k]} />
        ))}
      </Card>

      <Card index={4} title={t("คะแนนแต่ละทักษะมาจากไหน", "How each skill is scored")}>
        {(["speaking", "listening", "reading", "writing"] as MockSkill[]).map((k) => (
          <View key={k} style={{ gap: 2, marginBottom: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: SKILL_META[k].color }}>
              {SKILL_META[k].emoji} {t(SKILL_META[k].th, SKILL_META[k].en)} · {skills[k]}
            </Text>
            {skillWeightRows(k, rows).map((r) => (
              <View key={`${k}-${r.taskType}`} style={rs.line}>
                <View style={{ flex: 1 }}>
                  <Text style={rs.lineLabel}>{taskLabel(t, r.taskType)}</Text>
                  <Text style={rs.lineSub}>
                    {t(`น้ำหนัก ${r.pct}% · ข้อ ${r.steps}`, `${r.pct}% weight · step ${r.steps}`)}
                  </Text>
                </View>
                <Text style={[rs.lineScore, { color: scoreColor(r.score) }]}>{r.score}</Text>
              </View>
            ))}
          </View>
        ))}
      </Card>

      <CoachTips index={5} tips={tips} />

      {steps.length ? (
        <Card index={6} title={t(`ทบทวนทีละข้อ (${steps.length} ข้อ)`, `Step by step (${steps.length})`)}>
          {steps.map((s) => {
            const review = lowTasks.has(s.task_type);
            const sc = typeof s.score === "number" ? Math.round(s.score) : null;
            return (
              <View key={s.step_index} style={rs.line}>
                <View style={{ flex: 1 }}>
                  <Text style={rs.lineLabel}>
                    {t(`ข้อ ${s.step_index}`, `Step ${s.step_index}`)} · {taskLabel(t, s.task_type)}
                  </Text>
                  {review ? <Text style={[rs.lineSub, { color: "#D97706" }]}>{t("ควรทบทวน", "Worth reviewing")}</Text> : null}
                </View>
                <Text style={[rs.lineScore, { color: sc == null ? "#9CA3AF" : scoreColor(sc) }]}>{sc ?? "…"}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {past.length > 1 ? (
        <Card index={7} title={t("พัฒนาการของคุณ", "Your progress")}>
          <TrendBars scores={past.slice(-8).map((h) => Math.round(h.actual_total))} />
          {[...past]
            .reverse()
            .slice(0, 5)
            .map((h) => (
              <HistoryRow
                key={h.session_id}
                title={setNames[h.set_id] ?? "Mock"}
                sub={`${fmtDateTime(h.created_at, lang)} · L${Math.round(h.actual_listening)} S${Math.round(h.actual_speaking)} R${Math.round(h.actual_reading)} W${Math.round(h.actual_writing)}`}
                score={Math.round(h.actual_total)}
                onPress={h.session_id === result.session_id ? undefined : () => push(`/mock-test/report/${h.session_id}` as Href)}
              />
            ))}
        </Card>
      ) : null}

      <View style={{ gap: 10 }}>
        <PrimaryButton label={t("กลับศูนย์ข้อสอบจำลอง", "Back to the mock center")} onPress={() => replace("/mock-test" as Href)} />
        <PrimaryButton tone="ghost" label={t("ไปหน้าฝึก", "Go to practice")} onPress={() => replace("/(tabs)" as Href)} />
      </View>
    </ScrollView>
  );
}
