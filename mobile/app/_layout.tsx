import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { UiFeedbackProvider } from "../components/UiFeedbackProvider";
import { AuthProvider } from "../lib/auth-context";
import { LanguageProvider, useI18n } from "../lib/i18n";
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
    <LanguageProvider>
      <AuthProvider>
        <UiFeedbackProvider>
          <RootStack />
        </UiFeedbackProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

function RootStack() {
  const { t } = useI18n();
  return (
    <>
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
          <Stack.Screen name="login" options={{ ...luxuryScreen, headerShown: true, title: t("เข้าสู่ระบบ", "Sign in") }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="dictation/index" options={{ ...luxuryScreen, title: t("ตามคำบอก", "Dictation") }} />
          <Stack.Screen
            name="dictation/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: t("ชุดตามคำบอก", "Dictation sets") }}
          />
          <Stack.Screen
            name="dictation/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: t("ตามคำบอก", "Dictation") }}
          />
          <Stack.Screen name="fitb/index" options={{ ...luxuryScreen, title: t("เติมคำในช่องว่าง", "Fill in the blank") }} />
          <Stack.Screen
            name="fitb/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: t("ชุดเติมคำ", "FITB sets") }}
          />
          <Stack.Screen
            name="fitb/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: t("เติมคำในช่องว่าง", "Fill in the blank") }}
          />
          <Stack.Screen name="reading/index" options={{ ...luxuryScreen, title: t("การอ่าน", "Reading") }} />
          <Stack.Screen
            name="reading/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: t("ชุดการอ่าน", "Reading sets") }}
          />
          <Stack.Screen
            name="reading/[round]/[difficulty]/[set]/index"
            options={{ ...luxuryScreen, title: t("ข้อสอบ", "Exams") }}
          />
          <Stack.Screen
            name="reading/[round]/[difficulty]/[set]/[exam]"
            options={{ ...luxuryScreen, title: t("การอ่าน", "Reading") }}
          />
          <Stack.Screen name="vocab/index" options={{ ...luxuryScreen, title: t("คำศัพท์", "Vocabulary") }} />
          <Stack.Screen
            name="vocab/[round]/index"
            options={{ ...luxuryScreen, title: t("ระดับคำศัพท์", "Vocabulary level") }}
          />
          <Stack.Screen
            name="vocab/[round]/[level]/index"
            options={{ ...luxuryScreen, title: t("ชุดคำศัพท์", "Vocab sets") }}
          />
          <Stack.Screen
            name="vocab/[round]/[level]/[set]/index"
            options={{ ...luxuryScreen, title: t("บทความ", "Passages") }}
          />
          <Stack.Screen
            name="vocab/[round]/[level]/[set]/[passage]"
            options={{ ...luxuryScreen, title: t("คำศัพท์", "Vocabulary") }}
          />
          <Stack.Screen name="realword/index" options={{ ...luxuryScreen, title: t("คำจริง / คำลวง", "Real word") }} />
          <Stack.Screen
            name="realword/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: t("ชุดคำจริง", "Real word sets") }}
          />
          <Stack.Screen
            name="realword/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: t("คำจริง / คำลวง", "Real word") }}
          />
          <Stack.Screen
            name="conversation/index"
            options={{ ...luxuryScreen, title: t("บทสนทนา", "Conversation") }}
          />
          <Stack.Screen
            name="conversation/[round]/index"
            options={{ ...luxuryScreen, title: t("รอบบทสนทนา", "Conversation round") }}
          />
          <Stack.Screen
            name="conversation/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: t("ชุดบทสนทนา", "Conversation sets") }}
          />
          <Stack.Screen
            name="conversation/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: t("บทสนทนา", "Conversation") }}
          />
          <Stack.Screen
            name="dialogue-summary/index"
            options={{ ...luxuryScreen, title: t("ฟังแล้วสรุป", "Dialogue summary") }}
          />
          <Stack.Screen
            name="dialogue-summary/[round]/[difficulty]/index"
            options={{ ...luxuryScreen, title: t("ชุดสรุปบทสนทนา", "Summary sets") }}
          />
          <Stack.Screen
            name="dialogue-summary/[round]/[difficulty]/[set]"
            options={{ ...luxuryScreen, title: t("เขียนสรุป", "Write summary") }}
          />
          <Stack.Screen
            name="interactive-speaking/index"
            options={{ ...luxuryScreen, title: t("พูดโต้ตอบ", "Interactive speaking") }}
          />
          <Stack.Screen
            name="interactive-speaking/[round]/index"
            options={{ ...luxuryScreen, title: t("สถานการณ์", "Scenarios") }}
          />
          <Stack.Screen
            name="interactive-speaking/[round]/[scenarioId]"
            options={{ ...luxuryScreen, title: t("การพูด", "Speaking") }}
          />
          <Stack.Screen
            name="write-about-photo/index"
            options={{ ...luxuryScreen, title: t("เขียนบรรยายภาพ", "Write about the photo") }}
          />
          <Stack.Screen
            name="write-about-photo/[itemId]"
            options={{ ...luxuryScreen, title: t("เขียนบรรยายภาพ", "Write about the photo") }}
          />
          <Stack.Screen
            name="speak-about-photo/index"
            options={{ ...luxuryScreen, title: t("พูดบรรยายภาพ", "Speak about the photo") }}
          />
          <Stack.Screen
            name="speak-about-photo/[itemId]"
            options={{ ...luxuryScreen, title: t("พูดบรรยายภาพ", "Speak about the photo") }}
          />
          <Stack.Screen
            name="read-and-write/index"
            options={{ ...luxuryScreen, title: t("อ่านแล้วเขียน", "Read, then write") }}
          />
          <Stack.Screen
            name="read-and-write/[round]/index"
            options={{ ...luxuryScreen, title: t("หัวข้อเรียงความ", "Essay topics") }}
          />
          <Stack.Screen
            name="read-and-write/[round]/[topicId]"
            options={{ ...luxuryScreen, title: t("เขียนเรียงความ", "Write an essay") }}
          />
          <Stack.Screen
            name="daily/index"
            options={{ ...luxuryScreen, title: t("ฝึกประจำวัน", "Daily practice") }}
          />
          <Stack.Screen
            name="daily/report"
            options={{ ...luxuryScreen, title: t("รายงานการฝึก", "Practice report") }}
          />
          <Stack.Screen name="lessons/index" options={{ ...luxuryScreen, title: t("บทเรียน", "Lessons") }} />
          <Stack.Screen
            name="lessons/[scenarioId]"
            options={{ ...luxuryScreen, title: t("ฟังสถานการณ์", "Campus listening") }}
          />
        </Stack>
    </>
  );
}
