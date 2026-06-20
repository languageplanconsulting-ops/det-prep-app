// Client-safe types + pure helpers for teacher speaking samples.
// (The server-only DB/storage helpers live in speaking-samples.ts.)

export const SPEAKING_SAMPLES_BUCKET = "speaking-samples";

export type SampleTargetKind =
  | "standalone_read_then_speak"
  | "standalone_speak_about_photo"
  | "standalone_interactive_speaking"
  | "mock_fixed_item";

export type SampleQuestionType =
  | "read_then_speak"
  | "speak_about_photo"
  | "interactive_speaking";

export const SAMPLE_TARGET_KINDS: SampleTargetKind[] = [
  "standalone_read_then_speak",
  "standalone_speak_about_photo",
  "standalone_interactive_speaking",
  "mock_fixed_item",
];

export const SAMPLE_QUESTION_TYPES: SampleQuestionType[] = [
  "read_then_speak",
  "speak_about_photo",
  "interactive_speaking",
];

/** One subtitle line with media-relative timings (ms from recording start). */
export interface SubtitleCue {
  text: string;
  startMs: number;
  endMs: number;
}

export interface SampleTarget {
  kind: SampleTargetKind;
  ref: string;
  questionType: SampleQuestionType;
}

export interface SpeakingSample {
  id: string;
  targetKind: SampleTargetKind;
  targetRef: string;
  questionType: SampleQuestionType;
  storagePath: string;
  mime: string;
  durationMs: number | null;
  subtitleCues: SubtitleCue[];
  title: string | null;
  notes: string | null;
  status: "uploading" | "ready" | "failed";
  createdAt: string;
  /** Present only when returned through the user-facing (VIP-gated) API. */
  videoUrl?: string;
}

export function isSampleTargetKind(v: unknown): v is SampleTargetKind {
  return typeof v === "string" && (SAMPLE_TARGET_KINDS as string[]).includes(v);
}

export function isSampleQuestionType(v: unknown): v is SampleQuestionType {
  return typeof v === "string" && (SAMPLE_QUESTION_TYPES as string[]).includes(v);
}

/** Validate + normalise an array of subtitle cues (used on both client and server). */
export function normalizeSubtitleCues(raw: unknown): SubtitleCue[] {
  if (!Array.isArray(raw)) return [];
  const cues: SubtitleCue[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const text = typeof r.text === "string" ? r.text.trim() : "";
    const startMs = Number(r.startMs);
    const endMs = Number(r.endMs);
    if (!text) continue;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    cues.push({
      text,
      startMs: Math.max(0, Math.round(startMs)),
      endMs: Math.max(0, Math.round(endMs)),
    });
  }
  return cues.sort((a, b) => a.startMs - b.startMs);
}

/** The active cue for a given media time (ms), or null. */
export function activeCueAt(cues: SubtitleCue[], timeMs: number): SubtitleCue | null {
  for (const cue of cues) {
    if (timeMs >= cue.startMs && timeMs <= cue.endMs) return cue;
  }
  return null;
}
