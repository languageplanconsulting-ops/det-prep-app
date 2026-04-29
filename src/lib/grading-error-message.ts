export function normalizeGradingErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Grading request failed";
  if (/quota has been exceeded|quota exceeded|resource_exhausted|429|too many requests/i.test(raw)) {
    return "The AI checker is temporarily busy or over quota on our side. Your personal AI credit was not deducted. Please try again in a few minutes. / ระบบตรวจ AI ฝั่งผู้ให้บริการเต็มชั่วคราว และยังไม่ได้ตัดเครดิตของผู้เรียน กรุณาลองใหม่อีกครั้งในอีกไม่กี่นาที";
  }
  return raw;
}
