import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { LanguageToggle } from "../../components/LanguageToggle";
import { LuxuryPressable } from "../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import { useAuth } from "../../lib/auth-context";
import { getAdminToken } from "../../lib/admin-unlock";
import { clearAdminUnlock, deleteMyAccount, unlockWithAdminCode } from "../../lib/api";
import { getSfxMuted, setSfxMuted, sfxTap } from "../../lib/exam-sfx-mobile";
import { useI18n } from "../../lib/i18n";

export default function ProfileScreen() {
  const { user, tier, quota, signOut, refreshQuota } = useAuth();
  const { replace } = useLuxuryRouter();
  const { t } = useI18n();
  const [sfxMuted, setSfxMutedState] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminErr, setAdminErr] = useState<string | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  useEffect(() => {
    void getSfxMuted().then(setSfxMutedState);
    void getAdminToken().then((t) => setAdminUnlocked(!!t));
  }, []);

  const displayTier = quota?.isAdmin || adminUnlocked ? "vip (admin)" : tier;

  const confirmDelete = async () => {
    setDeleteErr(null);
    setDeleteBusy(true);
    try {
      await deleteMyAccount();
      await clearAdminUnlock();
      await signOut();
      replace("/login");
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : t("ลบบัญชีไม่สำเร็จ", "Could not delete account"));
      setDeleteBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>{t("เข้าสู่ระบบแล้ว", "Signed in")}</Text>
        <Text style={styles.email}>{user?.email ?? "—"}</Text>
        <Text style={styles.tier}>
          {t("แพ็กเกจ", "Plan")}: {displayTier ?? "—"}
        </Text>
        {quota ? (
          <Text style={styles.quota}>
            {t("เครดิตการตรวจ", "Grading credits")}:{" "}
            {quota.ai.totalRemaining >= 1_000_000
              ? t("ไม่จำกัด", "Unlimited")
              : `${quota.ai.totalRemaining} / ${quota.ai.totalLimit}`}
          </Text>
        ) : null}
      </View>

      {/* Code unlocks are not allowed in store builds (App Store 3.1.1) — development only. */}
      {__DEV__ ? (
      <View style={styles.card}>
        <Text style={styles.switchTitle}>{t("ปลดล็อกแอดมิน", "Admin unlock")}</Text>
        <Text style={styles.switchSub}>
          {t(
            "ใส่รหัสแอดมินเพื่อใช้สิทธิ์ VIP (ทุกทักษะ, ตรวจได้ไม่จำกัด)",
            "Enter admin code for VIP access (all skills, unlimited grading).",
          )}
        </Text>
        {adminUnlocked ? (
          <>
            <Text style={styles.adminOk}>{t("เปิดสิทธิ์แอดมินแล้ว", "Admin access active")}</Text>
            <LuxuryPressable
              style={styles.adminBtnSecondary}
              onPress={async () => {
                await clearAdminUnlock();
                setAdminUnlocked(false);
                setAdminCode("");
                await refreshQuota();
              }}
            >
              <Text style={styles.adminBtnSecondaryText}>
                {t("ยกเลิกสิทธิ์แอดมิน", "Remove admin unlock")}
              </Text>
            </LuxuryPressable>
          </>
        ) : (
          <>
            <TextInput
              style={styles.adminInput}
              placeholder={t("รหัสแอดมิน", "Admin code")}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={adminCode}
              onChangeText={setAdminCode}
            />
            {adminErr ? <Text style={styles.adminErr}>{adminErr}</Text> : null}
            <LuxuryPressable
              style={styles.adminBtn}
              sound="submit"
              disabled={adminBusy || !adminCode.trim()}
              onPress={async () => {
                setAdminErr(null);
                setAdminBusy(true);
                const err = await unlockWithAdminCode(adminCode);
                setAdminBusy(false);
                if (err) {
                  setAdminErr(err);
                  return;
                }
                setAdminUnlocked(true);
                setAdminCode("");
                await refreshQuota();
              }}
            >
              <Text style={styles.adminBtnText}>{adminBusy ? "…" : t("ปลดล็อก VIP", "Unlock VIP access")}</Text>
            </LuxuryPressable>
          </>
        )}
      </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.switchTitle}>{t("ภาษา", "Language")}</Text>
        <Text style={[styles.switchSub, { marginBottom: 10 }]}>
          {t("ภาษาของเมนูและคำอธิบาย (ข้อสอบยังเป็นภาษาอังกฤษ)", "Menus and instructions (exam content stays in English)")}
        </Text>
        <LanguageToggle />
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>{t("เสียงเอฟเฟกต์", "Sound effects")}</Text>
            <Text style={styles.switchSub}>
              {t("เสียงตอนแตะและเปลี่ยนหน้า", "Tap & navigation sounds")}
            </Text>
          </View>
          <Switch
            value={!sfxMuted}
            onValueChange={(on) => {
              const muted = !on;
              setSfxMutedState(muted);
              void setSfxMuted(muted);
              if (on) sfxTap();
            }}
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={sfxMuted ? "#f3f4f6" : "#004AAD"}
          />
        </View>
      </View>

      <LuxuryPressable
        style={styles.btn}
        sound="submit"
        onPress={async () => {
          await clearAdminUnlock();
          await signOut();
          replace("/login");
        }}
      >
        <Text style={styles.btnText}>{t("ออกจากระบบ", "Sign out")}</Text>
      </LuxuryPressable>

      {!deleteOpen ? (
        <LuxuryPressable sound="none" style={styles.deleteLink} onPress={() => setDeleteOpen(true)}>
          <Text style={styles.deleteLinkText}>{t("ลบบัญชี", "Delete account")}</Text>
        </LuxuryPressable>
      ) : (
        <View style={styles.deleteCard}>
          <Text style={styles.deleteTitle}>{t("ลบบัญชีถาวร?", "Delete your account permanently?")}</Text>
          <Text style={styles.deleteText}>
            {t(
              "บัญชีนี้ คะแนน สมุดคำศัพท์ และประวัติการฝึกทั้งหมดจะถูกลบและกู้คืนไม่ได้ สิทธิ์ VIP หรือเครดิตที่เหลืออยู่จะหายไปด้วย",
              "This account, your scores, notebook and practice history will be deleted and cannot be recovered. Any remaining VIP access or credits will be lost.",
            )}
          </Text>
          {deleteErr ? <Text style={styles.adminErr}>{deleteErr}</Text> : null}
          <View style={styles.deleteRow}>
            <LuxuryPressable
              style={[styles.deleteCancel]}
              disabled={deleteBusy}
              onPress={() => {
                setDeleteOpen(false);
                setDeleteErr(null);
              }}
            >
              <Text style={styles.deleteCancelText}>{t("ยกเลิก", "Cancel")}</Text>
            </LuxuryPressable>
            <LuxuryPressable
              style={[styles.deleteConfirm, deleteBusy && { opacity: 0.6 }]}
              disabled={deleteBusy}
              onPress={() => void confirmDelete()}
            >
              <Text style={styles.deleteConfirmText}>
                {deleteBusy ? t("กำลังลบ…", "Deleting…") : t("ยืนยันลบบัญชี", "Delete account")}
              </Text>
            </LuxuryPressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#111",
    marginBottom: 16,
  },
  label: { fontSize: 11, fontWeight: "800", color: "#6B7280", textTransform: "uppercase" },
  email: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  tier: { marginTop: 12, fontWeight: "700" },
  quota: { marginTop: 8, color: "#004AAD", fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchTitle: { fontSize: 16, fontWeight: "800" },
  switchSub: { fontSize: 12, color: "#6B7280", marginTop: 4, marginBottom: 12 },
  adminInput: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  adminErr: { color: "#b91c1c", fontWeight: "600", marginBottom: 8 },
  adminOk: { color: "#15803d", fontWeight: "800", marginBottom: 12 },
  adminBtn: {
    backgroundColor: "#004AAD",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#111",
  },
  adminBtnText: { color: "#FFCC00", fontWeight: "900" },
  adminBtnSecondary: {
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#111",
  },
  adminBtnSecondaryText: { fontWeight: "800", color: "#004AAD" },
  btn: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#b91c1c",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  btnText: { color: "#b91c1c", fontWeight: "800" },
  deleteLink: { marginTop: 18, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12 },
  deleteLinkText: { color: "#9CA3AF", fontWeight: "700", fontSize: 13, textDecorationLine: "underline" },
  deleteCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FCA5A5",
  },
  deleteTitle: { fontSize: 16, fontWeight: "900", color: "#991B1B" },
  deleteText: { fontSize: 13, lineHeight: 20, color: "#7F1D1D", marginTop: 6, marginBottom: 12 },
  deleteRow: { flexDirection: "row", gap: 10 },
  deleteCancel: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
  },
  deleteCancelText: { fontWeight: "800", color: "#111" },
  deleteConfirm: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", backgroundColor: "#DC2626" },
  deleteConfirmText: { fontWeight: "900", color: "#fff" },
});
