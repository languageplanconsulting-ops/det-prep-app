import { BrutalPanel } from "@/components/ui/BrutalPanel";

export default function StudentOverviewPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <h1 className="text-3xl font-black tracking-tight">Student overview</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Aggregate roster metrics, streaks, and plan distribution will render here
          (admin / teacher view).
        </p>
      </header>
      <BrutalPanel eyebrow="Coming next" title="Class-level analytics">
        <p className="text-sm text-neutral-700">
          Wire this route to your auth layer and database. Bulk exam uploads from
          Admin will populate per-student thumbnails and redeem states.
        </p>
      </BrutalPanel>
    </main>
  );
}
