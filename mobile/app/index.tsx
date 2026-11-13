import { Redirect } from "expo-router";

import { useAuth } from "../lib/auth-context";
import { ScreenLoader } from "../components/MascotLoader";

export default function Index() {
  const { loading, session } = useAuth();

  if (loading) return <ScreenLoader />;

  if (!session) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
