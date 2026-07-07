import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

export async function ensureMicPermission(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === "granted";
}

export async function startTurnRecording(): Promise<Audio.Recording> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  return recording;
}

export async function stopTurnRecording(
  recording: Audio.Recording,
): Promise<{ base64: string; mimeType: string } | null> {
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  if (!uri) return null;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const mimeType = uri.endsWith(".caf") ? "audio/x-caf" : "audio/m4a";
  return { base64, mimeType };
}
