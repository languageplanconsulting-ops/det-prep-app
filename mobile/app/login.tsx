import { Link, Redirect } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { LuxuryPressable } from "../components/LuxuryPressable";
import { useAuth } from "../lib/auth-context";

export default function LoginScreen() {
  const { loading, session, signIn } = useAuth();
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

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>English Plan</Text>
        <Text style={styles.sub}>DET Prep — same account as languageplanprep.co</Text>

        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Password"
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
            <Text style={styles.btnText}>Sign in</Text>
          )}
        </LuxuryPressable>

        <Text style={styles.hint}>
          New here? Sign up on the website, then use the same email and password in this app.
        </Text>
        <Link href="https://www.languageplanprep.co/signup" style={styles.link}>
          Open signup on web
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6FB",
    justifyContent: "center",
    padding: 24,
  },
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
});
