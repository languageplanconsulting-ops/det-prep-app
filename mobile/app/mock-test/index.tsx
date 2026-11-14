import { useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { ScreenLoader } from "../../components/MascotLoader";
import { FadeInItem } from "../../components/Motion";
import { Card, HistoryRow, TrendBars } from "../../components/mock/ReportUi";
import { C, Note, PrimaryButton } from "../../components/mock/TaskUi";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import { fetchQuotaSummary } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import {
  ApiError,
  fetchMiniHistory,
  fetchMiniSets,
  fetchMockActiveRuns,
  fetchMockHistory,
  fetchMockSets,
  startMiniSession,
  startMockSession,
} from "../../lib/mock-api";
import {
  fmtDateTime,
  pickBilingual,
  type MiniResult,
  type MiniSetsResponse,
  type MockActiveRuns,
  type MockFixedResult,
  type MockSetRow,
} from "../../lib/mock-test";

type MockQuota = { used: number; planLimit: number; planRemaining: number; addonRemaining: number; totalRemaining: number };

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Group sets by the month in their name ("… June 2026"), newest month first (website logic). */
function groupSets(sets: MockSetRow[]): { key: string; label: string; rows: MockSetRow[] }[] {
  const map = new Map<string, { key: string; label: string; rows: MockSetRow[] }>();
  for (const row of sets) {
    const m = row.name.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i);
    const key = m ? `${m[2]}-${String(MONTHS.indexOf(m[1]!.toLowerCase()) + 1).padStart(2, "0")}` : "archive";
    const label = m ? `${m[1]!.toUpperCase()} ${m[2]}` : "ARCHIVE";
    const g = map.get(key) ?? { key, label, rows: [] };
    g.rows.push(row);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** ศูนย์ข้อสอบจำลอง — full mock tests, the mini diagnosis and past results. */
export default function MockCenterScreen() {
  const { closed } = useLocalSearchParams<{ closed?: string }>();
  const { t, lang } = useI18n();
  const { push } = useLuxuryRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [sets, setSets] = useState<MockSetRow[]>([]);
  const [runs, setRuns] = useState<MockActiveRuns>({ inProgress: [], pendingReports: [] });
  const [mockHistory, setMockHistory] = useState<MockFixedResult[]>([]);
  const [mini, setMini] = useState<MiniSetsResponse>({ sets: [], latestResult: null, freeLimitReached: false });
  const [miniHistory, setMiniHistory] = useState<MiniResult[]>([]);
  const [tier, setTier] = useState<string>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [quota, setQuota] = useState<MockQuota | null>(null);
  const [picked, setPicked] = useState<MockSetRow | null>(null);
  const [miniPicker, setMiniPicker] = useState(false);
  const [targets, setTargets] = useState({ total: "", listening: "", speaking: "", reading: "", writing: "" });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [miniError, setMiniError] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    setNeedsLogin(false);
    try {
      const [s, r, mh, ms, mih, q] = await Promise.all([
        fetchMockSets(),
        fetchMockActiveRuns().catch(() => ({ inProgress: [], pendingReports: [] })),
        fetchMockHistory().catch(() => []),
        fetchMiniSets().catch(() => ({ sets: [], latestResult: null, freeLimitReached: false })),
        fetchMiniHistory().catch(() => []),
        fetchQuotaSummary().catch(() => null),
      ]);
      setSets(s);
      setRuns(r);
      setMockHistory(mh);
      setMini(ms);
      setMiniHistory(mih);
      if (q) {
        const full = q as unknown as { tier: string; isAdmin?: boolean; mock?: MockQuota };
        setTier(full.tier);
        setIsAdmin(full.isAdmin === true);
        setQuota(full.mock ?? null);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setNeedsLogin(true);
      else setLoadError(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const setName = useMemo(() => Object.fromEntries(sets.map((s) => [s.id, s.name])), [sets]);
  const groups = useMemo(() => groupSets(sets), [sets]);
  const inProgressBySet = useMemo(() => Object.fromEntries(runs.inProgress.map((r) => [r.setId, r])), [runs]);
  const statsBySet = useMemo(() => {
    const out: Record<string, { count: number; last: MockFixedResult; best: number }> = {};
    for (const h of mockHistory) {
      const cur = out[h.set_id];
      if (!cur) out[h.set_id] = { count: 1, last: h, best: h.actual_total };
      else {
        cur.count += 1;
        if (new Date(h.created_at) > new Date(cur.last.created_at)) cur.last = h;
        cur.best = Math.max(cur.best, h.actual_total);
      }
    }
    return out;
  }, [mockHistory]);

  const remaining = isAdmin ? Infinity : (quota?.totalRemaining ?? 0);
  const planLocked = !isAdmin && tier === "free" && (quota?.addonRemaining ?? 0) <= 0;
  const outOfCredits = !isAdmin && !planLocked && remaining <= 0;
  const recommended = groups[0]?.rows.find((s) => !statsBySet[s.id]) ?? groups[0]?.rows[0] ?? null;
  const daysToRefresh = (() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 86_400_000));
  })();

  const pickSet = (s: MockSetRow) => {
    const active = inProgressBySet[s.id];
    if (active) {
      push(`/mock-test/run/${active.sessionId}` as Href);
      return;
    }
    setStartError(null);
    setPicked(s);
  };

  const startMock = async () => {
    if (!picked) return;
    setStarting(true);
    setStartError(null);
    try {
      const n = (v: string) => Number(v.replace(/[^\d]/g, "") || 0);
      const { sessionId } = await startMockSession({
        setId: picked.id,
        targets: { total: n(targets.total), listening: n(targets.listening), speaking: n(targets.speaking), reading: n(targets.reading), writing: n(targets.writing) },
      });
      setPicked(null);
      push(`/mock-test/run/${sessionId}` as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setStartError(
        msg.includes("Monthly mock test limit")
          ? t("ใช้สิทธิ์ข้อสอบจำลองของเดือนนี้ครบแล้ว", "You've used all mock tests for your plan this month.")
          : msg === "Your plan does not include mock tests"
            ? t("ข้อสอบจำลองใช้ได้ตั้งแต่แพ็กเกจ Basic ขึ้นไป", "Mock tests start from the Basic plan.")
            : msg === "Mock test is not available yet"
              ? t("ข้อสอบจำลองยังไม่เปิดให้ใช้งาน", "Mock tests aren't open yet.")
              : msg === "timeout"
                ? t("เริ่มสอบนานผิดปกติ ลองอีกครั้ง", "Starting took too long — please try again.")
                : msg || t("เริ่มสอบไม่สำเร็จ", "Could not start"),
      );
    } finally {
      setStarting(false);
    }
  };

  const startMini = async (setId: string) => {
    setMiniError(null);
    setStarting(true);
    try {
      const { sessionId } = await startMiniSession(setId);
      setMiniPicker(false);
      push(`/mock-test/mini/${sessionId}` as Href);
    } catch (e) {
      if (e instanceof ApiError && e.body.code === "free_limit_reached") {
        setMini((m) => ({ ...m, freeLimitReached: true }));
        setMiniError(t("ใช้สิทธิ์เช็กระดับฟรีไปแล้ว ดูผลที่เคยทำได้เลย", "You've used your free diagnosis — view your earlier result."));
      } else {
        setMiniError(e instanceof Error ? e.message : t("เริ่มไม่สำเร็จ", "Could not start"));
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <ScreenLoader label={t("กำลังโหลดศูนย์ข้อสอบ…", "Loading the mock center…")} />;
  if (needsLogin) {
    return (
      <View style={[st.screen, { justifyContent: "center", padding: 20, gap: 12 }]}>
        <Note>{t("เข้าสู่ระบบก่อน เพื่อทำข้อสอบจำลองและดูผลที่เคยทำ", "Sign in to take mock tests and see your past results.")}</Note>
        <PrimaryButton label={t("เข้าสู่ระบบ", "Sign in")} onPress={() => push("/login" as Href)} />
      </View>
    );
  }

  const mockByDate = [...mockHistory].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const best = mockHistory.reduce((m, h) => Math.max(m, Math.round(h.actual_total)), 0);
  const improvement = mockByDate.length >= 2 ? Math.round(mockByDate[mockByDate.length - 1]!.actual_total - mockByDate[0]!.actual_total) : null;
  const historyRows = [...mockHistory].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
      <ScrollView style={st.screen} contentContainerStyle={st.content}>
        <FadeInItem index={0} style={st.hero}>
          <Text style={st.heroLabel}>{t("จำลองสอบ DET เต็มชุด", "FULL DET PRACTICE TESTS")}</Text>
          <Text style={st.heroTitle}>{t("ศูนย์ข้อสอบจำลอง", "Mock test center")}</Text>
          <Text style={st.heroSub}>
            {t(
              "ข้อสอบจำลอง 20 ข้อ จับเวลาเหมือนจริง ได้คะแนนประมาณการและผลวิเคราะห์รายทักษะ — ทำต่อได้ทั้งในแอปและบนเว็บ",
              "20-step timed mock tests with an estimated score and a skill-by-skill report — resume on the app or the website.",
            )}
          </Text>
          <View style={st.creditPill}>
            <Text style={st.creditText}>
              {isAdmin
                ? t("เครดิต: ไม่จำกัด (แอดมิน)", "Credits: unlimited (admin)")
                : t(
                    `เครดิตเดือนนี้ ${Math.max(0, quota?.totalRemaining ?? 0)} · รีเฟรชใน ${daysToRefresh} วัน`,
                    `${Math.max(0, quota?.totalRemaining ?? 0)} credits this month · refresh in ${daysToRefresh} days`,
                  )}
            </Text>
          </View>
        </FadeInItem>

        {closed === "cancelled" || closed === "abandoned" ? (
          <Note>
            {closed === "cancelled"
              ? t("ชุดนั้นถูกยกเลิกไปแล้ว — เลือกชุดใหม่ได้เลย", "That run was cancelled — pick a new set.")
              : t("ชุดนั้นค้างไว้นานเกินกำหนดจึงถูกปิด — เริ่มชุดใหม่ได้เลย", "That run was left too long and closed — start a new one.")}
          </Note>
        ) : null}
        {loadError ? <Note tone="error">{loadError}</Note> : null}

        {runs.inProgress.length ? (
          <FadeInItem index={1} style={st.amber}>
            <Text style={st.amberLabel}>{t("ค้างอยู่", "IN PROGRESS")}</Text>
            <Text style={st.amberTitle}>{t("คุณมีชุดที่ทำค้างไว้ — ทำต่อได้เลย", "You have an unfinished mock — pick up where you left off")}</Text>
            <Text style={st.amberSub}>{t("คำตอบที่ส่งแล้วถูกบันทึกไว้ · ทำต่อไม่ใช้เครดิตเพิ่ม", "Submitted answers are saved · resuming costs no credit")}</Text>
            {runs.inProgress.map((r) => (
              <LuxuryPressable key={r.sessionId} style={st.resumeRow} onPress={() => push(`/mock-test/run/${r.sessionId}` as Href)}>
                <View style={st.resumeNum}>
                  <Text style={st.resumeNumText}>{r.currentStep}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.rowTitle} numberOfLines={1}>
                    {setName[r.setId] ?? "Mock"}
                  </Text>
                  <Text style={st.rowSub}>
                    {t(`หยุดไว้ที่ข้อ ${r.currentStep}/20 · ทำแล้ว ${r.answeredCount} ข้อ`, `Stopped at step ${r.currentStep}/20 · ${r.answeredCount} answered`)}
                  </Text>
                </View>
                <Text style={st.resumeGo}>{t("ทำต่อ →", "Resume →")}</Text>
              </LuxuryPressable>
            ))}
          </FadeInItem>
        ) : null}

        {runs.pendingReports.length ? (
          <Card index={1} title={t("รอผลอยู่", "Results on the way")}>
            {runs.pendingReports.map((r) => (
              <LuxuryPressable key={r.sessionId} style={st.setRow} sound="tap" onPress={() => push(`/mock-test/report/${r.sessionId}` as Href)}>
                <View style={{ flex: 1 }}>
                  <Text style={st.rowTitle} numberOfLines={1}>
                    {setName[r.setId] ?? "Mock"}
                  </Text>
                  <Text style={st.rowSub}>{t("ทำจบแล้ว กำลังตรวจ — แตะเพื่อดูผล", "Finished, being scored — tap to view")}</Text>
                </View>
                <Text style={st.resumeGo}>{t("ดูผล →", "View →")}</Text>
              </LuxuryPressable>
            ))}
          </Card>
        ) : null}

        {/* Mini diagnosis */}
        <FadeInItem index={2} style={st.miniCard}>
          <Text style={st.miniEmoji}>🩺</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={st.miniTitle}>{t("เช็กระดับสั้น (Mini diagnosis)", "Mini diagnosis")}</Text>
            <Text style={st.miniSub}>
              {t("9 ข้อ · ประมาณ 25 นาที · ประเมินช่วงคะแนน DET และทักษะที่ควรฝึกก่อน", "9 steps · about 25 min · estimates your DET range and what to train first")}
            </Text>
            {mini.latestResult ? (
              <LuxuryPressable style={st.miniLink} sound="tap" onPress={() => push(`/mock-test/mini-report/${mini.latestResult!.sessionId}` as Href)}>
                <Text style={st.miniLinkText}>
                  {t(`ดูผลล่าสุด ≈${Math.round(mini.latestResult.total)}`, `Latest result ≈${Math.round(mini.latestResult.total)}`)} ›
                </Text>
              </LuxuryPressable>
            ) : null}
            {mini.freeLimitReached ? (
              <Text style={st.miniNote}>
                {t("แพ็กเกจฟรีเช็กระดับได้ 1 ครั้ง — อัปเกรดเพื่อทำซ้ำ", "The free plan includes one diagnosis — upgrade to retake.")}
              </Text>
            ) : (
              <View style={{ marginTop: 6 }}>
                <PrimaryButton
                  tone="yellow"
                  label={mini.latestResult ? t("ทำแบบทดสอบอีกครั้ง", "Take it again") : t("เริ่มเช็กระดับ", "Start the diagnosis")}
                  disabled={!mini.sets.length || starting}
                  onPress={() => {
                    setMiniError(null);
                    if (mini.sets.length === 1) void startMini(mini.sets[0]!.id);
                    else setMiniPicker(true);
                  }}
                />
              </View>
            )}
            {miniError ? <Note tone="warn">{miniError}</Note> : null}
          </View>
        </FadeInItem>

        {mockHistory.length ? (
          <FadeInItem index={3} style={st.snapshot}>
            <Text style={st.snapLabel}>{t("เส้นทางของคุณ", "YOUR JOURNEY")}</Text>
            <Text style={st.snapText}>
              {t(`ซ้อมมาแล้ว ${mockHistory.length} ชุด · ดีสุด ${best}`, `${mockHistory.length} mocks done · best ${best}`)}
              {improvement != null && improvement > 0 ? t(` · พัฒนาขึ้น +${improvement}`, ` · up +${improvement}`) : ""}
            </Text>
            <TrendBars scores={mockByDate.slice(-8).map((h) => Math.round(h.actual_total))} />
          </FadeInItem>
        ) : null}

        {planLocked ? (
          <Note tone="warn">
            {t(
              "ข้อสอบจำลองเต็มชุดใช้ได้ตั้งแต่แพ็กเกจ Basic ขึ้นไป — อัปเกรดได้ที่เว็บไซต์ English Plan ระหว่างนี้ลองเช็กระดับสั้นได้ฟรี",
              "Full mock tests start from the Basic plan — upgrade on the English Plan website. Meanwhile, try the free mini diagnosis.",
            )}
          </Note>
        ) : outOfCredits ? (
          <Note tone="warn">
            {t("ใช้สิทธิ์ข้อสอบจำลองของเดือนนี้ครบแล้ว — รอเดือนหน้า หรือซื้อเครดิตเพิ่มที่เว็บไซต์ (ชุดที่ค้างไว้ยังทำต่อได้)", "You've used this month's mock credits — wait for next month or buy more on the website (unfinished runs can still be resumed).")}
          </Note>
        ) : null}

        <Text style={st.sectionTitle}>{t(`เลือกชุดข้อสอบ · ${sets.length} ชุด`, `Choose a set · ${sets.length} sets`)}</Text>
        <Text style={st.sectionSub}>{t("อัปเดตทุกเดือน · ใช้เวลา ~1 ชม. · ทำชุดไหนก่อนก็ได้", "New sets monthly · ~1 hour · any order")}</Text>
        {groups.map((g, gi) => (
          <Card key={g.key} index={4 + gi} title={g.label === "ARCHIVE" ? t("ชุดข้อสอบทั้งหมด", "All sets") : gi === 0 ? t(`${g.label} · เดือนล่าสุด`, `${g.label} · latest`) : g.label}>
            {g.rows.map((s) => {
              const stats = statsBySet[s.id];
              const active = inProgressBySet[s.id];
              const isRec = recommended?.id === s.id && !stats && !active;
              return (
                <LuxuryPressable key={s.id} style={[st.setRow, active ? st.setRowActive : isRec ? st.setRowRec : null]} sound="tap" scaleTo={0.98} onPress={() => pickSet(s)}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowTitle}>{s.name}</Text>
                    <Text style={st.rowSub}>
                      {active
                        ? t(`ค้างที่ข้อ ${active.currentStep}/20 · แตะเพื่อทำต่อ`, `Paused at step ${active.currentStep}/20 · tap to resume`)
                        : stats
                          ? t(`ล่าสุด ${Math.round(stats.last.actual_total)} · ดีสุด ${Math.round(stats.best)} · ทำซ้ำได้`, `Last ${Math.round(stats.last.actual_total)} · best ${Math.round(stats.best)} · retake`)
                          : t("ยังไม่เคยทำ · ใช้ 1 เครดิต", "Not taken yet · uses 1 credit")}
                    </Text>
                  </View>
                  <View style={[st.badge, active ? { backgroundColor: "#F59E0B" } : stats ? { backgroundColor: C.green } : { backgroundColor: C.yellow }]}>
                    <Text style={[st.badgeText, !active && !stats ? { color: C.ink } : null]}>
                      {active ? t("ค้างอยู่", "Paused") : stats ? t("✓ ทำแล้ว", "✓ Done") : isRec ? t("เริ่มที่นี่", "Start here") : t("ใหม่", "New")}
                    </Text>
                  </View>
                </LuxuryPressable>
              );
            })}
          </Card>
        ))}
        {!sets.length && !loadError ? <Note>{t("ยังไม่มีชุดข้อสอบจำลอง", "No mock sets yet.")}</Note> : null}

        {historyRows.length ? (
          <Card index={8} title={t("ผลสอบจำลองที่ผ่านมา", "Past mock results")}>
            {(showAllHistory ? historyRows : historyRows.slice(0, 5)).map((h) => (
              <HistoryRow
                key={h.session_id}
                title={setName[h.set_id] ?? "Mock"}
                sub={`${fmtDateTime(h.created_at, lang)} · L${Math.round(h.actual_listening)} S${Math.round(h.actual_speaking)} R${Math.round(h.actual_reading)} W${Math.round(h.actual_writing)}`}
                score={Math.round(h.actual_total)}
                onPress={() => push(`/mock-test/report/${h.session_id}` as Href)}
              />
            ))}
            {historyRows.length > 5 ? (
              <LuxuryPressable style={st.more} sound="tap" onPress={() => setShowAllHistory((v) => !v)}>
                <Text style={st.moreText}>{showAllHistory ? t("ย่อ", "Show less") : t(`ดูทั้งหมด (${historyRows.length})`, `Show all (${historyRows.length})`)}</Text>
              </LuxuryPressable>
            ) : null}
          </Card>
        ) : null}

        {miniHistory.length ? (
          <Card index={9} title={t("ผลเช็กระดับที่ผ่านมา", "Past mini diagnoses")}>
            {miniHistory.slice(0, 5).map((h) => (
              <HistoryRow
                key={h.session_id}
                title={pickBilingual(h.level_label, lang) || t("เช็กระดับ", "Mini diagnosis")}
                sub={fmtDateTime(h.created_at, lang)}
                score={Math.round(h.actual_total)}
                onPress={() => push(`/mock-test/mini-report/${h.session_id}` as Href)}
              />
            ))}
          </Card>
        ) : null}

        <Text style={st.footnote}>
          {t(
            "นี่คือการซ้อม ไม่ใช่สอบจริง — สอบจริง Duolingo เข้มเรื่องกล้องและสภาพแวดล้อม ควรอ่านกฎก่อนสอบ",
            "This is practice, not the real test — the real DET is strict about camera and surroundings, so read the rules before exam day.",
          )}
        </Text>
      </ScrollView>

      {/* Preflight */}
      <Modal visible={!!picked} transparent animationType="slide" onRequestClose={() => setPicked(null)}>
        <Pressable style={st.backdrop} onPress={() => !starting && setPicked(null)} />
        <View style={st.sheet}>
          <Text style={st.sheetLabel}>{t("ก่อนเริ่มสอบ", "BEFORE YOU START")}</Text>
          <Text style={st.sheetTitle}>{picked?.name}</Text>
          <View style={st.sheetFacts}>
            <Text style={st.fact}>⏱ {t("~1 ชั่วโมง · 20 ข้อ · มีพักสั้น 4 ครั้ง", "~1 hour · 20 steps · 4 short breaks")}</Text>
            <Text style={st.fact}>🎧 {t("ใช้ไมโครโฟนและเสียง — หาที่เงียบ ๆ", "Uses the mic and audio — find a quiet spot")}</Text>
            <Text style={st.fact}>
              🎟 {isAdmin ? t("แอดมิน: ไม่ใช้เครดิต", "Admin: no credit used") : t(`เครดิตคงเหลือ ${Math.max(0, quota?.totalRemaining ?? 0)} ครั้ง`, `${Math.max(0, quota?.totalRemaining ?? 0)} credits left`)}
            </Text>
          </View>
          {!isAdmin ? (
            <Note tone="warn">
              {t(
                "กดเริ่ม = ใช้ 1 เครดิตทันที · ออกกลางคันไม่คืนเครดิต (ปิดแอปแล้วกลับมาทำต่อได้)",
                "Starting uses 1 credit right away · quitting doesn't refund it (you can close the app and resume later)",
              )}
            </Note>
          ) : null}
          <Text style={st.targetsLabel}>🎯 {t("ตั้งเป้าคะแนน (ไม่บังคับ)", "Target scores (optional)")}</Text>
          <View style={st.targetsGrid}>
            {(
              [
                ["total", t("รวม เช่น 120", "Total e.g. 120")],
                ["reading", t("การอ่าน", "Reading")],
                ["writing", t("การเขียน", "Writing")],
                ["listening", t("การฟัง", "Listening")],
                ["speaking", t("การพูด", "Speaking")],
              ] as [keyof typeof targets, string][]
            ).map(([k, ph]) => (
              <TextInput
                key={k}
                style={st.targetInput}
                placeholder={ph}
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={3}
                value={targets[k]}
                onChangeText={(v) => setTargets((p) => ({ ...p, [k]: v.replace(/[^\d]/g, "") }))}
              />
            ))}
          </View>
          {planLocked ? (
            <Note tone="warn">{t("ข้อสอบจำลองใช้ได้ตั้งแต่แพ็กเกจ Basic ขึ้นไป", "Mock tests start from the Basic plan.")}</Note>
          ) : outOfCredits ? (
            <Note tone="warn">{t("ใช้สิทธิ์ของเดือนนี้ครบแล้ว", "No mock credits left this month.")}</Note>
          ) : null}
          {startError ? <Note tone="error">{startError}</Note> : null}
          <View style={st.sheetRow}>
            <View style={{ flex: 1 }}>
              <PrimaryButton tone="ghost" label={t("ยกเลิก", "Cancel")} onPress={() => setPicked(null)} disabled={starting} />
            </View>
            <View style={{ flex: 2 }}>
              <PrimaryButton
                label={t("ยืนยัน เริ่มสอบ", "Start the mock")}
                busy={starting}
                disabled={planLocked || outOfCredits}
                onPress={() => void startMock()}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Mini set picker (only when several sets exist) */}
      <Modal visible={miniPicker} transparent animationType="slide" onRequestClose={() => setMiniPicker(false)}>
        <Pressable style={st.backdrop} onPress={() => !starting && setMiniPicker(false)} />
        <View style={st.sheet}>
          <Text style={st.sheetLabel}>{t("เช็กระดับสั้น", "MINI DIAGNOSIS")}</Text>
          <Text style={st.sheetTitle}>{t("เลือกชุดแบบทดสอบ", "Choose a set")}</Text>
          {mini.sets.map((s) => (
            <LuxuryPressable key={s.id} style={st.setRow} disabled={starting} onPress={() => void startMini(s.id)}>
              <Text style={[st.rowTitle, { flex: 1 }]}>{s.name}</Text>
              <Text style={st.resumeGo}>{t("เริ่ม →", "Start →")}</Text>
            </LuxuryPressable>
          ))}
          {miniError ? <Note tone="warn">{miniError}</Note> : null}
          <PrimaryButton tone="ghost" label={t("ปิด", "Close")} onPress={() => setMiniPicker(false)} disabled={starting} />
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  hero: { backgroundColor: C.blue, borderRadius: 20, padding: 20, gap: 6 },
  heroLabel: { color: "#CDE0FF", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "900" },
  heroSub: { color: "#E6F0FF", fontSize: 13, lineHeight: 19 },
  creditPill: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 },
  creditText: { color: C.yellow, fontWeight: "900", fontSize: 12 },
  amber: { backgroundColor: "#FFFBEB", borderWidth: 1.5, borderColor: "#FCD34D", borderRadius: 18, padding: 14, gap: 8 },
  amberLabel: { fontSize: 11, fontWeight: "900", color: "#B45309", letterSpacing: 1 },
  amberTitle: { fontSize: 16, fontWeight: "900", color: "#451A03" },
  amberSub: { fontSize: 12, color: "#78350F" },
  resumeRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#FDE68A", padding: 12 },
  resumeNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" },
  resumeNumText: { color: "#fff", fontWeight: "900" },
  resumeGo: { color: C.blue, fontWeight: "900", fontSize: 13 },
  rowTitle: { fontSize: 15, fontWeight: "800", color: C.ink },
  rowSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  miniCard: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 18, borderWidth: 3, borderColor: C.ink, padding: 16 },
  miniEmoji: { fontSize: 30 },
  miniTitle: { fontSize: 17, fontWeight: "900", color: C.ink },
  miniSub: { fontSize: 12, color: "#3F3F46", fontWeight: "600", lineHeight: 18 },
  miniLink: { alignSelf: "flex-start", paddingVertical: 2 },
  miniLinkText: { color: C.blue, fontWeight: "900", fontSize: 13 },
  miniNote: { fontSize: 12, color: "#92400E", fontWeight: "700" },
  snapshot: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, gap: 6 },
  snapLabel: { fontSize: 11, fontWeight: "900", color: C.sub, letterSpacing: 1 },
  snapText: { fontSize: 14, fontWeight: "800", color: C.ink },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: C.ink, marginTop: 4 },
  sectionSub: { fontSize: 12, color: C.sub, marginTop: -10 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: "#F1F3F8" },
  setRowRec: { borderColor: "#93B4E8", backgroundColor: "#F5F8FF" },
  setRowActive: { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  more: { alignSelf: "center", padding: 8 },
  moreText: { color: C.blue, fontWeight: "800" },
  footnote: { fontSize: 12, color: C.sub, textAlign: "center", lineHeight: 18 },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30, gap: 10 },
  sheetLabel: { fontSize: 11, fontWeight: "900", color: C.blue, letterSpacing: 1 },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: C.ink },
  sheetFacts: { gap: 4 },
  fact: { fontSize: 13, color: C.ink, fontWeight: "600" },
  targetsLabel: { fontSize: 13, fontWeight: "900", color: C.ink, marginTop: 4 },
  targetsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  targetInput: {
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1,
    borderColor: "#D6DCE8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.ink,
  },
  sheetRow: { flexDirection: "row", gap: 10, marginTop: 4 },
});
