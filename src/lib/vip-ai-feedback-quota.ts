/**
 * Client-side weekly quota for VIP AI feedback (Write about photo, Read then write/speak,
 * Speak about photo, Dialogue summary, Interactive speaking). Resets each local-calendar Monday; does not roll over.
 */

export const VIP_AI_FEEDBACK_WEEKLY_LIMIT = 15;

/** One full interactive speaking session costs one weekly VIP use. */
export const VIP_INTERACTIVE_SPEAKING_API_CALLS_PER_SESSION = 1;

const STORAGE_KEY = "ep-vip-ai-feedback-weekly-v1";
export const VIP_API_CREDIT_NOTICE_EVENT = "ep-vip-api-credit-notice";

/** Monday date of current week in the user's local timezone (YYYY-MM-DD). */
export function getLocalWeekStartMondayString(d = new Date()): string {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = date.getDay(); // 0 Sun … 6 Sat
  const daysSinceMonday = (dow + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function pruneUsageMap(map: Record<string, number>): Record<string, number> {
  const mondayStr = getLocalWeekStartMondayString();
  const anchor = parseLocalYmd(mondayStr);
  if (!anchor) return map;
  const cutoff = new Date(anchor);
  cutoff.setDate(cutoff.getDate() - 7 * 8); // keep ~8 weeks
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    const pipe = k.lastIndexOf("|");
    if (pipe < 0) continue;
    const datePart = k.slice(pipe + 1);
    const dt = parseLocalYmd(datePart);
    if (!dt || dt < cutoff) continue;
    out[k] = v;
  }
  return out;
}

function compositeKey(userId: string): string {
  return `${userId}|${getLocalWeekStartMondayString()}`;
}

function loadMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return {};
    return p as Record<string, number>;
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getVipWeeklyAiFeedbackUses(userId: string): number {
  const map = pruneUsageMap(loadMap());
  saveMap(map);
  return map[compositeKey(userId)] ?? 0;
}

export function recordVipAiFeedbackUse(userId: string): void {
  addVipAiFeedbackUses(userId, 1);
}

/** Increment weekly count by `delta` (e.g. several API calls in one interactive speaking session). */
export function addVipAiFeedbackUses(userId: string, delta: number): void {
  if (delta <= 0) return;
  const map = pruneUsageMap(loadMap());
  const key = compositeKey(userId);
  map[key] = (map[key] ?? 0) + delta;
  saveMap(map);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ep-vip-ai-quota-changed"));
  }
}

export function getVipWeeklyAiFeedbackRemaining(userId: string): number {
  return Math.max(0, VIP_AI_FEEDBACK_WEEKLY_LIMIT - getVipWeeklyAiFeedbackUses(userId));
}

function formatDateShortTh(d: Date): string {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function formatDateShortEn(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function getNextLocalMondayLabels(now = new Date()): { th: string; en: string } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const daysUntilNextMonday = ((8 - dow) % 7) || 7;
  d.setDate(d.getDate() + daysUntilNextMonday);
  return { th: formatDateShortTh(d), en: formatDateShortEn(d) };
}

export function emitVipApiCreditNotice(remaining: number, limit = VIP_AI_FEEDBACK_WEEKLY_LIMIT): void {
  if (typeof window === "undefined") return;
  const resetOn = getNextLocalMondayLabels();
  window.dispatchEvent(
    new CustomEvent(VIP_API_CREDIT_NOTICE_EVENT, {
      detail: {
        remaining,
        limit,
        resetOn,
      },
    }),
  );
}

export function thExhaustedQuotaMessage(): string {
  return `AI FEEDBACK: VIP users can submit up to ${VIP_AI_FEEDBACK_WEEKLY_LIMIT} times per week.\n\nYou have reached the weekly limit.\n\nThis resets every Monday (local time).`;
}

/** `remaining` = uses left before this submit (same as limit - used). */
export function thConfirmBeforeAiSubmit(remaining: number): string {
  return `AI FEEDBACK: VIP users can submit up to ${VIP_AI_FEEDBACK_WEEKLY_LIMIT} times per week.\n\nRemaining this week: ${remaining}/${VIP_AI_FEEDBACK_WEEKLY_LIMIT}\n\nDo you want to submit now?`;
}

export const TH_QUOTA_BANNER_LINE = (remaining: number, limit: number) =>
  `สัปดาห์นี้เหลือสิทธิ์ AI feedback อีก ${remaining} ครั้ง จาก ${limit} ครั้ง (สำหรับสมาชิก VIP)`;

export const TH_QUOTA_NO_ROLLOVER =
  "โควต้าไม่สะสม: ถ้าไม่ใช้ครบในสัปดาห์นี้ สิทธิ์ที่เหลือจะไม่ย้ายไปสัปดาห์ถัดไป และจะรีเซ็ตใหม่ทุกวันจันทร์ตามเวลาเครื่องของคุณ";

export const TH_QUOTA_COVERED_PARTS_TH =
  "นับรวม: เขียนเกี่ยวกับรูป · อ่านแล้วเขียน · อ่านแล้วพูด · พูดเกี่ยวกับรูป · สรุปบทสนทนา · พูดโต้ตอบ (นับ 1 ครั้งต่อ 1 session)";

export function thInteractiveSpeakingInsufficientCredits(need: number, have: number): string {
  return `สมาชิก VIP: พูดโต้ตอบใช้สิทธิ์ AI ${need} ครั้งต่อรอบ แต่สัปดาห์นี้เหลืออีก ${have} ครั้ง—รอรีเซ็ตวันจันทร์หรือใช้สิทธิ์ให้ว่างก่อน`;
}

/** Shown once when starting interactive speaking (VIP). */
export function thInteractiveSpeakingStartConfirm(cost: number, remainingBefore: number): string {
  return `AI (VIP): เริ่มแบบฝึกพูดโต้ตอบได้เลย ระบบยังไม่ตัดสิทธิ์ตอนนี้\n\nสิทธิ์ ${cost} ครั้งจะถูกนับเมื่อคุณทำครบและกดส่งให้ตรวจ\n\nสัปดาห์นี้เหลือ ${remainingBefore}/${VIP_AI_FEEDBACK_WEEKLY_LIMIT} ครั้งก่อนเริ่มรอบนี้`;
}
