import * as Haptics from "expo-haptics";
import { type ReactNode } from "react";
import {
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { sfxSubmit, sfxTap } from "../lib/exam-sfx-mobile";
import { LUXURY_SPRING_PRESS, LUXURY_SPRING_RELEASE } from "../lib/luxury-motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type LuxurySound = "tap" | "submit" | "none";

export function LuxuryPressable({
  children,
  style,
  sound = "tap",
  haptic = true,
  scaleTo = 0.96,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  sound?: LuxurySound;
  haptic?: boolean;
  /** Press-in scale (1 = no scale). */
  scaleTo?: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const playSound = () => {
    if (sound === "submit") sfxSubmit();
    else if (sound === "tap") sfxTap();
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[animatedStyle, style, disabled ? styles.disabled : null]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, LUXURY_SPRING_PRESS);
        if (haptic && !disabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, LUXURY_SPRING_RELEASE);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (disabled) return;
        playSound();
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
});
