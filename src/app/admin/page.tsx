import Link from "next/link";
import { AdminGeminiModelSettings } from "@/components/admin/AdminGeminiModelSettings";
import { AdminPreviewStarter } from "@/components/admin/AdminPreviewStarter";
import { AdminTtsProviderTest } from "@/components/admin/AdminTtsProviderTest";
import { AdminUploadWorkspace } from "@/components/admin/AdminUploadWorkspace";
import { BrutalPanel } from "@/components/ui/BrutalPanel";

const examTypes = [
  { id: "reading_passages", label: "Reading sets (missing paragraph + 4 MCQs)" },
  { id: "vocab_blanks", label: "Vocabulary-in-context passages" },
] as const;

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Admin only
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Bulk exam upload</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Validate JSON against the TypeScript contracts, then push to your content
          service. This form is UI-only until you connect an API route.
        </p>
        <p className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-white px-4 py-2 font-black uppercase tracking-wide text-[#004AAD] shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Subscriptions / สมาชิก →
          </Link>
          <Link
            href="/admin/vip-access"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-2 font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            VIP course access / สิทธิ์ VIP คอร์ส →
          </Link>
          <Link
            href="/admin/supabase"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-white px-4 py-2 font-black uppercase tracking-wide text-neutral-800 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Supabase URL &amp; key (browser) →
          </Link>
          <Link
            href="/admin/mock-test/upload"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2 font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Mock test — upload question bank →
          </Link>
          <Link
            href="/admin/mock-test/mini-diagnosis"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-cyan-200 px-4 py-2 font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Mini diagnosis uploader →
          </Link>
          <Link
            href="/admin/api-usage"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-cyan-100 px-4 py-2 font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            API costs (฿ per user) →
          </Link>
          <Link
            href="/admin/study-activity"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-rose-100 px-4 py-2 font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Study activity dashboard →
          </Link>
          <Link
            href="/admin/executive"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2 font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Executive business dashboard →
          </Link>
          <Link
            href="/admin/bug-reports"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-rose-200 px-4 py-2 font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Bug reports inbox →
          </Link>
          <a
            href="#admin-tts-debug"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-lime-200 px-4 py-2 font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            TTS test (debug) ↓
          </a>
        </p>
      </header>

      <AdminGeminiModelSettings />

      <AdminTtsProviderTest />

      <AdminPreviewStarter />

      <AdminUploadWorkspace />

      <BrutalPanel title="Other types (stub)">
        <form className="space-y-4" action="#" method="post">
          <label className="block text-sm font-bold">
            Exam type
            <select
              name="examType"
              className="mt-1 w-full border-2 border-black bg-white px-3 py-2 ep-stat text-sm"
              defaultValue={examTypes[0].id}
            >
              {examTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold">
            JSON file
            <input
              type="file"
              accept="application/json,.json"
              className="mt-1 w-full border-2 border-dashed border-black bg-neutral-50 px-3 py-6 text-sm"
            />
          </label>
          <button
            type="button"
            className="w-full border-2 border-black bg-ep-blue py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Validate (stub)
          </button>
        </form>
      </BrutalPanel>
    </main>
  );
}
