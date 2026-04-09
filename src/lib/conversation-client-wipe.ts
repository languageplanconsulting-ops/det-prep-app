import { clearAdminUploadLogForExamKind } from "@/lib/admin-upload-log";
import { deleteConversationAudioDatabase } from "@/lib/conversation-audio-indexeddb";
import {
  CONVERSATION_LS_BANK_KEY,
  CONVERSATION_LS_BANK_LEGACY_KEY,
  CONVERSATION_LS_PROGRESS_KEY,
  CONVERSATION_LS_PROGRESS_LEGACY_KEY,
} from "@/lib/conversation-storage";

/**
 * Removes interactive conversation bank, learner progress, admin upload log entries,
 * and IndexedDB TTS audio — this browser only. Next load starts from an empty bank.
 */
export async function wipeInteractiveConversationClientData(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONVERSATION_LS_BANK_KEY);
  localStorage.removeItem(CONVERSATION_LS_BANK_LEGACY_KEY);
  localStorage.removeItem(CONVERSATION_LS_PROGRESS_KEY);
  localStorage.removeItem(CONVERSATION_LS_PROGRESS_LEGACY_KEY);
  clearAdminUploadLogForExamKind("conversation");
  await deleteConversationAudioDatabase();
  window.dispatchEvent(new Event("ep-conversation-storage"));
  window.dispatchEvent(new Event("admin-upload-log-changed"));
}
