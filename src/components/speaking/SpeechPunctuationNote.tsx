/**
 * Shown under every spoken-answer transcript box.
 *
 * Learners read their raw speech-to-text back and panic about the missing commas and full
 * stops, then waste time hand-punctuating before submitting. They don't need to: every
 * speaking grader carries a mandatory punctuation policy (see the PUNCTUATION POLICY block in
 * lib/gemini-speaking.ts) that disregards punctuation, capitalization and spelling, because
 * those were chosen by the transcription engine, not the learner. This note says so.
 */
export function SpeechPunctuationNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-lg bg-emerald-50 px-3 py-2 text-[11.5px] leading-5 text-emerald-900 ring-1 ring-emerald-100 ${className}`}
    >
      ✓ ไม่ต้องกังวลเรื่องเครื่องหมายวรรคตอนนะครับ — ระบบบันทึกคำตอบนี้เป็น{" "}
      <strong>&ldquo;คำพูด&rdquo;</strong> การตรวจจะไม่หักคะแนนจากจุด ลูกน้ำ
      หรือตัวพิมพ์ใหญ่-เล็กเลยครับ ขอแค่เนื้อหาที่พูดถูกต้องก็พอ
    </p>
  );
}
