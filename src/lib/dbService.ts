import {
  getAllDictationItems,
  updateDictationItemById,
} from "@/lib/dictation-storage";
import {
  getAllConversationExams,
  updateConversationExamById,
} from "@/lib/conversation-storage";
import type { ConversationExam } from "@/types/conversation";
import type { DictationItem } from "@/types/dictation";

export type DbCollectionName = "dictation" | "conversation";

export const dbService = {
  async getDictationTasks(): Promise<DictationItem[]> {
    return getAllDictationItems();
  },

  async getConversationTasks(): Promise<ConversationExam[]> {
    return getAllConversationExams();
  },

  async updateTask(
    collectionName: DbCollectionName,
    id: string,
    updates: Partial<DictationItem | ConversationExam>,
  ): Promise<{ ok: boolean }> {
    if (collectionName === "dictation") {
      const ok = await updateDictationItemById(id, {
        audioBase64: (updates as Partial<DictationItem>).audioBase64,
        audioMimeType: (updates as Partial<DictationItem>).audioMimeType,
        transcript: (updates as Partial<DictationItem>).transcript,
        hintText: (updates as Partial<DictationItem>).hintText,
      });
      return { ok };
    }
    if (collectionName === "conversation") {
      const ok = updateConversationExamById(id, updates as Partial<ConversationExam>);
      return { ok };
    }
    throw new Error(`Unsupported collection: ${collectionName}`);
  },

  async updateConversationTask(
    id: string,
    updates: Partial<ConversationExam>,
  ): Promise<{ ok: boolean }> {
    const ok = updateConversationExamById(id, updates);
    return { ok };
  },
};

