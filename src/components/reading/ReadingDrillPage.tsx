/**
 * A single-skill drill — the same engine and the same screen as a full Interactive Reading set,
 * with only one or two of the six steps switched on and several passages queued behind it.
 *
 * Before this, each drill had its own invented layout, prompt wording and grading. They are gone:
 * a learner practising "ไฮไลต์คำตอบ" now sees the exact screen the real test shows, reads the real
 * instruction string, and is graded the way the real task grades.
 *
 * This is a SERVER component on purpose. It used to be a client component, which pulled the whole
 * ~800 KB bank into a JS chunk that every learner downloaded to answer one question type. Now the
 * bank stays on the server and only the steps this drill actually runs cross the boundary.
 */

import { InteractiveReadingRunner } from "@/components/reading/InteractiveReadingRunner";
import { IR_SETS, IR_STEP_LABELS_TH, irProjectForSteps, irStepPromptEn } from "@/lib/interactive-reading";
import { DRILLS, type DrillKind } from "@/lib/reading-drills";

export function ReadingDrillPage({ kind }: { kind: DrillKind }) {
  const d = DRILLS[kind];
  const sets = IR_SETS.map((s) => irProjectForSteps(s, d.steps));
  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6">
      <div className={`mb-4 rounded-2xl ${d.bg} p-4 ring-1 ring-black/5`}>
        <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">
          {d.icon} {d.th} · {d.steps.map((s) => IR_STEP_LABELS_TH[s]).join(" + ")}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{irStepPromptEn(d.steps[0]!)}</p>
        <p className="mt-2 text-[13px] leading-6 text-slate-700">{d.teachTh}</p>
      </div>
      <InteractiveReadingRunner
        sets={sets}
        steps={d.steps}
        progressTopic={`ir-${kind}`}
        celebrateTitle="ฝึกครบแล้ว!"
        celebrateSub={`คุณฝึก ${d.th} ด้วยหน้าจอและเกณฑ์เดียวกับข้อสอบจริง`}
      />
    </main>
  );
}
