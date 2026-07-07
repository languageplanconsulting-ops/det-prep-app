import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { UiFeedbackProvider } from "../components/UiFeedbackProvider";
import { AuthProvider } from "../lib/auth-context";
import { LUXURY_STACK_ANIMATION_MS } from "../lib/luxury-motion";

const luxuryScreen = {
  headerShown: true,
  headerStyle: { backgroundColor: "#004AAD" },
  headerTintColor: "#FFCC00",
  headerTitleStyle: { fontWeight: "800" as const },
  headerShadowVisible: false,
  animation: "slide_from_right" as const,
  animationDuration: LUXURY_STACK_ANIMATION_MS,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <UiFeedbackProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: LUXURY_STACK_ANIMATION_MS,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            contentStyle: { backgroundColor: "#F4F6FB" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" options={{ ...luxuryScreen, headerShown: true, title: "Sign in" }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="dictation/index" options={{ ...luxuryScreen, title: "Dictation" }} />
          <Stack.Screen
            name="dictation/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: "Dictation sets" }}
          />
          <Stack.Screen
            name="dictation/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: "Dictation" }}
          />
          <Stack.Screen name="fitb/index" options={{ ...luxuryScreen, title: "Fill in the blank" }} />
          <Stack.Screen
            name="fitb/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: "FITB sets" }}
          />
          <Stack.Screen
            name="fitb/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: "Fill in the blank" }}
          />
          <Stack.Screen name="reading/index" options={{ ...luxuryScreen, title: "Reading" }} />
          <Stack.Screen
            name="reading/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: "Reading sets" }}
          />
          <Stack.Screen
            name="reading/[round]/[difficulty]/[set]/index"
            options={{ ...luxuryScreen, title: "Exams" }}
          />
          <Stack.Screen
            name="reading/[round]/[difficulty]/[set]/[exam]"
            options={{ ...luxuryScreen, title: "Reading" }}
          />
          <Stack.Screen name="vocab/index" options={{ ...luxuryScreen, title: "Vocabulary" }} />
          <Stack.Screen
            name="vocab/[round]/index"
            options={{ ...luxuryScreen, title: "Vocabulary level" }}
          />
          <Stack.Screen
            name="vocab/[round]/[level]/index"
            options={{ ...luxuryScreen, title: "Vocab sets" }}
          />
          <Stack.Screen
            name="vocab/[round]/[level]/[set]/index"
            options={{ ...luxuryScreen, title: "Passages" }}
          />
          <Stack.Screen
            name="vocab/[round]/[level]/[set]/[passage]"
            options={{ ...luxuryScreen, title: "Vocabulary" }}
          />
          <Stack.Screen name="realword/index" options={{ ...luxuryScreen, title: "Real word" }} />
          <Stack.Screen
            name="realword/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: "Real word sets" }}
          />
          <Stack.Screen
            name="realword/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: "Real word" }}
          />
          <Stack.Screen
            name="conversation/index"
            options={{ ...luxuryScreen, title: "Conversation" }}
          />
          <Stack.Screen
            name="conversation/[round]/index"
            options={{ ...luxuryScreen, title: "Conversation round" }}
          />
          <Stack.Screen
            name="conversation/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: "Conversation sets" }}
          />
          <Stack.Screen
            name="conversation/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: "Conversation" }}
          />
          <Stack.Screen
            name="dialogue-summary/index"
            options={{ ...luxuryScreen, title: "Dialogue summary" }}
          />
          <Stack.Screen
            name="dialogue-summary/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: "Summary sets" }}
          />
          <Stack.Screen
            name="dialogue-summary/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: "Write summary" }}
          />
          <Stack.Screen
            name="interactive-speaking/index"
            options={{ ...luxuryScreen, title: "Interactive speaking" }}
          />
          <Stack.Screen
            name="interactive-speaking/[round]/index"
            options={{ ...luxuryScreen, title: "Scenarios" }}
          />
          <Stack.Screen
            name="interactive-speaking/[round]/[scenarioId]"
            options={{ ...luxuryScreen, title: "Speaking" }}
          />
          <Stack.Screen name="lessons/index" options={{ ...luxuryScreen, title: "บทเรียน" }} />
          <Stack.Screen
            name="lessons/[scenarioId]"
            options={{ ...luxuryScreen, title: "ฟังสถานการณ์" }}
          />
        </Stack>
      </UiFeedbackProvider>
    </AuthProvider>
  );
}
