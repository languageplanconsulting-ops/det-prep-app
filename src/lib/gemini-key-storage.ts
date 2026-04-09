/** Browser-only storage for a personal Gemini key (no .env needed). */

export const GEMINI_KEY_STORAGE = "ep-gemini-api-key";

export function getStoredGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() ?? "";
}

export function setStoredGeminiKey(key: string): void {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
}

export function clearStoredGeminiKey(): void {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
}
