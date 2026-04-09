import { PHASE_TIME_LIMIT_SECONDS } from "@/lib/mock-test/constants";

export function getPhaseTimeLimitSeconds(phase: number): number {
  return PHASE_TIME_LIMIT_SECONDS[phase] ?? 300;
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
