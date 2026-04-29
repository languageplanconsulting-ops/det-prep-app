/**
 * Client-side weekly quota for VIP AI feedback (Write about photo, Read then write/speak,
 * Speak about photo, Dialogue summary, Interactive speaking). Resets each local-calendar Monday; does not roll over.
 */

export const VIP_AI_FEEDBACK_WEEKLY_LIMIT = 15;

/** One full interactive speaking session costs one weekly VIP use. */
export const VIP_INTERACTIVE_SPEAKING_API_CALLS_PER_SESSION = 1;

const STORAGE_KEY = "ep-vip-ai-feedback-weekly-v1";
export const VIP_API_CREDIT_NOTICE_EVENT = "ep-vip-api-credit-notice";

type AiQuotaMessageArgs = {
  remaining: number;
  limit: number;
  used: number;
  weeklyRenewsAt?: string | null;
  monthlyRenewsAt?: string | null;
  extraRemaining?: number;
  extraExpiresAt?: string | null;
  cost?: number;
};

type VipApiCreditNoticeDetail = {
  remaining: number;
  limit: number;
  resetOn: { th: string; en: string };
  used?: number;
  weeklyRenewsAt?: string | null;
  monthlyRenewsAt?: string | null;
  extraRemaining?: number;
  extraExpiresAt?: string | null;
};

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

function formatDateTimeShort(iso: string | null | undefined, locale: "th-TH" | "en-US"): string {
  if (!iso) return locale === "th-TH" ? "ไม่มีวันที่กำหนด" : "No fixed date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return locale === "th-TH" ? "ไม่มีวันที่กำหนด" : "No fixed date";
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString(locale);
  }
}

export function getNextLocalMondayLabels(now = new Date()): { th: string; en: string } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const daysUntilNextMonday = ((8 - dow) % 7) || 7;
  d.setDate(d.getDate() + daysUntilNextMonday);
  return { th: formatDateShortTh(d), en: formatDateShortEn(d) };
}

export function emitVipApiCreditNotice(
  remaining: number,
  limit = VIP_AI_FEEDBACK_WEEKLY_LIMIT,
  detail?: Omit<VipApiCreditNoticeDetail, "remaining" | "limit" | "resetOn">,
): void {
  if (typeof window === "undefined") return;
  const resetOn = getNextLocalMondayLabels();
  window.dispatchEvent(
    new CustomEvent<VipApiCreditNoticeDetail>(VIP_API_CREDIT_NOTICE_EVENT, {
      detail: {
        remaining,
        limit,
        resetOn,
        used: Math.max(0, Number(detail?.used ?? 0)),
        weeklyRenewsAt: detail?.weeklyRenewsAt ?? null,
        monthlyRenewsAt: detail?.monthlyRenewsAt ?? null,
        extraRemaining: Math.max(0, Number(detail?.extraRemaining ?? 0)),
        extraExpiresAt: detail?.extraExpiresAt ?? null,
      },
    }),
  );
}

export function thExhaustedQuotaMessage(args?: Partial<AiQuotaMessageArgs>): string {
  const weeklyReset = formatDateTimeShort(args?.weeklyRenewsAt ?? null, "en-US");
  const monthlyReset = formatDateTimeShort(args?.monthlyRenewsAt ?? null, "en-US");
  return [
    "AI credit ของคุณไม่พอสำหรับการส่งตรวจครั้งนี้",
    `• เหลือรวมตอนนี้: ${Math.max(0, Number(args?.remaining ?? 0))}/${Math.max(0, Number(args?.limit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT))}`,
    args?.weeklyRenewsAt ? `• รีเซ็ตรอบสัปดาห์: ${formatDateTimeShort(args.weeklyRenewsAt, "th-TH")}` : null,
    args?.monthlyRenewsAt ? `• รอบแพ็กเกจ/รายเดือนถึง: ${formatDateTimeShort(args.monthlyRenewsAt, "th-TH")}` : null,
    "",
    "You do not have enough AI credit for this submit.",
    `• Left now: ${Math.max(0, Number(args?.remaining ?? 0))}/${Math.max(0, Number(args?.limit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT))}`,
    args?.weeklyRenewsAt ? `• Weekly renew: ${weeklyReset}` : null,
    args?.monthlyRenewsAt ? `• Monthly/package cycle: ${monthlyReset}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** `remaining` = uses left before this submit (same as limit - used). */
export function thConfirmBeforeAiSubmit(args: AiQuotaMessageArgs): string {
  const remaining = Math.max(0, Number(args.remaining ?? 0));
  const limit = Math.max(0, Number(args.limit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT));
  const used = Math.max(0, Number(args.used ?? 0));
  const extraRemaining = Math.max(0, Number(args.extraRemaining ?? 0));
  return [
    `การส่งตรวจครั้งนี้จะใช้ AI credit ${Math.max(1, Number(args.cost ?? 1))} ครั้ง`,
    "",
    "สรุปสิทธิ์ของคุณตอนนี้",
    `• เหลือรวมตอนนี้: ${remaining}/${limit}`,
    `• ใช้ไปแล้ว: ${used}`,
    args.weeklyRenewsAt ? `• รีเซ็ตรอบสัปดาห์: ${formatDateTimeShort(args.weeklyRenewsAt, "th-TH")}` : null,
    args.monthlyRenewsAt ? `• รอบแพ็กเกจ/รายเดือนถึง: ${formatDateTimeShort(args.monthlyRenewsAt, "th-TH")}` : null,
    `• เครดิตเพิ่มที่ใช้งานได้: ${extraRemaining}`,
    extraRemaining > 0 && args.extraExpiresAt
      ? `• เครดิตเพิ่มหมดอายุเร็วสุด: ${formatDateTimeShort(args.extraExpiresAt, "th-TH")}`
      : null,
    "",
    `This submit will use ${Math.max(1, Number(args.cost ?? 1))} AI credit.`,
    "",
    "Your credit summary right now",
    `• Left now: ${remaining}/${limit}`,
    `• Used so far: ${used}`,
    args.weeklyRenewsAt ? `• Weekly renew: ${formatDateTimeShort(args.weeklyRenewsAt, "en-US")}` : null,
    args.monthlyRenewsAt ? `• Monthly/package cycle: ${formatDateTimeShort(args.monthlyRenewsAt, "en-US")}` : null,
    `• Active extra credits: ${extraRemaining}`,
    extraRemaining > 0 && args.extraExpiresAt
      ? `• Earliest extra expiry: ${formatDateTimeShort(args.extraExpiresAt, "en-US")}`
      : null,
    "",
    "Submit now?",
  ]
    .filter(Boolean)
    .join("\n");
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
export function thInteractiveSpeakingStartConfirm(args: AiQuotaMessageArgs): string {
  const remaining = Math.max(0, Number(args.remaining ?? 0));
  const limit = Math.max(0, Number(args.limit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT));
  const used = Math.max(0, Number(args.used ?? 0));
  const extraRemaining = Math.max(0, Number(args.extraRemaining ?? 0));
  return [
    "เริ่มแบบฝึกพูดโต้ตอบได้เลย ระบบยังไม่ตัดสิทธิ์ตอนนี้",
    `สิทธิ์ ${Math.max(1, Number(args.cost ?? 1))} ครั้งจะถูกนับเมื่อคุณทำครบและกดส่งให้ตรวจ`,
    "",
    "สรุปสิทธิ์ของคุณตอนนี้",
    `• เหลือรวมตอนนี้: ${remaining}/${limit}`,
    `• ใช้ไปแล้ว: ${used}`,
    args.weeklyRenewsAt ? `• รีเซ็ตรอบสัปดาห์: ${formatDateTimeShort(args.weeklyRenewsAt, "th-TH")}` : null,
    args.monthlyRenewsAt ? `• รอบแพ็กเกจ/รายเดือนถึง: ${formatDateTimeShort(args.monthlyRenewsAt, "th-TH")}` : null,
    `• เครดิตเพิ่มที่ใช้งานได้: ${extraRemaining}`,
    extraRemaining > 0 && args.extraExpiresAt
      ? `• เครดิตเพิ่มหมดอายุเร็วสุด: ${formatDateTimeShort(args.extraExpiresAt, "th-TH")}`
      : null,
    "",
    "You can start now. No credit is used yet.",
    `The ${Math.max(1, Number(args.cost ?? 1))} AI credit will be counted only when you finish and submit for feedback.`,
    "",
    "Your credit summary right now",
    `• Left now: ${remaining}/${limit}`,
    `• Used so far: ${used}`,
    args.weeklyRenewsAt ? `• Weekly renew: ${formatDateTimeShort(args.weeklyRenewsAt, "en-US")}` : null,
    args.monthlyRenewsAt ? `• Monthly/package cycle: ${formatDateTimeShort(args.monthlyRenewsAt, "en-US")}` : null,
    `• Active extra credits: ${extraRemaining}`,
    extraRemaining > 0 && args.extraExpiresAt
      ? `• Earliest extra expiry: ${formatDateTimeShort(args.extraExpiresAt, "en-US")}`
      : null,
    "",
    "Continue?",
  ]
    .filter(Boolean)
    .join("\n");
}
