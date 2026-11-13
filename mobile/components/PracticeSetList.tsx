import type { Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LuxuryPressable } from "./LuxuryPressable";
import { LuxuryTile } from "./LuxuryTile";
import { useBestScores } from "../hooks/useBestScores";
import { useLuxuryRouter } from "../hooks/useLuxuryRouter";
import { fetchPracticeSetList } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { PracticeSkillId } from "../lib/types";
import { ScreenLoader } from "./MascotLoader";
import { FadeInItem } from "./Motion";

type Props = {
  skill: PracticeSkillId;
  round: number;
  difficulty: string;
  header: string;
  href: (setNumber: number) => string;
  /** When set, show each set's best score (shared with the website via practice_attempts). */
  progress?: { taskType: string; contentSkill: string };
};

export function PracticeSetList({ skill, round, difficulty, header, href, progress }: Props) {
  const { push } = useLuxuryRouter();
  const { t } = useI18n();
  const [setNumbers, setSetNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bestPct = useBestScores({
    taskType: progress?.taskType,
    contentSkill: progress?.contentSkill,
    round,
    difficulty,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nums = await fetchPracticeSetList({
        skill,
        round,
        difficulty,
      });
      setSetNumbers(nums);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("โหลดชุดข้อสอบไม่สำเร็จ", "Failed to load sets"));
    } finally {
      setLoading(false);
    }
  }, [skill, round, difficulty]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ScreenLoader />;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <LuxuryPressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>{t("ลองใหม่", "Retry")}</Text>
        </LuxuryPressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={Array.from({ length: 40 }, (_, i) => i + 1)}
      keyExtractor={(n) => String(n)}
      numColumns={2}
      ListHeaderComponent={<Text style={styles.header}>{header}</Text>}
      renderItem={({ item: setNumber }) => {
        const available = setNumbers.includes(setNumber);
        const best = bestPct.get(setNumber);
        const subtitle = !available
          ? t("ยังไม่มีข้อสอบ", "No data")
          : best != null
            ? t(`ดีที่สุด ${Math.round(best)}%`, `Best ${Math.round(best)}%`)
            : t("เริ่มทำ", "Open");
        return (
          <FadeInItem index={setNumber - 1} step={25} style={{ flex: 1 }}>
            <LuxuryTile
              title={t(`ชุดที่ ${setNumber}`, `Set ${setNumber}`)}
              subtitle={subtitle}
              disabled={!available}
              onPress={() => push(href(setNumber) as Href)}
            />
          </FadeInItem>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  retry: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#004AAD",
    borderRadius: 10,
  },
  retryText: { color: "#FFCC00", fontWeight: "800" },
  list: { flex: 1, backgroundColor: "#F4F6FB" },
  listContent: { padding: 12 },
  header: { fontWeight: "800", marginBottom: 12, paddingHorizontal: 4 },
});
