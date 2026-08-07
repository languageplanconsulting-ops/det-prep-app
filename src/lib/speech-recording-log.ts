import "server-only";

import { bunnyStorageUpload, buildSpeechRecordingPath, isBunnyStorageConfigured } from "@/lib/bunny-storage";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type SpeechRecordingLogInput = {
  userId: string | null;
  source: string; // e.g. "speech-transcribe"
  audioBase64: string;
  mimeType: string;
  transcript: string | null;
};

/**
 * Shadow-logs one speech submission: uploads the raw audio to Bunny Storage
 * and records a row in `speech_recordings` pointing at it. Fire-and-forget
 * from route handlers (mirrors scheduleApiUsageLog) — never blocks or fails
 * the actual transcription response the learner is waiting on.
 *
 * No-ops quietly if Bunny Storage isn't configured yet (BUNNY_STORAGE_ZONE/
 * BUNNY_STORAGE_KEY unset), so this is safe to call everywhere before those
 * env vars are provisioned.
 */
export async function logSpeechRecording(input: SpeechRecordingLogInput): Promise<void> {
  if (!isBunnyStorageConfigured()) return;

  let supabase;
  try {
    supabase = createServiceRoleSupabase();
  } catch (e) {
    console.warn("[speech_recordings] skip (no service role)", e instanceof Error ? e.message : e);
    return;
  }

  const path = buildSpeechRecordingPath(input.userId, input.mimeType);
  const buffer = Buffer.from(input.audioBase64, "base64");

  await bunnyStorageUpload(path, buffer, input.mimeType.split(";")[0]!.trim());

  const { error } = await supabase.from("speech_recordings").insert({
    user_id: input.userId,
    source: input.source,
    audio_path: path,
    mime_type: input.mimeType,
    transcript: input.transcript,
  });
  if (error) {
    console.error("[speech_recordings] insert", error.message);
  }
}

export function scheduleSpeechRecordingLog(input: SpeechRecordingLogInput): void {
  void logSpeechRecording(input).catch((e) =>
    console.error("[speech_recordings] async", e instanceof Error ? e.message : e),
  );
}
