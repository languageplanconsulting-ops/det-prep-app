import { useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { ScreenLoader } from "../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../components/Motion";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import {
  DAILY_SKILL_META,
  fetchPlanResults,
  loadHistory,
  loadTodayPlan,
  previousAverage,
  recordHistory,
  skillAverages,
  streakDays,
  summarizeDay,
  todayIso,
  type DailyHistoryDay,
  type DailyPlan,
  type DailySkill,
  type ItemResult,
} from "../../lib/daily-practice";
import { difficultyLabel, roundLabel, useI18n } from "../../lib/i18n";

const SKILL_HUB: Record<DailySkill, string> = {
  dictation: "/dictation",
  fitb: "/fitb",
  vocab: "/vocab",
  reading: "/reading",
  realword: "/realword",
};

function pctColor(p: number): string {
  if (p >= 80) return "#059669";
  if (p >= 60) return "#004AAD";
  if (p >= 40) return "#D97706";
  return "#DC2626";
}

/** Thai/English weekday + day, e.g. "ศ. 14" / "Fri 14". */
function shortDay(iso: string, lang: "th" | "en"): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { weekday: "short", day: "numeric" });
}

export default function DailyReportScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { t, lang } = useI18n();
  const { push, replace } = useLuxuryRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [results, setResults] = useState<Map<string, ItemResult>>(() => new Map());
  const [history, setHistory] = useState<DailyHistoryDay[]>([]);
  const dayIso = date && date !== todayIso() ? date : todayIso();
  const isToday = dayIso === todayIso();

  useEffect(() => {
    void (async () => {
      let h = await loadHistory();
      if (isToday) {
        const p = await loadTodayPlan();
        if (p) {
          const r = await fetchPlanResults(p);
          setPlan(p);
          setResults(r);
          // save the report so it shows up in the progress history
          h = await recordHistory(summarizeDay(p, r));
        }
      }
      setHistory(h);
      setLoading(false);
    })();
  }, [isToday]);

  const day: DailyHistoryDay | null = useMemo(() => {
    if (isToday && plan) return summarizeDay(plan, results);
    return history.find((h) => h.dateIso === dayIso) ?? null;
  }, [isToday, plan, results, history, dayIso]);

  if (loading) return <ScreenLoader label={t("กำลังสรุปผล", "Building your report")} />;

  if (!day || day.done === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>{t("ยังไม่มีผลสำหรับวันนี้", "No results for this day yet")}</Text>
        <Text style={styles.emptySub}>{t("ทำอย่างน้อย 1 ข้อแล้วกลับมาดูรายงานได้", "Finish at least one item, then come back.")}</Text>
        <LuxuryPressable style={styles.primaryBtn} onPress={() => replace("/daily" as Href)}>
          <Text style={styles.primaryBtnText}>{t("ไปหน้าฝึกประจำวัน", "Go to daily practice")}</Text>
        </LuxuryPressable>
      </View>
    );
  }

  const avg = Math.round(day.avgPct ?? 0);
  const prev = previousAverage(history, day.dateIso);
  const delta = prev == null ? null : Math.round(avg - prev);
  const streak = streakDays(history);
  const skills = (Object.entries(day.skills ?? {}) as [DailySkill, { count: number; avgPct: number }][]).sort(
    (a, b) => b[1].avgPct - a[1].avgPct,
  );
  const strongest = skills[0];
  const weakest = skills.length > 1 ? skills[skills.length - 1] : null;
  // weakest over all saved days (more stable than one day) when there is enough history
  const overall = (Object.entries(skillAverages(history)) as [DailySkill, { count: number; avgPct: number }][])
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => a[1].avgPct - b[1].avgPct)[0];
  const focus = overall?.[0] ?? weakest?.[0] ?? null;
  const last7 = [...history].filter((h) => h.avgPct != null).slice(0, 7).reverse();
  const message =
    avg >= 80
      ? t("ยอดเยี่ยม! วันนี้ทำได้ดีมาก 🎉", "Excellent work today! 🎉")
      : avg >= 60
        ? t("ทำได้ดี! อีกนิดเดียวก็ถึงระดับสูงแล้ว 💪", "Good job! You're close to the top level 💪")
        : t("ไม่เป็นไร ทุกวันที่ฝึกคือก้าวหน้า ลองทบทวนจุดที่พลาดนะ", "Every practice day counts — review what you missed.");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ResultMascot ratio={avg / 100} message={message} />

      <FadeInItem index={0} style={styles.hero}>
        <Text style={styles.heroLabel}>
          {isToday ? t("รายงานวันนี้", "Today's report") : shortDay(day.dateIso, lang)} ·{" "}
          {day.minutes === 60 ? t("1 ชั่วโมง", "1 hour") : t(`${day.minutes} นาที`, `${day.minutes} min`)}
        </Text>
        <AnimatedScore
          value={avg}
          max={100}
          format={(n) => t(`คะแนนเฉลี่ย ${n}%`, `Average ${n}%`)}
          style={styles.heroScore}
        />
        {delta != null ? (
          <Text style={[styles.delta, { color: delta >= 0 ? "#A7F3D0" : "#FECACA" }]}>
            {delta >= 0
              ? t(`▲ ดีขึ้น ${delta}% จากค่าเฉลี่ย 7 วันก่อน`, `▲ ${delta}% above your previous 7-day average`)
              : t(`▼ ต่ำกว่าค่าเฉลี่ย 7 วันก่อน ${Math.abs(delta)}%`, `▼ ${Math.abs(delta)}% below your previous 7-day average`)}
          </Text>
        ) : null}
      </FadeInItem>

      <FadeInItem index={1} style={styles.statsRow}>
        <Stat label={t("ทำแล้ว", "Done")} value={`${day.done}/${day.total}`} />
        <Stat label={t("ใช้เวลา", "Time")} value={day.spentMin != null ? t(`${Math.round(day.spentMin)} นาที`, `${Math.round(day.spentMin)} min`) : "—"} />
        <Stat label={t("ต่อเนื่อง", "Streak")} value={streak > 0 ? t(`${streak} วัน 🔥`, `${streak} day${streak > 1 ? "s" : ""} 🔥`) : "—"} />
      </FadeInItem>

      <FadeInItem index={2}>
        <Text style={styles.sectionTitle}>{t("ผลแยกตามทักษะ", "By skill")}</Text>
      </FadeInItem>
      {skills.map(([skill, v], i) => {
        const meta = DAILY_SKILL_META[skill];
        const p = Math.round(v.avgPct);
        return (
          <FadeInItem key={skill} index={i + 3} style={styles.skillRow}>
            <Text style={styles.skillEmoji}>{meta.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.skillHead}>
                <Text style={styles.skillName}>{t(meta.th, meta.en)}</Text>
                <Text style={[styles.skillPct, { color: pctColor(p) }]}>{p}%</Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${p}%`, backgroundColor: pctColor(p) }]} />
              </View>
              <Text style={styles.skillCount}>{t(`${v.count} ข้อ`, `${v.count} item${v.count > 1 ? "s" : ""}`)}</Text>
            </View>
          </FadeInItem>
        );
      })}

      {strongest || focus ? (
        <FadeInItem index={skills.length + 3} style={styles.adviceCard}>
          <Text style={styles.adviceTitle}>{t("คำแนะนำ", "What to do next")}</Text>
          {strongest ? (
            <Text style={styles.adviceLine}>
              💪 {t("จุดแข็งวันนี้", "Strongest today")}: {t(DAILY_SKILL_META[strongest[0]].th, DAILY_SKILL_META[strongest[0]].en)} (
              {Math.round(strongest[1].avgPct)}%)
            </Text>
          ) : null}
          {focus ? (
            <>
              <Text style={styles.adviceLine}>
                🎯 {overall ? t("ควรฝึกเพิ่ม (จากหลายวัน)", "Needs most practice (over several days)") : t("ควรฝึกเพิ่ม", "Needs more practice")}:{" "}
                {t(DAILY_SKILL_META[focus].th, DAILY_SKILL_META[focus].en)}
              </Text>
              <LuxuryPressable style={styles.adviceBtn} onPress={() => push(SKILL_HUB[focus] as Href)}>
                <Text style={styles.adviceBtnText}>
                  {t(`ฝึก${DAILY_SKILL_META[focus].th}เพิ่ม →`, `Practise ${DAILY_SKILL_META[focus].en} →`)}
                </Text>
              </LuxuryPressable>
            </>
          ) : null}
        </FadeInItem>
      ) : null}

      {last7.length > 1 ? (
        <FadeInItem index={skills.length + 4}>
          <Text style={styles.sectionTitle}>{t("ความก้าวหน้า 7 วันล่าสุด", "Last 7 days")}</Text>
          <View style={styles.chart}>
            {last7.map((h) => {
              const p = Math.round(h.avgPct ?? 0);
              const current = h.dateIso === day.dateIso;
              return (
                <LuxuryPressable
                  key={h.dateIso}
                  style={styles.chartCol}
                  sound="none"
                  onPress={() => push(`/daily/report?date=${h.dateIso}` as Href)}
                >
                  <Text style={styles.chartPct}>{p}</Text>
                  <View style={styles.chartTrack}>
                    <View style={[styles.chartBar, { height: `${Math.max(6, p)}%`, backgroundColor: current ? "#FFCC00" : "#004AAD" }]} />
                  </View>
                  <Text style={[styles.chartDay, current && { color: "#111", fontWeight: "900" }]}>{shortDay(h.dateIso, lang)}</Text>
                </LuxuryPressable>
              );
            })}
          </View>
        </FadeInItem>
      ) : null}

      {isToday && plan ? (
        <>
          <FadeInItem index={skills.length + 5}>
            <Text style={styles.sectionTitle}>{t("รายข้อ", "Each question")}</Text>
          </FadeInItem>
          {plan.items.map((it, i) => {
            const r = results.get(it.contentKey);
            const meta = DAILY_SKILL_META[it.skill];
            return (
              <FadeInItem key={it.contentKey} index={skills.length + 6 + i} step={30} style={styles.itemRow}>
                <Text style={styles.skillEmoji}>{meta.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{t(meta.th, meta.en)}</Text>
                  <Text style={styles.itemSub}>
                    {roundLabel(t, it.round)} · {difficultyLabel(t, it.difficulty)} · {t(`ชุดที่ ${it.setNumber}`, `Set ${it.setNumber}`)}
                  </Text>
                </View>
                <Text style={[styles.itemPct, { color: r ? pctColor(r.pct) : "#9CA3AF" }]}>
                  {r ? `${Math.round(r.pct)}%` : t("ยังไม่ทำ", "not done")}
                </Text>
              </FadeInItem>
            );
          })}
        </>
      ) : null}

      <LuxuryPressable style={styles.primaryBtn} sound="submit" onPress={() => replace("/daily" as Href)}>
        <Text style={styles.primaryBtnText}>{t("กลับหน้าฝึกประจำวัน", "Back to daily practice")}</Text>
      </LuxuryPressable>
      <LuxuryPressable style={styles.exitBtn} sound="tap" onPress={() => replace("/(tabs)" as Href)}>
        <Text style={styles.exitText}>{t("ออกไปหน้าแรก", "Exit to home")}</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F4F6FB" },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#111", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#6B7280", marginTop: 6, textAlign: "center" },
  hero: { backgroundColor: "#004AAD", borderRadius: 20, padding: 18, marginBottom: 12 },
  heroLabel: { color: "#cde0ff", fontSize: 12, fontWeight: "800" },
  heroScore: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 4 },
  delta: { marginTop: 6, fontSize: 13, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 14, borderWidth: 2, borderColor: "#E7EAF1", paddingVertical: 12, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "900", color: "#111" },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111", marginBottom: 10, marginTop: 6 },
  skillRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 8 },
  skillEmoji: { fontSize: 22 },
  skillHead: { flexDirection: "row", justifyContent: "space-between" },
  skillName: { fontSize: 14, fontWeight: "900", color: "#111" },
  skillPct: { fontSize: 14, fontWeight: "900" },
  bar: { marginTop: 6, height: 8, borderRadius: 999, backgroundColor: "#E7EAF1", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999 },
  skillCount: { fontSize: 11, color: "#6B7280", marginTop: 4 },
  adviceCard: { backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#FCD34D", borderRadius: 16, padding: 14, marginVertical: 10 },
  adviceTitle: { fontSize: 15, fontWeight: "900", color: "#111", marginBottom: 6 },
  adviceLine: { fontSize: 14, color: "#111", marginTop: 4, lineHeight: 20 },
  adviceBtn: { marginTop: 10, backgroundColor: "#004AAD", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  adviceBtnText: { color: "#FFCC00", fontWeight: "900" },
  chart: { flexDirection: "row", gap: 6, backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 12 },
  chartCol: { flex: 1, alignItems: "center" },
  chartPct: { fontSize: 11, fontWeight: "800", color: "#6B7280" },
  chartTrack: { height: 90, width: "70%", justifyContent: "flex-end", marginVertical: 4 },
  chartBar: { width: "100%", borderRadius: 6 },
  chartDay: { fontSize: 10, color: "#6B7280" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 6 },
  itemTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  itemSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  itemPct: { fontSize: 14, fontWeight: "900" },
  primaryBtn: { marginTop: 18, backgroundColor: "#FFCC00", borderRadius: 14, borderWidth: 3, borderColor: "#111", paddingVertical: 14, alignItems: "center", alignSelf: "stretch" },
  exitBtn: { marginTop: 8, alignItems: "center", paddingVertical: 12 },
  exitText: { color: "#6B7280", fontWeight: "800" },
  primaryBtnText: { fontSize: 16, fontWeight: "900", color: "#111" },
});
