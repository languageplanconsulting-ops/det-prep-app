import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../lib/auth-context";

export default function Index() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
