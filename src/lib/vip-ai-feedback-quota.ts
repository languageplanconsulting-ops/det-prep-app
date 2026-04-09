/**
 * Client-side weekly quota for VIP AI feedback (Write about photo, Read then write/speak,
 * Speak about photo, Dialogue summary). Resets each local-calendar Monday; does not roll over.
 */

export const VIP_AI_FEEDBACK_WEEKLY_LIMIT = 15;

const STORAGE_KEY = "ep-vip-ai-feedback-weekly-v1";

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
  const map = pruneUsageMap(loadMap());
  const key = compositeKey(userId);
  map[key] = (map[key] ?? 0) + 1;
  saveMap(map);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ep-vip-ai-quota-changed"));
  }
}

export function thExhaustedQuotaMessage(): string {
  return `คุณใช้สิทธิ์ AI feedback ครบ ${VIP_AI_FEEDBACK_WEEKLY_LIMIT} ครั้งแล้วในสัปดาห์นี้ (รวมทุกพาร์ตที่ใช้ AI จากเซิร์ฟเวอร์ของเรา)\n\nโควต้าไม่สะสม — จะรีเซ็ตใหม่เมื่อเริ่มสัปดาห์ใหม่ (วันจันทร์ตามเวลาเครื่องของคุณ)\n\nโปรดลองใหม่ในสัปดาห์ถัดไปครับ`;
}

/** `remaining` = uses left before this submit (same as limit - used). */
export function thConfirmBeforeAiSubmit(remaining: number): string {
  return `สัปดาห์นี้คุณเหลือสิทธิ์ AI feedback อีก ${remaining} ครั้ง จาก ${VIP_AI_FEEDBACK_WEEKLY_LIMIT} ครั้ง\n\nโควต้าไม่สะสม — ถ้าไม่ใช้หมดในสัปดาห์นี้ จำนวนที่เหลือจะไม่ย้ายไปสัปดาห์ถัดไป และจะรีเซ็ตใหม่ทุกต้นสัปดาห์ (วันจันทร์ตามเวลาเครื่องของคุณ)\n\nยืนยันส่งให้ AI ประเมินครั้งนี้?`;
}

export const TH_QUOTA_BANNER_LINE = (remaining: number, limit: number) =>
  `สัปดาห์นี้เหลือสิทธิ์ AI feedback อีก ${remaining} ครั้ง จาก ${limit} ครั้ง (สำหรับสมาชิก VIP)`;

export const TH_QUOTA_NO_ROLLOVER =
  "โควต้าไม่สะสม: ถ้าไม่ใช้ครบในสัปดาห์นี้ สิทธิ์ที่เหลือจะไม่ย้ายไปสัปดาห์ถัดไป และจะรีเซ็ตใหม่ทุกวันจันทร์ตามเวลาเครื่องของคุณ";

export const TH_QUOTA_COVERED_PARTS_TH =
  "นับรวม: เขียนเกี่ยวกับรูป · อ่านแล้วเขียน · อ่านแล้วพูด · พูดเกี่ยวกับรูป · สรุปบทสนทนา (Dialogue summary)";
