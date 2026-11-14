import { useFocusEffect } from "expo-router";
import type { Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { MascotLoader, ScreenLoader } from "../../components/MascotLoader";
import { FadeInItem, ResultMascot } from "../../components/Motion";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import {
  buildDailyPlan,
  clearTodayPlan,
  DAILY_MINUTES,
  DAILY_SKILL_META,
  dailyItemHref,
  fetchPlanResults,
  summarizeDay,
  type ItemResult,
  loadHistory,
  loadTodayPlan,
  recipeCount,
  recordHistory,
  saveTodayPlan,
  streakDays,
  type DailyHistoryDay,
  type DailyMinutes,
  type DailyPlan,
} from "../../lib/daily-practice";
import { sfxReveal } from "../../lib/exam-sfx-mobile";
import { difficultyLabel, roundLabel, useI18n } from "../../lib/i18n";

export default function DailyPracticeScreen() {
  const { t } = useI18n();
  const { push } = useLuxuryRouter();
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [results, setResults] = useState<Map<string, ItemResult>>(() => new Map());
  const done = new Set(results.keys());
  // open the report automatically the moment the last item gets finished
  const wasComplete = useRef<boolean | null>(null);
  const [history, setHistory] = useState<DailyHistoryDay[]>([]);

  useEffect(() => {
    void (async () => {
      const [p, h] = await Promise.all([loadTodayPlan(), loadHistory()]);
      setPlan(p);
      setHistory(h);
      setLoading(false);
    })();
  }, []);

  // Re-check progress whenever the learner comes back from an exercise.
  useFocusEffect(
    useCallback(() => {
      if (!plan) return;
      let cancelled = false;
      void fetchPlanResults(plan).then(async (r) => {
        if (cancelled) return;
        setResults(r);
        const summary = summarizeDay(plan, r);
        setHistory(await recordHistory(summary));
        const complete = summary.done >= summary.total;
        if (wasComplete.current === false && complete) push("/daily/report" as Href);
        wasComplete.current = complete;
      });
      return () => {
        cancelled = true;
      };
    }, [plan]),
  );

  const start = async (minutes: DailyMinutes) => {
    setError(null);
    setBuilding(true);
    try {
      const next = await buildDailyPlan(minutes);
      await saveTodayPlan(next);
      setResults(new Map());
      wasComplete.current = false;
      setPlan(next);
      setHistory(await recordHistory({ dateIso: next.dateIso, minutes, done: 0, total: next.items.length }));
      sfxReveal();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "no-content"
          ? t("ยังไม่มีข้อสอบที่เปิดให้คุณทำได้", "No practice content is available for your plan yet.")
          : t("สร้างชุดฝึกไม่สำเร็จ ลองใหม่อีกครั้ง", "Couldn't build today's practice. Please try again."),
      );
    } finally {
      setBuilding(false);
    }
  };

  const reset = async () => {
    await clearTodayPlan();
    setPlan(null);
    setResults(new Map());
    wasComplete.current = null;
  };

  if (loading) return <ScreenLoader />;

  if (building) {
    return (
      <View style={styles.center}>
        <MascotLoader label={t("กำลังสุ่มข้อที่คุณยังไม่เคยทำ", "Picking questions you haven't done")} />
      </View>
    );
  }

  const streak = streakDays(history);
  const fullDays = history.filter((h) => h.total > 0 && h.done >= h.total).length;

  // -------------------------------------------------------------- pick minutes
  if (!plan) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <FadeInItem index={0}>
          <Text style={styles.title}>{t("วันนี้มีเวลากี่นาที?", "How many minutes do you have today?")}</Text>
          <Text style={styles.sub}>
            {t(
              "เราจะสุ่มข้อสอบที่คุณยังไม่เคยทำ ทั้งบนเว็บและในแอป มาให้พอดีกับเวลา",
              "We'll pick a random mix you've never done (on web or app) to fit your time.",
            )}
          </Text>
        </FadeInItem>

        {DAILY_MINUTES.map((m, i) => (
          <FadeInItem key={m} index={i + 1} step={60}>
            <LuxuryPressable style={styles.minuteRow} sound="submit" scaleTo={0.97} onPress={() => void start(m)}>
              <Text style={styles.minuteNum}>{m === 60 ? t("1 ชม.", "1 hr") : `${m}`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.minuteLabel}>{m === 60 ? t("1 ชั่วโมง", "1 hour") : t(`${m} นาที`, `${m} minutes`)}</Text>
                <Text style={styles.minuteSub}>{t(`ประมาณ ${recipeCount(m)} ข้อ`, `about ${recipeCount(m)} questions`)}</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </LuxuryPressable>
          </FadeInItem>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {history.some((h) => h.avgPct != null) ? (
          <FadeInItem index={6}>
            <Text style={styles.pastTitle}>{t("รายงานย้อนหลัง", "Past reports")}</Text>
            {history
              .filter((h) => h.avgPct != null)
              .slice(0, 7)
              .map((h) => (
                <LuxuryPressable
                  key={h.dateIso}
                  style={styles.pastRow}
                  sound="none"
                  scaleTo={0.98}
                  onPress={() => push(`/daily/report?date=${h.dateIso}` as Href)}
                >
                  <Text style={styles.pastDate}>{h.dateIso}</Text>
                  <Text style={styles.pastMeta}>
                    {t(`${h.done}/${h.total} ข้อ`, `${h.done}/${h.total}`)} · {Math.round(h.avgPct ?? 0)}%
                  </Text>
                  <Text style={styles.chev}>›</Text>
                </LuxuryPressable>
              ))}
          </FadeInItem>
        ) : null}
        {fullDays > 0 ? (
          <FadeInItem index={8}>
            <Text style={styles.history}>
              {t(`ฝึกครบแล้ว ${fullDays} วัน`, `Completed ${fullDays} day(s)`)}
              {streak > 1 ? t(` · ต่อเนื่อง ${streak} วัน 🔥`, ` · ${streak}-day streak 🔥`) : ""}
            </Text>
          </FadeInItem>
        ) : null}
      </ScrollView>
    );
  }

  // -------------------------------------------------------------- today's plan
  const finished = plan.items.filter((i) => done.has(i.contentKey)).length;
  const total = plan.items.length;
  const next = plan.items.find((i) => !done.has(i.contentKey));
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <FadeInItem index={0} style={styles.hero}>
        <Text style={styles.heroLabel}>
          {plan.minutes === 60 ? t("1 ชั่วโมง", "1 hour") : t(`${plan.minutes} นาที`, `${plan.minutes} minutes`)}
          {streak > 1 ? t(` · ต่อเนื่อง ${streak} วัน 🔥`, ` · ${streak}-day streak 🔥`) : ""}
        </Text>
        <Text style={styles.heroTitle}>{t(`ทำแล้ว ${finished}/${total} ข้อ`, `${finished}/${total} done`)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </FadeInItem>

      {next ? (
        <LuxuryPressable style={styles.nextBtn} sound="submit" onPress={() => push(dailyItemHref(next) as Href)}>
          <Text style={styles.nextBtnText}>
            {finished === 0 ? t("เริ่มเลย →", "Start →") : t("ข้อถัดไป →", "Next question →")}
          </Text>
        </LuxuryPressable>
      ) : (
        <Animated.View entering={ZoomIn.duration(420)}>
          <ResultMascot ratio={1} message={t("เก่งมาก! ฝึกครบแล้ววันนี้ 🎉", "Great job! Today's practice is done 🎉")} />
        </Animated.View>
      )}

      {finished > 0 ? (
        <LuxuryPressable style={styles.reportBtn} sound="tap" onPress={() => push("/daily/report" as Href)}>
          <Text style={styles.reportBtnText}>
            {next ? t("📊 ดูรายงานถึงตอนนี้", "📊 Report so far") : t("📊 ดูรายงานวันนี้", "📊 View today's report")}
          </Text>
        </LuxuryPressable>
      ) : null}

      {plan.items.map((it, i) => {
        const meta = DAILY_SKILL_META[it.skill];
        const isDone = done.has(it.contentKey);
        const isNext = next?.contentKey === it.contentKey;
        const where = [
          roundLabel(t, it.round),
          difficultyLabel(t, it.difficulty),
          t(`ชุดที่ ${it.setNumber}`, `Set ${it.setNumber}`),
          it.sub != null ? (it.skill === "reading" ? t(`ข้อสอบ ${it.sub}`, `Exam ${it.sub}`) : t(`บทความ ${it.sub}`, `Passage ${it.sub}`)) : null,
        ].filter(Boolean).join(" · ");
        return (
          <FadeInItem key={it.contentKey} index={i + 1} step={35}>
            <LuxuryPressable
              style={[styles.itemRow, isDone && styles.itemDone, isNext && styles.itemNext]}
              sound="none"
              scaleTo={0.98}
              onPress={() => push(dailyItemHref(it) as Href)}
            >
              <Text style={styles.itemEmoji}>{meta.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{t(meta.th, meta.en)}</Text>
                <Text style={styles.itemSub}>
                  {where}
                  {it.repeat ? t(" · ทบทวน", " · review") : ""}
                </Text>
              </View>
              <Text style={[styles.itemStatus, isDone && styles.itemStatusDone]}>
                {isDone ? `✓ ${Math.round(results.get(it.contentKey)!.pct)}%` : "›"}
              </Text>
            </LuxuryPressable>
          </FadeInItem>
        );
      })}

      <LuxuryPressable style={styles.resetBtn} onPress={() => void reset()}>
        <Text style={styles.resetText}>{t("เปลี่ยนเวลา / สุ่มชุดใหม่", "Change time / new mix")}</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F4F6FB" },
  title: { fontSize: 24, fontWeight: "900", color: "#111" },
  sub: { fontSize: 13, color: "#6B7280", marginTop: 6, marginBottom: 18, lineHeight: 19 },
  minuteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#111",
    padding: 16,
    marginBottom: 10,
  },
  minuteNum: {
    width: 56,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    color: "#004AAD",
    backgroundColor: "#FFF3B0",
    borderRadius: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  minuteLabel: { fontSize: 17, fontWeight: "900", color: "#111" },
  minuteSub: { fontSize: 12, color: "#6B7280", marginTop: 2, fontWeight: "700" },
  chev: { fontSize: 22, color: "#C4CBD8" },
  error: { color: "#b91c1c", fontWeight: "700", marginTop: 12, textAlign: "center" },
  history: { marginTop: 16, textAlign: "center", color: "#004AAD", fontWeight: "800" },
  hero: { backgroundColor: "#004AAD", borderRadius: 20, padding: 18, marginBottom: 14 },
  heroLabel: { color: "#cde0ff", fontSize: 12, fontWeight: "800" },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 4 },
  track: { marginTop: 12, height: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: "#FFCC00" },
  nextBtn: {
    backgroundColor: "#FFCC00",
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#111",
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  nextBtnText: { fontSize: 17, fontWeight: "900", color: "#111" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E7EAF1",
    padding: 14,
    marginBottom: 8,
  },
  itemNext: { borderColor: "#004AAD" },
  itemDone: { backgroundColor: "#ECFDF5", borderColor: "#6EE7B7" },
  itemEmoji: { fontSize: 22 },
  itemTitle: { fontSize: 15, fontWeight: "900", color: "#111" },
  itemSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  itemStatus: { fontSize: 20, color: "#C4CBD8", fontWeight: "900" },
  itemStatusDone: { color: "#059669" },
  reportBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#004AAD",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  reportBtnText: { fontSize: 15, fontWeight: "900", color: "#004AAD" },
  pastTitle: { fontSize: 15, fontWeight: "900", color: "#111", marginTop: 18, marginBottom: 8 },
  pastRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E7EAF1",
    padding: 12,
    marginBottom: 6,
  },
  pastDate: { flex: 1, fontSize: 14, fontWeight: "800", color: "#111" },
  pastMeta: { fontSize: 13, fontWeight: "800", color: "#004AAD" },
  resetBtn: { marginTop: 14, alignItems: "center", paddingVertical: 12 },
  resetText: { color: "#004AAD", fontWeight: "800" },
});
