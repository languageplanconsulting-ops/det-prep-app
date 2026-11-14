export type TaskVariant = "mock" | "mini";

export type TaskProps = {
  content: Record<string, unknown>;
  submitting: boolean;
  /** The step clock hit 00:00 — hand in what the learner has (mock only). */
  timeUp: boolean;
  variant: TaskVariant;
  onSubmit: (payload: unknown) => void;
  /** Start the (paused) step clock: dictation after the first listen, photo once shown. */
  onReady?: () => void;
};

export const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

export const firstStr = (...vals: unknown[]): string => {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
};

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** `Number(x ?? d) || d` — the website's tolerant numeric config read. */
export function num(v: unknown, d: number): number {
  return Number(v ?? d) || d;
}

export const stripMarkers = (s: string): string => s.replace(/\*\*(.+?)\*\*/g, "$1");
