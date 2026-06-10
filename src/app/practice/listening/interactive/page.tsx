import { ConversationHub } from "@/components/conversation/ConversationHub";
import { AdminExamGuide } from "@/components/practice/GuideRevampContent";

export default function InteractiveListeningPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <AdminExamGuide exam="interactive-conversation" />
      <ConversationHub />
    </main>
  );
}
