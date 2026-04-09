/** Mock test opens on this date (Bangkok, start of day). */
const MOCK_TEST_LIVE_AT_MS = new Date("2026-04-22T00:00:00+07:00").getTime();

export function isMockTestAvailableNow(): boolean {
  if (Number.isNaN(MOCK_TEST_LIVE_AT_MS)) return true;
  return Date.now() >= MOCK_TEST_LIVE_AT_MS;
}

export const MOCK_TEST_LAUNCH_MESSAGE_EN =
  "Full mock test will be available on 22 April 2026. The English Plan team is working hard to get it ready for you.";

export const MOCK_TEST_LAUNCH_MESSAGE_TH =
  "แบบทดสอบจำลองเต็มรูปแบบจะเปิดให้ใช้งานในวันที่ 22 เมษายน 2026 ทีม English Plan กำลังทุ่มเทพัฒนาให้พร้อมสำหรับนักเรียน";
