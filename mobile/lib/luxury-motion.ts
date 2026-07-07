/** Shared spring + timing — slow, plush Duolingo-like feel. */
export const LUXURY_SPRING_PRESS = {
  damping: 16,
  stiffness: 280,
  mass: 0.85,
} as const;

export const LUXURY_SPRING_RELEASE = {
  damping: 14,
  stiffness: 220,
  mass: 0.9,
} as const;

export const LUXURY_NAV_DELAY_MS = 140;
export const LUXURY_STACK_ANIMATION_MS = 420;
