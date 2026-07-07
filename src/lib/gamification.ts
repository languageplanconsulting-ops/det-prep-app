/**
 * Web port of det-mobile/src/lib/gamification.ts — same "dopamine loop"
 * store: XP, daily goal, streaks, and the named tier ladder. Reads/writes
 * the SAME shared `app_state_blobs` row (key "gamification_v1") mobile
 * already syncs to, with the SAME merge rule (best xpTotal wins, most
 * recent lastActiveDay wins for streak fields) — so XP earned on web adds
 * to the same lifetime total shown on mobile and vice versa. localStorage-
 * first (mirrors mobile's AsyncStorage-first) for instant reads.
 */
import { getBrowserSupabase } from "@/lib/supabase-browser";

const KEY = "ep_gamification_v1";
const BLOB_KEY = "gamification_v1";
const DEFAULT_GOAL = 30;

export type Stats = {
  xpTotal: number;
  xpToday: number;
  xpDay: string;
  streak: number;
  longestStreak: number;
  lastActiveDay: string | null;
  dailyGoal: number;
  tierXp: number;
  tierDecaySteps: number;
};

export type AwardResult = {
  stats: Stats;
  gained: number;
  streakIncreased: boolean;
  goalJustReached: boolean;
  leveledUp: boolean;
};

const EMPTY: Stats = {
  xpTotal: 0,
  xpToday: 0,
  xpDay: "",
  streak: 0,
  longestStreak: 0,
  lastActiveDay: null,
  dailyGoal: DEFAULT_GOAL,
  tierXp: 0,
  tierDecaySteps: 0,
};

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Named XP tiers — same ladder as mobile, see det-mobile/src/lib/gamification.ts. */
export const TIERS: { name: string; emoji: string; xp: number; blurb: string }[] = [
  { name: "Beginner", emoji: "🌱", xp: 175, blurb: "เพิ่งเริ่มต้นเส้นทาง DET — ทุกคนเริ่มจากตรงนี้" },
  { name: "Explorer", emoji: "🧭", xp: 350, blurb: "เริ่มคุ้นเคยกับรูปแบบข้อสอบและฝึกสม่ำเสมอ" },
  { name: "Builder", emoji: "🔨", xp: 625, blurb: "กำลังสร้างพื้นฐานให้แน่น ทักษะเริ่มเป็นรูปเป็นร่าง" },
  { name: "Achiever", emoji: "🎯", xp: 1063, blurb: "ทำคะแนนได้สม่ำเสมอ ใกล้ระดับที่พร้อมสอบจริงมากขึ้น" },
  { name: "Scholar", emoji: "📘", xp: 1750, blurb: "เข้าใจภาพรวมข้อสอบลึกซึ้ง พร้อมรับมือโจทย์ยาก" },
  { name: "Expert", emoji: "🏆", xp: 2750, blurb: "ฝึกมาอย่างหนัก ความสามารถอยู่ในระดับสูง" },
  { name: "Master", emoji: "👑", xp: 4250, blurb: "ระดับสูงสุด — ฝึกมาอย่างต่อเนื่องจนเชี่ยวชาญจริง" },
];

export type TierInfo = {
  index: number;
  name: string;
  emoji: string;
  xp: number;
  next: { name: string; xp: number } | null;
};

export function tierFromXp(xp: number): TierInfo {
  let idx = -1;
  for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i]!.xp) idx = i;
  if (idx === -1) {
    return { index: -1, name: "Newcomer", emoji: "🐣", xp: 0, next: { name: TIERS[0]!.name, xp: TIERS[0]!.xp } };
  }
  const next = TIERS[idx + 1];
  return {
    index: idx,
    name: TIERS[idx]!.name,
    emoji: TIERS[idx]!.emoji,
    xp: TIERS[idx]!.xp,
    next: next ? { name: next.name, xp: next.xp } : null,
  };
}

export function tierProgress(xp: number): { tier: TierInfo; into: number; need: number; pct: number } {
  const tier = tierFromXp(xp);
  const floor = tier.index === -1 ? 0 : tier.xp;
  if (!tier.next) return { tier, into: xp - floor, need: 0, pct: 1 };
  const need = tier.next.xp - floor;
  const into = Math.max(0, xp - floor);
  return { tier, into, need, pct: Math.max(0, Math.min(1, into / need)) };
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

function readLocal(): Stats {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Stats>;
    return { ...EMPTY, ...migrateTierXp(parsed) };
  } catch {
    return EMPTY;
  }
}

function writeLocal(s: Stats): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — in-memory cache still covers this session */
  }
}

function migrateTierXp(parsed: Partial<Stats>): Partial<Stats> {
  if (typeof parsed.tierXp === "number") return parsed;
  return { ...parsed, tierXp: parsed.xpTotal ?? 0, tierDecaySteps: 0 };
}

/** Pick whichever record is "further along" — same rule as mobile's mergeStats. */
function mergeStats(a: Stats, b: Stats): Stats {
  const winner = (a.lastActiveDay ?? "") >= (b.lastActiveDay ?? "") ? a : b;
  const streak = winner.streak;
  return {
    ...winner,
    xpTotal: Math.max(a.xpTotal, b.xpTotal),
    longestStreak: Math.max(a.longestStreak, b.longestStreak, streak),
    dailyGoal: a.dailyGoal || b.dailyGoal || DEFAULT_GOAL,
  };
}

async function pullBlob(userId: string): Promise<Stats | null> {
  try {
    const supabase = getBrowserSupabase();
    if (!supabase) return null;
    const { data } = await supabase
      .from("app_state_blobs")
      .select("state")
      .eq("user_id", userId)
      .eq("key", BLOB_KEY)
      .maybeSingle();
    return (data?.state as Stats) ?? null;
  } catch {
    return null;
  }
}

async function pushBlob(userId: string, state: Stats): Promise<void> {
  try {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.from("app_state_blobs").upsert({ user_id: userId, key: BLOB_KEY, state }, { onConflict: "user_id,key" });
  } catch {
    // best-effort — local copy already has it
  }
}

/**
 * Reads local storage and, when a userId is given, merges in the remote
 * best-effort snapshot — same best-of rule as mobile either way. Rolls the
 * daily counter over if a new day started since the last read.
 */
export async function loadStats(userId?: string | null): Promise<Stats> {
  let s = readLocal();
  if (userId) {
    const remote = await pullBlob(userId);
    if (remote) {
      s = mergeStats(s, { ...EMPTY, ...migrateTierXp(remote) });
    } else {
      pushBlob(userId, s).catch(() => {});
    }
  }
  const today = dayKey();
  if (s.xpDay !== today) s = { ...s, xpDay: today, xpToday: 0 };
  writeLocal(s);
  return s;
}

/** Award XP for completing something — same formula/streak/day-rollover rules as mobile. */
export async function awardXp(userId: string | null | undefined, amount: number): Promise<AwardResult> {
  const before = await loadStats(userId);
  const today = dayKey();

  const goalWasReached = before.xpDay === today && before.xpToday >= before.dailyGoal;
  const xpToday = (before.xpDay === today ? before.xpToday : 0) + amount;

  let streak = before.streak;
  let streakIncreased = false;
  const isNewActiveDay = before.lastActiveDay !== today;
  if (isNewActiveDay) {
    streak = before.lastActiveDay === yesterdayKey() ? before.streak + 1 : 1;
    streakIncreased = true;
  }

  const xpTotal = before.xpTotal + amount;
  const tierXp = Math.min(xpTotal, (before.tierXp ?? before.xpTotal) + amount);
  const next: Stats = {
    ...before,
    xpTotal,
    xpToday,
    xpDay: today,
    streak,
    longestStreak: Math.max(before.longestStreak, streak),
    lastActiveDay: today,
    tierXp,
    tierDecaySteps: isNewActiveDay ? 0 : before.tierDecaySteps,
  };
  writeLocal(next);
  if (userId) pushBlob(userId, next).catch(() => {});

  return {
    stats: next,
    gained: amount,
    streakIncreased,
    goalJustReached: !goalWasReached && xpToday >= next.dailyGoal,
    leveledUp: tierFromXp(tierXp).index > tierFromXp(before.tierXp ?? before.xpTotal).index,
  };
}

/** XP rewards per activity type — same table as mobile. */
export const XP = {
  auto: (scorePct: number) => 10 + Math.round(Math.max(0, Math.min(100, scorePct)) / 10),
  production: 25,
  mock: 50,
  mini: 40,
} as const;
