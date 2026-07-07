import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "ep-admin-token";

export async function getAdminToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(STORAGE_KEY);
    }
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setAdminToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(STORAGE_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
}

export async function clearAdminToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
