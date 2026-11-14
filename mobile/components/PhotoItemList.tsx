import { useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "./LuxuryPressable";
import { MascotCoach } from "./MascotCoach";
import { ScreenLoader } from "./MascotLoader";
import { FadeInItem } from "./Motion";
import { useLuxuryRouter } from "../hooks/useLuxuryRouter";
import { LOAD_FAILED, errorText, roundLabel, useI18n } from "../lib/i18n";
import { fetchPhotoItems } from "../lib/production-api";
import { PRODUCTION_MAX_SCORE, photoRoundNumber } from "../lib/production-constants";
import type { PhotoItem } from "../lib/production-types";

/** Round picker + photo grid for Write About the Photo / Speak About the Photo. */
export function PhotoItemList({ mode }: { mode: "write" | "speak" }) {
  const { t } = useI18n();
  const { push } = useLuxuryRouter();
  const taskType = mode === "write" ? "write_about_photo" : "speak_about_photo";
  const basePath = mode === "write" ? "/write-about-photo" : "/speak-about-photo";

  const [items, setItems] = useState<PhotoItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<number | null>(null);

  // Refetch on focus: the score on a card changes after each graded attempt.
  const load = useCallback(() => {
    let cancelled = false;
    setError(null);
    fetchPhotoItems(taskType, { fresh: true })
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : LOAD_FAILED);
      });
    return () => {
      cancelled = true;
    };
  }, [taskType]);
  useFocusEffect(load);

  const rounds = useMemo(() => {
    const set = new Set<number>();
    for (const it of items ?? []) set.add(photoRoundNumber(it.sort_order));
    return [...set].sort((a, b) => a - b);
  }, [items]);
  const activeRound = round ?? rounds[0] ?? 1;
  const visible = useMemo(
    () => (items ?? []).filter((it) => photoRoundNumber(it.sort_order) === activeRound),
    [items, activeRound],
  );

  if (error && !items) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
        <LuxuryPressable style={[styles.retry]} onPress={() => load()}>
          <Text style={styles.retryText}>{t("ลองใหม่", "Retry")}</Text>
        </LuxuryPressable>
      </View>
    );
  }
  if (!items) return <ScreenLoader />;

  const done = (items ?? []).filter((it) => it.progress).length;

  const header = (
    <View>
      <MascotCoach
        text={
          mode === "write"
            ? t("ดูภาพแล้วเขียนบรรยาย 1 นาที", "Look at the photo and write for 1 minute")
            : t("ดูภาพ เตรียมตัว 20 วินาที แล้วพูด 30–90 วินาที", "Prepare for 20 seconds, then speak for 30–90 seconds")
        }
        sub={
          mode === "write"
            ? t("บอกให้ครบ ใคร · ทำอะไร · ที่ไหน แล้วเพิ่มรายละเอียด สี จำนวน อารมณ์", "Cover who · what · where, then add colours, numbers and mood")
            : t("เริ่มด้วย In this photo, I can see… แล้วเล่าต่อจากใกล้ไปไกล", "Start with “In this photo, I can see…” and move from near to far")
        }
      />
      <Text style={styles.progress}>
        {t(`ทำแล้ว ${done}/${items.length} ภาพ`, `${done}/${items.length} photos done`)}
      </Text>
      {rounds.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {rounds.map((r) => {
            const on = r === activeRound;
            return (
              <LuxuryPressable
                key={r}
                sound="none"
                scaleTo={0.95}
                style={[styles.chip, on ? styles.chipOn : null]}
                onPress={() => setRound(r)}
              >
                <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{roundLabel(t, r)}</Text>
              </LuxuryPressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={visible}
      keyExtractor={(it) => it.id}
      numColumns={2}
      columnWrapperStyle={styles.column}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{t("ยังไม่มีภาพในรอบนี้", "No photos in this round yet.")}</Text>}
      renderItem={({ item, index }) => (
        <FadeInItem index={index} style={styles.cell}>
          <LuxuryPressable
            style={[styles.card]}
            sound="none"
            scaleTo={0.97}
            onPress={() => push(`${basePath}/${item.id}` as Href)}
          >
            <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {t(item.title_th || item.title_en, item.title_en)}
              </Text>
              {item.progress ? (
                <Text style={styles.score}>
                  {t("ล่าสุด", "Last")} {Math.round(item.progress.latest_score160)}/{PRODUCTION_MAX_SCORE}
                </Text>
              ) : (
                <Text style={styles.fresh}>{t("ยังไม่ได้ทำ", "Not tried yet")}</Text>
              )}
            </View>
          </LuxuryPressable>
        </FadeInItem>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  retry: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#004AAD", borderRadius: 10 },
  retryText: { color: "#FFCC00", fontWeight: "800" },
  list: { flex: 1, backgroundColor: "#F4F6FB" },
  listContent: { padding: 12, paddingBottom: 40 },
  progress: { marginTop: 14, fontSize: 12, fontWeight: "800", color: "#6B7280", paddingHorizontal: 4 },
  chips: { gap: 8, paddingVertical: 12, paddingHorizontal: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#fff",
  },
  chipOn: { backgroundColor: "#004AAD" },
  chipText: { fontSize: 13, fontWeight: "900", color: "#111" },
  chipTextOn: { color: "#FFCC00" },
  column: { gap: 10 },
  // maxWidth keeps a lone last photo half-width instead of stretching across the row.
  cell: { flex: 1, maxWidth: "49%", marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    overflow: "hidden",
  },
  thumb: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#E5E7EB" },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: "800", color: "#111", lineHeight: 18 },
  score: { marginTop: 4, fontSize: 12, fontWeight: "900", color: "#004AAD" },
  fresh: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
});
