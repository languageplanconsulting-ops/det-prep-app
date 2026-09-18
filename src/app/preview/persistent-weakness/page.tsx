"use client";

import { PersistentWeaknessModal } from "@/components/practice/PersistentWeaknessModal";

/** Design preview of the pre-exam "you keep making this mistake" popup. */
export default function PersistentWeaknessPreviewPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-bold">Persistent weakness popup — preview</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Shown once before a production exercise starts, only for learners with a confirmed
        repeated pattern.
      </p>
      <PersistentWeaknessModal
        skill="writing"
        previewTopics={[
          { topicEn: "Articles", topicTh: "การใช้ a/an/the", occurrenceCount: 4 },
          { topicEn: "Subject-verb agreement", topicTh: "ประธานและกริยาไม่สอดคล้องกัน", occurrenceCount: 3 },
        ]}
      />
    </div>
  );
}
