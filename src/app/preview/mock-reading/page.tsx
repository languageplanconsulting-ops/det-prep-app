import { MockReadingPreview } from "@/components/mock-test/questions/MockReadingPreview";

/**
 * Admin preview for the mock test's reading step, alongside the other /preview pages.
 *
 * The mock's reading step normally needs a live session and published content, which makes a change
 * to it awkward to eyeball. This renders the real component against a sample question so the layout
 * and the score payload can be checked without starting a mock.
 */
export default function MockReadingPreviewPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-[#004AAD]">Preview · mock reading</p>
      <h1 className="mb-4 text-xl font-black text-slate-900">ขั้นการอ่านในข้อสอบจำลอง</h1>
      <MockReadingPreview />
    </main>
  );
}
