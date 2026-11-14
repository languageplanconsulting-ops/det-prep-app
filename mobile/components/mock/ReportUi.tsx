import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../LuxuryPressable";
import { FadeInItem } from "../Motion";
import { useI18n } from "../../lib/i18n";
import { SKILL_META, type MockSkill } from "../../lib/mock-test";
import { C } from "./TaskUi";

const mascot = require("../../assets/mascot-doy.png");

export function scoreColor(score160: number): string {
  if (score160 >= 112) return C.green;
  if (score160 >= 80) return C.blue;
  return C.red;
}

export function Card({ children, index = 0, title }: { children: ReactNode; index?: number; title?: string }) {
  return (
    <FadeInItem index={index} style={s.card}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </FadeInItem>
  );
}

export function SkillBar({ skill, score, tag }: { skill: MockSkill; score: number; tag?: string }) {
  const { t } = useI18n();
  const m = SKILL_META[skill];
  const pct = Math.max(0, Math.min(100, (score / 160) * 100));
  return (
    <View style={s.skill}>
      <View style={s.skillTop}>
        <Text style={s.skillLabel}>
          {m.emoji} {t(m.th, m.en)}
          {tag ? <Text style={s.tag}>{`  ${tag}`}</Text> : null}
        </Text>
        <Text style={[s.skillScore, { color: m.color }]}>{score}/160</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${pct}%`, backgroundColor: m.color }]} />
      </View>
    </View>
  );
}

export function TargetCell({ label, actual, target, primary }: { label: string; actual: number; target: number; primary?: boolean }) {
  const { t } = useI18n();
  const delta = actual - target;
  return (
    <View style={s.target}>
      <Text style={s.targetLabel}>{label}</Text>
      <Text style={[s.targetValue, primary ? { color: C.blue } : null]}>{actual}</Text>
      {target > 0 ? (
        <Text style={[s.targetDelta, { color: delta >= 0 ? C.green : C.red }]}>
          {t(`เป้า ${target}`, `goal ${target}`)} · {delta >= 0 ? "+" : ""}
          {delta}
        </Text>
      ) : (
        <Text style={s.targetDelta}>—</Text>
      )}
    </View>
  );
}

export const TargetGrid = ({ children }: { children: ReactNode }) => <View style={s.targetGrid}>{children}</View>;

/** พี่ดอย's coaching tips bubble. */
export function CoachTips({ tips, index = 0 }: { tips: string[]; index?: number }) {
  const { t } = useI18n();
  if (!tips.length) return null;
  return (
    <FadeInItem index={index} style={s.coachRow}>
      <Image source={mascot} style={s.coachImg} resizeMode="contain" />
      <View style={s.coachBubble}>
        <Text style={s.coachBadge}>{t("✨ เคล็ดลับจากพี่ดอย", "✨ Tips from Doy")}</Text>
        {tips.map((tip, i) => (
          <Text key={i} style={s.coachTip}>
            • {tip}
          </Text>
        ))}
      </View>
    </FadeInItem>
  );
}

export function HistoryRow({
  title,
  sub,
  score,
  delta,
  onPress,
}: {
  title: string;
  sub: string;
  score: number;
  delta?: number | null;
  onPress?: () => void;
}) {
  return (
    <LuxuryPressable style={s.hist} sound="none" scaleTo={0.98} disabled={!onPress} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={s.histTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.histSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[s.histScore, { color: scoreColor(score) }]}>{score}</Text>
        {delta != null && delta !== 0 ? (
          <Text style={[s.histDelta, { color: delta > 0 ? C.green : C.red }]}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
          </Text>
        ) : null}
      </View>
      {onPress ? <Text style={s.chev}>›</Text> : null}
    </LuxuryPressable>
  );
}

/** Tiny score trend: one bar per attempt (oldest → newest), 0–160. */
export function TrendBars({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  return (
    <View style={s.trend}>
      {scores.map((v, i) => (
        <View key={i} style={s.trendCol}>
          <View style={[s.trendBar, { height: `${Math.max(6, (v / 160) * 100)}%`, backgroundColor: i === scores.length - 1 ? C.blue : "#BFD3F5" }]} />
          <Text style={s.trendLabel}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export const reportStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  hero: { backgroundColor: C.blue, borderRadius: 22, padding: 20, gap: 6, alignItems: "center" },
  heroLabel: { color: "#CDE0FF", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  heroScore: { color: "#fff", fontSize: 54, fontWeight: "900" },
  heroOf: { color: "#CDE0FF", fontSize: 13, fontWeight: "800", marginTop: -6 },
  heroChips: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" },
  chip: { backgroundColor: C.yellow, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: "900", color: C.ink },
  chipGhost: { backgroundColor: "rgba(255,255,255,0.16)" },
  chipGhostText: { color: "#fff" },
  heroDate: { color: "#E6F0FF", fontSize: 12, marginTop: 4 },
  row: { flexDirection: "row", gap: 10 },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F3F8", gap: 10 },
  lineLabel: { fontSize: 14, fontWeight: "700", color: C.ink, flex: 1 },
  lineSub: { fontSize: 11, color: C.sub, fontWeight: "600" },
  lineScore: { fontSize: 15, fontWeight: "900" },
  muted: { fontSize: 13, color: C.sub, lineHeight: 19 },
  weakCard: { backgroundColor: C.blue, borderRadius: 18, padding: 16, gap: 8 },
  weakLabel: { color: C.yellow, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  weakTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  weakSub: { color: "#E6F0FF", fontSize: 13, lineHeight: 19 },
  weakBtn: { backgroundColor: C.yellow, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" },
  weakBtnAlt: { backgroundColor: "rgba(255,255,255,0.16)" },
  weakBtnText: { color: C.blue, fontWeight: "900", fontSize: 14 },
  weakBtnTextAlt: { color: "#fff" },
});

const s = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: C.ink },
  skill: { gap: 6 },
  skillTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  skillLabel: { fontSize: 14, fontWeight: "800", color: C.ink },
  tag: { fontSize: 11, fontWeight: "900", color: C.red },
  skillScore: { fontSize: 14, fontWeight: "900" },
  track: { height: 8, borderRadius: 4, backgroundColor: "#EEF1F6", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  targetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  target: {
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 10,
    alignItems: "center",
  },
  targetLabel: { fontSize: 11, color: C.sub, fontWeight: "700" },
  targetValue: { fontSize: 22, fontWeight: "900", color: C.ink },
  targetDelta: { fontSize: 11, fontWeight: "800", color: C.sub },
  coachRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  coachImg: { width: 52, height: 52 },
  coachBubble: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#DCE6F8",
    padding: 12,
    gap: 6,
  },
  coachBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.yellow,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900",
    color: C.blue,
    overflow: "hidden",
  },
  coachTip: { fontSize: 13, lineHeight: 20, color: C.ink },
  hist: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F8",
  },
  histTitle: { fontSize: 14, fontWeight: "800", color: C.ink },
  histSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  histScore: { fontSize: 20, fontWeight: "900" },
  histDelta: { fontSize: 11, fontWeight: "900" },
  chev: { fontSize: 22, color: "#C4CBD8" },
  trend: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 90, paddingTop: 4 },
  trendCol: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end", gap: 2 },
  trendBar: { width: "70%", borderRadius: 4 },
  trendLabel: { fontSize: 10, fontWeight: "800", color: C.sub },
});
