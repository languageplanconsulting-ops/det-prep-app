import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioRecorder,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { markPlaybackModeDirty } from "./audio-player";

export type TurnRecorder = AudioRecorder;

/** One recorder per screen; expo-audio releases it on unmount. */
export function useTurnRecorder(): TurnRecorder {
  return useAudioRecorder(RecordingPresets.HIGH_QUALITY);
}

export async function ensureMicPermission(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  return granted;
}

export async function startTurnRecording(recorder: TurnRecorder): Promise<TurnRecorder> {
  markPlaybackModeDirty();
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });
  await recorder.prepareToRecordAsync();
  recorder.record();
  return recorder;
}

async function blobUriToBase64(uri: string): Promise<{ base64: string; mimeType: string }> {
  const blob = await (await fetch(uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return {
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    mimeType: (blob.type || "audio/webm").split(";")[0],
  };
}

export async function stopTurnRecording(
  recorder: TurnRecorder,
): Promise<{ base64: string; mimeType: string } | null> {
  await recorder.stop();
  // Leave record mode so later playback uses the loudspeaker, not the earpiece.
  try {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  } catch {
    /* ignore */
  }
  const uri = recorder.uri;
  if (!uri) return null;
  if (Platform.OS === "web") return blobUriToBase64(uri);
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const mimeType = uri.endsWith(".caf") ? "audio/x-caf" : "audio/m4a";
  return { base64, mimeType };
}
