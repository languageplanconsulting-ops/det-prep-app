import {
  conversationAudioKey,
  getConversationAudioDataUrlByKey,
} from "@/lib/conversation-audio-indexeddb";
import type { ConversationExam } from "@/types/conversation";

/** Fills inline audio fields from IndexedDB for playback (not persisted). */
export async function hydrateConversationExamForPlayback(exam: ConversationExam): Promise<ConversationExam> {
  let scenarioAudioBase64 = exam.scenarioAudioBase64;
  let scenarioAudioMimeType = exam.scenarioAudioMimeType;
  if (exam.scenarioAudioInIndexedDb && !scenarioAudioBase64?.trim()) {
    const url = await getConversationAudioDataUrlByKey(conversationAudioKey(exam.id, "scenario"));
    if (url) {
      scenarioAudioBase64 = url;
      scenarioAudioMimeType = scenarioAudioMimeType || "audio/mpeg";
    }
  }

  const scenarioQuestions = await Promise.all(
    exam.scenarioQuestions.map(async (q, i) => {
      if (q.audioInIndexedDb && !q.audioBase64?.trim()) {
        const url = await getConversationAudioDataUrlByKey(
          conversationAudioKey(exam.id, { kind: "sq", index: i }),
        );
        if (url) {
          return { ...q, audioBase64: url, audioMimeType: q.audioMimeType || "audio/mpeg" };
        }
      }
      return q;
    }),
  );

  const mainQuestions = await Promise.all(
    exam.mainQuestions.map(async (q, i) => {
      if (q.audioInIndexedDb && !q.audioBase64?.trim()) {
        const url = await getConversationAudioDataUrlByKey(
          conversationAudioKey(exam.id, { kind: "mt", index: i }),
        );
        if (url) {
          return { ...q, audioBase64: url, audioMimeType: q.audioMimeType || "audio/mpeg" };
        }
      }
      return q;
    }),
  );

  return {
    ...exam,
    scenarioAudioBase64,
    scenarioAudioMimeType,
    scenarioQuestions,
    mainQuestions,
  };
}
