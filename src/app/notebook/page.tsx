import { NotebookList } from "@/components/notebook/NotebookList";

export default function NotebookPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <h1 className="text-3xl font-black tracking-tight">Notebook</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Notes from read-and-write reports live in <strong>All</strong> plus a topic
          folder (grammar, vocabulary, or production feedback). Add your own categories,
          search, sort, and personal notes — everything stays in this browser.
        </p>
      </header>
      <NotebookList />
    </main>
  );
}
