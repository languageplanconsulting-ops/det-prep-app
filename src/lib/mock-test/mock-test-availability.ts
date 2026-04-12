/** Mock test opens on this date (Bangkok, start of day). */
const MOCK_TEST_LIVE_AT_MS = new Date("2026-04-22T00:00:00+07:00").getTime();

/**
 * Learners may start the full mock test. Admins can preview anytime (see API + start page).
 * Set `NEXT_PUBLIC_MOCK_TEST_CLOSED=true` to keep it off for learners until you clear it.
 */
export function isMockTestAvailableNow(): boolean {
  if (process.env.NEXT_PUBLIC_MOCK_TEST_CLOSED === "true") return false;
  if (process.env.NEXT_PUBLIC_MOCK_TEST_PUBLIC_LAUNCH === "true") return true;
  if (Number.isNaN(MOCK_TEST_LIVE_AT_MS)) return true;
  return Date.now() >= MOCK_TEST_LIVE_AT_MS;
}

/** Practice hub tile — matches launch / closed flags (admins can still open /mock-test/start). */
export function mockTestHubProgressLabel(): string {
  if (process.env.NEXT_PUBLIC_MOCK_TEST_CLOSED === "true") return "Coming soon";
  if (isMockTestAvailableNow()) return "Available";
  return "Opens 22 Apr 2026";
}

export const MOCK_TEST_LAUNCH_MESSAGE_EN =
  "Full mock test will be available on 22 April 2026. The English Plan team is working hard to get it ready for you.";

export const MOCK_TEST_LAUNCH_MESSAGE_TH =
  "แบบทดสอบจำลองเต็มรูปแบบจะเปิดให้ใช้งานในวันที่ 22 เมษายน 2026 ทีม English Plan กำลังทุ่มเทพัฒนาให้พร้อมสำหรับนักเรียน";
