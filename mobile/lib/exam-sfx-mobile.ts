import { Audio } from "expo-av";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { notesToWavBase64, type SynthNote } from "./wav-synth";

const MUTE_KEY = "ep-mobile-sfx-muted";

const PRESETS: Record<string, SynthNote[]> = {
  tap: [{ f: 520, slideTo: 720, start: 0, dur: 0.09, vol: 0.1 }],
  navigate: [{ f: 380, slideTo: 920, start: 0, dur: 0.22, vol: 0.08 }],
  correct: [
    { f: 660, start: 0, dur: 0.1, vol: 0.09 },
    { f: 990, start: 0.08, dur: 0.14, vol: 0.09 },
  ],
  wrong: [{ f: 210, slideTo: 150, start: 0, dur: 0.18, vol: 0.07 }],
  reveal: [
    { f: 523, start: 0, dur: 0.12, vol: 0.08 },
    { f: 659, start: 0.1, dur: 0.12, vol: 0.08 },
    { f: 784, start: 0.2, dur: 0.12, vol: 0.08 },
    { f: 1047, start: 0.3, dur: 0.22, vol: 0.09 },
  ],
  submit: [{ f: 440, slideTo: 880, start: 0, dur: 0.18, vol: 0.08 }],
};

const uriCache: Partial<Record<keyof typeof PRESETS, string>> = {};
let audioModeReady = false;

async function readMutedFlag(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(MUTE_KEY) === "1";
    }
    const v = await SecureStore.getItemAsync(MUTE_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

async function writeMutedFlag(muted: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      return;
    }
    await SecureStore.setItemAsync(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export async function getSfxMuted(): Promise<boolean> {
  return readMutedFlag();
}

export async function setSfxMuted(muted: boolean): Promise<void> {
  await writeMutedFlag(muted);
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    shouldDuckAndroid: true,
  });
  audioModeReady = true;
}

async function uriForPreset(name: keyof typeof PRESETS): Promise<string> {
  const cached = uriCache[name];
  if (cached) return cached;

  const base64 = notesToWavBase64(PRESETS[name]);

  if (Platform.OS === "web") {
    const uri = `data:audio/wav;base64,${base64}`;
    uriCache[name] = uri;
    return uri;
  }

  const FileSystem = await import("expo-file-system/legacy");
  const path = `${FileSystem.cacheDirectory}ep-sfx-${name}.wav`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.writeAsStringAsync(path, base64, { encoding: "base64" });
  }
  uriCache[name] = path;
  return path;
}

export async function preloadMobileSfx(): Promise<void> {
  await ensureAudioMode();
  await Promise.all(
    (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => uriForPreset(k)),
  );
}

async function playPreset(name: keyof typeof PRESETS, volume = 0.85): Promise<void> {
  if (await getSfxMuted()) return;
  try {
    await ensureAudioMode();
    const uri = await uriForPreset(name);
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume },
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    /* silent fail — haptics still fire */
  }
}

export function sfxTap(): void {
  void playPreset("tap");
}

export function sfxNavigate(): void {
  void playPreset("navigate", 0.75);
}

export function sfxCorrect(): void {
  void playPreset("correct");
}

export function sfxWrong(): void {
  void playPreset("wrong");
}

export function sfxReveal(): void {
  void playPreset("reveal");
}

export function sfxSubmit(): void {
  void playPreset("submit");
}
