import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import { useAuth } from "../../lib/auth-context";
import { getAdminToken } from "../../lib/admin-unlock";
import { clearAdminUnlock, unlockWithAdminCode } from "../../lib/api";
import { getSfxMuted, setSfxMuted, sfxTap } from "../../lib/exam-sfx-mobile";

export default function ProfileScreen() {
  const { user, tier, quota, signOut, refreshQuota } = useAuth();
  const { replace } = useLuxuryRouter();
  const [sfxMuted, setSfxMutedState] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminErr, setAdminErr] = useState<string | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  useEffect(() => {
    void getSfxMuted().then(setSfxMutedState);
    void getAdminToken().then((t) => setAdminUnlocked(!!t));
  }, []);

  const displayTier = quota?.isAdmin || adminUnlocked ? "vip (admin)" : tier;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in</Text>
        <Text style={styles.email}>{user?.email ?? "—"}</Text>
        <Text style={styles.tier}>Plan: {displayTier ?? "—"}</Text>
        {quota ? (
          <Text style={styles.quota}>
            AI credits: {quota.ai.totalRemaining} / {quota.ai.totalLimit}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.switchTitle}>Admin unlock</Text>
        <Text style={styles.switchSub}>
          Enter admin code for VIP access (all skills, unlimited AI grading).
        </Text>
        {adminUnlocked ? (
          <>
            <Text style={styles.adminOk}>Admin access active</Text>
            <LuxuryPressable
              style={styles.adminBtnSecondary}
              onPress={async () => {
                await clearAdminUnlock();
                setAdminUnlocked(false);
                setAdminCode("");
                await refreshQuota();
              }}
            >
              <Text style={styles.adminBtnSecondaryText}>Remove admin unlock</Text>
            </LuxuryPressable>
          </>
        ) : (
          <>
            <TextInput
              style={styles.adminInput}
              placeholder="Admin code"
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
              <Text style={styles.adminBtnText}>{adminBusy ? "…" : "Unlock VIP access"}</Text>
            </LuxuryPressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Sound effects</Text>
            <Text style={styles.switchSub}>Tap & navigation sounds (like Duolingo)</Text>
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
        <Text style={styles.btnText}>Sign out</Text>
      </LuxuryPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB", padding: 16 },
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
});
