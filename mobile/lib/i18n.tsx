import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";

/**
 * Thai / English UI language. Thai is the default (most learners are Thai);
 * the choice is saved per device. Exam content itself stays in English.
 *
 * Usage: `const { t } = useI18n(); t("เริ่ม", "Start")` — Thai first, English second.
 */
export type Lang = "th" | "en";

const STORAGE_KEY = "ep-ui-lang";
const DEFAULT_LANG: Lang = "th";

async function readLang(): Promise<Lang | null> {
  try {
    const v =
      Platform.OS === "web"
        ? localStorage.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);
    return v === "th" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

async function writeLang(lang: Lang): Promise<void> {
  try {
    if (Platform.OS === "web") localStorage.setItem(STORAGE_KEY, lang);
    else await SecureStore.setItemAsync(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

type I18nState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Pick the string for the current language: t(thai, english). */
  t: (th: string, en: string) => string;
};

const I18nContext = createContext<I18nState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    void readLang().then((saved) => {
      if (saved) setLangState(saved);
    });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    void writeLang(next);
  }, []);

  const t = useCallback((th: string, en: string) => (lang === "th" ? th : en), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}

/** Difficulty label in the current language. */
export function difficultyLabel(t: I18nState["t"], d: string): string {
  if (d === "easy") return t("ง่าย", "Easy");
  if (d === "medium") return t("กลาง", "Medium");
  if (d === "hard") return t("ยาก", "Hard");
  return d;
}

/** "Round 2" / "รอบ 2". */
export function roundLabel(t: I18nState["t"], round: number | string): string {
  return t(`รอบ ${round}`, `Round ${round}`);
}

/** "max 85 pts" / "สูงสุด 85 คะแนน". */
export function maxPointsLabel(t: I18nState["t"], points: number): string {
  return t(`สูงสุด ${points} คะแนน`, `max ${points} pts`);
}

/** "Round 1 · Easy · max 85 pts" header used on set lists. */
export function setListHeader(
  t: I18nState["t"],
  round: number | string,
  difficulty: string,
  points: number,
): string {
  return `${roundLabel(t, round)} · ${difficultyLabel(t, difficulty)} · ${maxPointsLabel(t, points)}`;
}

/** "Round 1 · Easy · Set 3" line shown above an exercise. */
export function setLine(
  t: I18nState["t"],
  round: number | string,
  difficulty: string,
  setNumber: number | string,
): string {
  return `${roundLabel(t, round)} · ${difficultyLabel(t, difficulty)} · ${t(`ชุดที่ ${setNumber}`, `Set ${setNumber}`)}`;
}

/** "Score: 70/85" / "คะแนน: 70/85". */
export function scoreLine(t: I18nState["t"], score: number, max: number): string {
  return t(`คะแนน: ${score}/${max}`, `Score: ${score}/${max}`);
}

/**
 * Error code for a failed content load. Load callbacks store this instead of
 * calling t() — keeping t out of their deps so switching language never
 * reloads (and resets) an exercise in progress. Translate with errorText().
 */
export const LOAD_FAILED = "ep:load-failed";

export function errorText(t: I18nState["t"], error: string | null): string {
  if (!error || error === LOAD_FAILED) return t("โหลดข้อมูลไม่สำเร็จ", "Could not load this content");
  return error;
}
