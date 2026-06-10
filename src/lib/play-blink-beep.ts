import { sfxTap } from "@/lib/exam-sfx";

/**
 * Legacy tap sound. Now delegates to the unified, friendlier exam-sfx "pop"
 * (punchy/playful, mute-aware) so every existing call site upgrades at once.
 */
export function playBlinkBeep(): void {
  sfxTap();
}
