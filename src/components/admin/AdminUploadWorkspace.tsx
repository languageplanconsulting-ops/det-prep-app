"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminConversationPaste } from "@/components/admin/AdminConversationPaste";
import { AdminDictationPaste } from "@/components/admin/AdminDictationPaste";
import { AdminFitbPaste } from "@/components/admin/AdminFitbPaste";
import { AdminWriteAboutPhotoPaste } from "@/components/admin/AdminWriteAboutPhotoPaste";
import { AdminReadingSetsPaste } from "@/components/admin/AdminReadingSetsPaste";
import { AdminDialogueSummaryPaste } from "@/components/admin/AdminDialogueSummaryPaste";
import { AdminRealWordPaste } from "@/components/admin/AdminRealWordPaste";
import { AdminSpeakingTopicsPaste } from "@/components/admin/AdminSpeakingTopicsPaste";
import { AdminVocabSetsPaste } from "@/components/admin/AdminVocabSetsPaste";
import { AdminUploadLogPanel } from "@/components/admin/AdminUploadLogPanel";
import { AdminWritingTopicsUpload } from "@/components/admin/AdminWritingTopicsUpload";
import { AdminContentBankSyncPanel } from "@/components/admin/AdminContentBankSyncPanel";
import { getAllConversationExams } from "@/lib/conversation-storage";
import { countDictationSetsInBank, ensureDictationBankReady } from "@/lib/dictation-storage";
import { countFitbSetsInBank } from "@/lib/fitb-storage";
import { getWriteAboutPhotoRoundCounts } from "@/lib/write-about-photo-storage";
import { countReadingSetsInBank } from "@/lib/reading-storage";
import { countDialogueSummarySetsInBank } from "@/lib/dialogue-summary-storage";
import { countRealWordSetsInBank } from "@/lib/realword-storage";
import { loadSpeakingTopics } from "@/lib/speaking-storage";
import { countVocabSetsInBank } from "@/lib/vocab-storage";
import { loadWritingTopics } from "@/lib/writing-storage";

type UploadKind =
  | "writing"
  | "speaking"
  | "writeAboutPhoto"
  | "reading"
  | "vocab"
  | "dictation"
  | "fitb"
  | "conversation"
  | "realword"
  | "dialogueSummary";

type UploadCounts = Record<UploadKind, number> & {
  conversationEasy: number;
  conversationMedium: number;
  conversationHard: number;
};

function getCounts(): UploadCounts {
  const dictationCount = countDictationSetsInBank();

  const wap = getWriteAboutPhotoRoundCounts();
  const conv = getAllConversationExams();
  return {
    writing: loadWritingTopics().length,
    speaking: loadSpeakingTopics().length,
    writeAboutPhoto: wap[1] + wap[2] + wap[3] + wap[4] + wap[5],
    reading: countReadingSetsInBank(),
    vocab: countVocabSetsInBank(),
    dictation: dictationCount,
    fitb: countFitbSetsInBank(),
    conversation: conv.length,
    conversationEasy: conv.filter((e) => e.difficulty === "easy").length,
    conversationMedium: conv.filter((e) => e.difficulty === "medium").length,
    conversationHard: conv.filter((e) => e.difficulty === "hard").length,
    realword: countRealWordSetsInBank(),
    dialogueSummary: countDialogueSummarySetsInBank(),
  };
}

export function AdminUploadWorkspace() {
  const [active, setActive] = useState<UploadKind>("fitb");
  const [counts, setCounts] = useState<UploadCounts>({
    writing: 0,
    speaking: 0,
    writeAboutPhoto: 0,
    reading: 0,
    vocab: 0,
    dictation: 0,
    fitb: 0,
    conversation: 0,
    conversationEasy: 0,
    conversationMedium: 0,
    conversationHard: 0,
    realword: 0,
    dialogueSummary: 0,
  });

  useEffect(() => {
    const refresh = () => setCounts(getCounts());
    void ensureDictationBankReady().then(() => refresh());
    const id = window.setInterval(refresh, 1500);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-write-about-photo-rounds", refresh);
    window.addEventListener("ep-writing-topics", refresh);
    window.addEventListener("ep-conversation-storage", refresh);
    window.addEventListener("ep-dictation-storage", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-write-about-photo-rounds", refresh);
      window.removeEventListener("ep-writing-topics", refresh);
      window.removeEventListener("ep-conversation-storage", refresh);
      window.removeEventListener("ep-dictation-storage", refresh);
    };
  }, []);

  const menu = useMemo(
    () =>
      [
        { key: "fitb", label: "Fill in the blank" },
        { key: "dictation", label: "Dictation" },
        { key: "realword", label: "Real English word" },
        { key: "conversation", label: "Interactive conversation" },
        { key: "dialogueSummary", label: "Dialogue → summary" },
        { key: "reading", label: "Reading sets" },
        { key: "vocab", label: "Vocabulary in context" },
        { key: "writing", label: "Writing topics" },
        { key: "speaking", label: "Read, then speak" },
        { key: "writeAboutPhoto", label: "Write & speak about photo (rounds)" },
      ] as { key: UploadKind; label: string }[],
    [],
  );

  return (
    <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-[4px] border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
        <p className="mb-2 text-xs font-black uppercase text-neutral-700">
          Question type / ประเภทข้อสอบ
        </p>
        <div className="space-y-2">
          {menu.map((item) => {
            const selected = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActive(item.key)}
                className={`flex w-full items-center justify-between rounded-[4px] border-2 border-black px-3 py-2 text-left text-sm font-bold ${
                  selected ? "bg-[#004AAD] text-white" : "bg-neutral-50 text-neutral-900"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`ep-stat rounded-[2px] border border-black px-2 py-0.5 text-xs ${
                    selected ? "bg-[#FFCC00] text-black" : "bg-white text-neutral-800"
                  }`}
                >
                  {counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Count shows entries currently loaded in browser bank.
        </p>
        {active === "conversation" ? (
          <p className="mt-2 rounded-[4px] border-2 border-black bg-neutral-50 px-2 py-2 ep-stat text-[10px] font-bold text-neutral-700">
            Interactive conversation · by level: E {counts.conversationEasy} · M {counts.conversationMedium} · H{" "}
            {counts.conversationHard}
          </p>
        ) : null}
      </aside>

      <div className="min-w-0">
        {active === "fitb" ? <AdminFitbPaste /> : null}
        {active === "dictation" ? <AdminDictationPaste /> : null}
        {active === "realword" ? <AdminRealWordPaste /> : null}
        {active === "dialogueSummary" ? <AdminDialogueSummaryPaste /> : null}
        {active === "conversation" ? <AdminConversationPaste /> : null}
        {active === "reading" ? <AdminReadingSetsPaste /> : null}
        {active === "vocab" ? <AdminVocabSetsPaste /> : null}
        {active === "writing" ? <AdminWritingTopicsUpload /> : null}
        {active === "speaking" ? <AdminSpeakingTopicsPaste /> : null}
        {active === "writeAboutPhoto" ? <AdminWriteAboutPhotoPaste /> : null}
        <AdminUploadLogPanel examKind={active} />
        <AdminContentBankSyncPanel />
      </div>
    </section>
  );
}
