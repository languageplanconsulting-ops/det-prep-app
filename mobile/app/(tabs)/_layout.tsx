import { Tabs } from "expo-router";
import { type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";

import { LanguageToggle } from "../../components/LanguageToggle";
import { LuxuryPressable } from "../../components/LuxuryPressable";
import { useI18n } from "../../lib/i18n";

function LuxuryTabBarButton({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {

  return (
    <LuxuryPressable
      style={[style, { flex: 1, alignItems: "center", justifyContent: "center" }]}
      sound="tap"
      scaleTo={0.92}
      onPress={onPress}
    >
      {children}
    </LuxuryPressable>
  );
}

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#004AAD" },
        headerTintColor: "#FFCC00",
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
        tabBarActiveTintColor: "#004AAD",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#E7EAF1",
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        tabBarButton: (props) => <LuxuryTabBarButton {...props} />,
        animation: "shift",
        headerRight: () => <LanguageToggle onDark />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("ฝึก", "Practice"), headerTitle: "English Plan" }} />
      <Tabs.Screen name="profile" options={{ title: t("โปรไฟล์", "Profile") }} />
    </Tabs>
  );
}
