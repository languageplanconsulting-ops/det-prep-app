import { Link, Redirect } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { LanguageToggle } from "../components/LanguageToggle";
import { LuxuryPressable } from "../components/LuxuryPressable";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";

export default function LoginScreen() {
  const { loading, session, signIn, signInWithAdminCode } = useAuth();
  const { t } = useI18n();
  const [adminCode, setAdminCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Redirect href="/(tabs)" />;

  const onSubmit = async () => {
    setError(null);
    setBusy(true);
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  const onAdminCode = async () => {
    setError(null);
    setBusy(true);
    const err = await signInWithAdminCode(adminCode);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <LanguageToggle />
          <Text style={[styles.brand, { marginTop: 16 }]}>English Plan</Text>
          <Text style={styles.sub}>
            {t(
              "เตรียมสอบ DET — ใช้บัญชีเดียวกับ languageplanprep.co",
              "DET Prep — same account as languageplanprep.co",
            )}
          </Text>

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t("อีเมล", "Email")}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder={t("รหัสผ่าน", "Password")}
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <LuxuryPressable
            style={styles.btn}
            sound="submit"
            disabled={busy}
            onPress={() => void onSubmit()}
          >
            {busy ? (
              <ActivityIndicator color="#FFCC00" />
            ) : (
              <Text style={styles.btnText}>{t("เข้าสู่ระบบ", "Sign in")}</Text>
            )}
          </LuxuryPressable>

          {Platform.OS === "web" ? (
            <>
              <Text style={styles.hint}>
                {t(
                  "ยังไม่มีบัญชี? สมัครที่เว็บไซต์ แล้วใช้อีเมลและรหัสผ่านเดียวกันในแอปนี้",
                  "New here? Sign up on the website, then use the same email and password in this app.",
                )}
              </Text>
              <Link href="https://www.languageplanprep.co/signup" style={styles.link}>
                {t("สมัครบนเว็บไซต์", "Open signup on web")}
              </Link>
            </>
          ) : (
            // Store builds: no link out to signup/pricing (App Store 3.1.1 / Play payments policy).
            <Text style={styles.hint}>
              {t(
                "ใช้อีเมลและรหัสผ่านบัญชี English Plan ของคุณ",
                "Use the email and password of your English Plan account.",
              )}
            </Text>
          )}

          {__DEV__ ? (
            <View style={styles.devBox}>
              <Text style={styles.devTitle}>{t("แอดมิน (เฉพาะตอนพัฒนา)", "Admin (dev only)")}</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder={t("รหัสแอดมิน", "Admin code")}
                value={adminCode}
                onChangeText={setAdminCode}
                onSubmitEditing={() => void onAdminCode()}
              />
              <LuxuryPressable
                style={styles.devBtn}
                sound="submit"
                disabled={busy || !adminCode.trim()}
                onPress={() => void onAdminCode()}
              >
                <Text style={styles.devBtnText}>
                  {t("เข้าสู่ระบบด้วยรหัส", "Sign in with code")}
                </Text>
              </LuxuryPressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6FB",
  },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: "#111",
  },
  brand: { fontSize: 28, fontWeight: "900", color: "#004AAD" },
  sub: { marginTop: 6, fontSize: 13, color: "#6B7280", marginBottom: 20 },
  input: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  error: { color: "#b91c1c", marginBottom: 8, fontWeight: "600" },
  btn: {
    backgroundColor: "#004AAD",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#111",
  },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  hint: { marginTop: 16, fontSize: 12, color: "#6B7280", lineHeight: 18 },
  link: { marginTop: 8, color: "#004AAD", fontWeight: "700" },
  devBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#E7EAF1",
    borderStyle: "dashed",
  },
  devTitle: { fontSize: 12, fontWeight: "800", color: "#6B7280", marginBottom: 8 },
  devBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#FFCC00",
  },
  devBtnText: { color: "#111", fontWeight: "900" },
});
