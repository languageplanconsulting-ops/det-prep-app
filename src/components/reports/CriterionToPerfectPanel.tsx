"use client";

import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import type { SuggestedNotebookPremade } from "@/components/writing/AddToNotebookButton";
import type { NotebookEntry, WritingCriterionReport } from "@/types/writing";

/**
 * "What is still missing to reach 100%" for one criterion, with the model
 * sentences the learner could have said and a save-to-notebook action.
 * Renders nothing when the criterion already scored 100 or the grader (or an
 * older stored report) has no toPerfect payload.
 */
export function CriterionToPerfectPanel({
  report,
  titleEn,
  titleTh,
  attemptId,
  entrySource,
  suggestedPremade,
  uiLocale = "en",
}: {
  report: WritingCriterionReport;
  titleEn: string;
  titleTh: string;
  attemptId: string;
  entrySource: NotebookEntry["source"];
  suggestedPremade: SuggestedNotebookPremade;
  uiLocale?: "en" | "th";
}) {
  const toPerfect = report.toPerfect;
  if (report.scorePercent >= 100 || !toPerfect) return null;
  const th = uiLocale === "th";

  return (
    <div className="mt-4 rounded-sm border-2 border-black bg-[#fff8e1] p-3 shadow-[2px_2px_0_0_#000]">
      <p className="ep-stat text-[10px] font-bold uppercase tracking-wide text-ep-blue">
        {th
          ? `ขาดอะไรถึงจะได้ 100% (ตอนนี้ ${Math.round(report.scorePercent)}%)`
          : `What's missing for 100% (now ${Math.round(report.scorePercent)}%)`}
      </p>
      {th ? (
        <p className="mt-1 text-sm text-neutral-900">
          {toPerfect.missingTh?.trim() ? toPerfect.missingTh : toPerfect.missingEn}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium text-neutral-900">{toPerfect.missingEn}</p>
          {toPerfect.missingTh?.trim() ? (
            <p className="mt-1 text-sm text-neutral-600">{toPerfect.missingTh}</p>
          ) : null}
        </>
      )}
      {toPerfect.examples.length ? (
        <>
          <p className="ep-stat mt-3 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
            {th ? "ตัวอย่างประโยคที่ควรพูด" : "Sentences you could have said"}
          </p>
          <ul className="mt-1 space-y-2">
            {toPerfect.examples.map((ex) => (
              <li key={ex.id} className="rounded-sm border border-neutral-300 bg-white p-2 text-sm">
                <p className="font-medium text-neutral-900">“{ex.en}”</p>
                {ex.th?.trim() ? <p className="mt-1 text-neutral-600">{ex.th}</p> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="relative z-10 mt-3">
        <AddToNotebookButton
          entrySource={entrySource}
          attemptId={attemptId}
          suggestedPremade={suggestedPremade}
          uiLocale={uiLocale}
          getPayload={() => ({
            titleEn: `${titleEn} — to 100%`,
            titleTh: `${titleTh} — ขาดอะไรถึงจะได้ 100%`,
            bodyEn: [toPerfect.missingEn, ...toPerfect.examples.map((ex) => `• ${ex.en}`)]
              .filter(Boolean)
              .join("\n"),
            bodyTh: [toPerfect.missingTh, ...toPerfect.examples.map((ex) => (ex.th?.trim() ? `• ${ex.th}` : ""))]
              .filter(Boolean)
              .join("\n"),
          })}
        />
      </div>
    </div>
  );
}
