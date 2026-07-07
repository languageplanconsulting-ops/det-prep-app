import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "ep-campus-lesson-done";

async function readRaw(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(KEY);
    }
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function writeRaw(value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(KEY, value);
      return;
    }
    await SecureStore.setItemAsync(KEY, value);
  } catch {
    /* ignore */
  }
}

export async function getCompletedScenarioIds(): Promise<Set<string>> {
  const raw = await readRaw();
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export async function markScenarioCompleted(scenarioId: string): Promise<void> {
  const done = await getCompletedScenarioIds();
  done.add(scenarioId);
  await writeRaw(JSON.stringify([...done]));
}
