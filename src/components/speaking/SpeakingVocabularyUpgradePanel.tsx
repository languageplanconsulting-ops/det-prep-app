"use client";

import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import type { SpeakingVocabularyUpgrade } from "@/types/speaking";
import type { NotebookEntry } from "@/types/writing";

export function SpeakingVocabularyUpgradePanel({
  upgrades,
  attemptId,
  entrySource,
  uiLocale = "en",
}: {
  upgrades: SpeakingVocabularyUpgrade[];
  attemptId: string;
  entrySource: NotebookEntry["source"];
  uiLocale?: "en" | "th";
}) {
  if (upgrades.length === 0) return null;

  const th = uiLocale === "th";

  return (
    <BrutalPanel
      variant="elevated"
      eyebrow={
        th
          ? "สูงสุด 10 คำ · ทางเลือกระดับ B2/C1"
          : "Up to 10 items · B2/C1 alternatives"
      }
      title={th ? "แนะนำคำศัพท์" : "Vocabulary suggestions"}
    >
      <ul className="space-y-4">
        {upgrades.map((u) => (
          <li
            key={u.id}
            className="rounded-sm border-2 border-black bg-[#fafafa] p-4 text-sm shadow-[2px_2px_0_0_#000]"
          >
            <p className="text-base font-medium text-neutral-900">
              <span className="line-through decoration-neutral-400 text-neutral-500">
                {u.originalWord}
              </span>
              <span className="mx-2 text-neutral-400">→</span>
              <span className="font-bold text-ep-blue">{u.upgradedWord}</span>
            </p>
            {u.meaningTh ? (
              <p className="mt-2 text-neutral-700">
                <span className="ep-stat text-[10px] font-bold uppercase text-neutral-500">
                  {th ? "ความหมาย " : "Meaning (TH) "}
                </span>
                {u.meaningTh}
              </p>
            ) : null}
            {th ? (
              u.exampleTh ? (
                <p className="mt-2 text-neutral-800">
                  <span className="ep-stat text-[10px] font-bold uppercase text-neutral-500">
                    ตัวอย่าง{" "}
                  </span>
                  {u.exampleTh}
                </p>
              ) : u.exampleEn ? (
                <p className="mt-2 font-medium text-neutral-800">
                  <span className="ep-stat text-[10px] font-bold uppercase text-neutral-500">
                    ตัวอย่าง{" "}
                  </span>
                  {u.exampleEn}
                </p>
              ) : null
            ) : (
              <>
                {u.exampleEn ? (
                  <p className="mt-2 font-medium text-neutral-900">
                    <span className="ep-stat text-[10px] font-bold uppercase text-neutral-500">
                      Example{" "}
                    </span>
                    {u.exampleEn}
                  </p>
                ) : null}
                {u.exampleTh ? <p className="mt-1 text-neutral-600">{u.exampleTh}</p> : null}
              </>
            )}
            <div className="relative z-10 mt-3">
              <AddToNotebookButton
                entrySource={entrySource}
                attemptId={attemptId}
                uiLocale={uiLocale}
                suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
                getPayload={() => ({
                  titleEn: `Vocabulary: ${u.upgradedWord}`,
                  titleTh: `คำศัพท์: ${u.upgradedWord}`,
                  bodyEn: `Instead of “${u.originalWord}”, use “${u.upgradedWord}”. ${u.exampleEn}`,
                  bodyTh: u.meaningTh
                    ? `${u.meaningTh}${u.exampleTh ? ` — ${u.exampleTh}` : ""}`
                    : u.exampleTh || "",
                  excerpt: u.originalWord,
                })}
              />
            </div>
          </li>
        ))}
      </ul>
    </BrutalPanel>
  );
}
