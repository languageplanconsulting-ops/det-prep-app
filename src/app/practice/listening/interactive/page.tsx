import Link from "next/link";
import { ConversationHub } from "@/components/conversation/ConversationHub";

export default function InteractiveListeningPage() {
  return (
    <main className="ep-page-shell mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/practice"
        className="ep-link-luxury text-sm font-bold text-ep-blue underline-offset-4 hover:underline"
      >
        ← Back to practice hub
      </Link>
      <ConversationHub />
    </main>
  );
}
