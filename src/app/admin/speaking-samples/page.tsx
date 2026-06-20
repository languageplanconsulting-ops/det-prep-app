import { SpeakingSampleWorkspace } from "@/components/admin/speaking-samples/SpeakingSampleWorkspace";

export const metadata = {
  title: "Speaking samples · Admin",
};

export default function AdminSpeakingSamplesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-xl font-black">🎬 Speaking samples</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Record พี่ดอย&apos;s model answers for speaking questions. Live English captions are
          captured while you record; edit them, then publish. Uploads run in the background so you
          can record the next question right away. Samples are visible to VIP &amp; VIP Fast Track
          students only.
        </p>
      </header>
      <SpeakingSampleWorkspace />
    </main>
  );
}
