import { NextResponse } from "next/server";

import { appendStagesAfterRouting, emptyAccumulator } from "@/lib/mock-test/v2/attempt-assembler";
import { routeFromStage1DetLike } from "@/lib/mock-test/v2/config";
import { computeFinalPlacement, computeStage1Anchor } from "@/lib/mock-test/v2/final-placement";
import type { PoolQuestionRow } from "@/lib/mock-test/v2/pool-picker";
import { scoreSlot } from "@/lib/mock-test/v2/score-slot";
import type {
  AssemblySlot,
  RoutingBand,
  V2AssemblyState,
  V2ResponseRecord,
} from "@/lib/mock-test/v2/types";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

type SubmitBody = {
  stage: 1 | 2 | 3 | 4;
  responses: Array<{ slotId: string; answer: unknown }>;
};

type SavedAccumulator = {
  usedContentFamilies: string[];
  usedQuestionIds: string[];
  usedAssetKeys: string[];
};

function isSubmitBody(x: unknown): x is SubmitBody {
  if (!x || typeof x !== "object") return false;
  const o = x as SubmitBody;
  return (
    o.stage >= 1 &&
    o.stage <= 4 &&
    Array.isArray(o.responses) &&
    o.responses.every(
      (r) =>
        r &&
        typeof r === "object" &&
        typeof (r as { slotId?: string }).slotId === "string",
    )
  );
}

function stageAnswered(
  log: V2ResponseRecord[],
  allSlots: AssemblySlot[],
  stage: number,
): boolean {
  const need = allSlots.filter((s) => s.stage === stage).map((s) => s.slotId);
  const have = new Set(
    log.filter((l) => l.engine_stage === stage).map((l) => l.slot_id),
  );
  return need.length > 0 && need.every((id) => have.has(id));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as unknown;
    if (!isSubmitBody(body)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { data: session, error: se } = await supabase
      .from("mock_test_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (se || !session || session.engine_version !== 2) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const assembly = session.assembly as V2AssemblyState & {
      accumulator?: SavedAccumulator;
    };

    const slots = (assembly.slots ?? []) as AssemblySlot[];
    const prevLog = (session.v2_response_log ?? []) as V2ResponseRecord[];

    if (prevLog.some((l) => l.engine_stage === body.stage)) {
      return NextResponse.json(
        { error: `Stage ${body.stage} already submitted` },
        { status: 400 },
      );
    }

    for (let st = 1; st < body.stage; st++) {
      if (!stageAnswered(prevLog, slots, st)) {
        return NextResponse.json(
          { error: `Complete stage ${st} before stage ${body.stage}` },
          { status: 400 },
        );
      }
    }

    const stageSlots = slots.filter((s) => s.stage === body.stage);
    const slotIds = new Set(stageSlots.map((s) => s.slotId));

    for (const r of body.responses) {
      if (!slotIds.has(r.slotId)) {
        return NextResponse.json(
          { error: `Unknown slot ${r.slotId} for stage ${body.stage}` },
          { status: 400 },
        );
      }
    }
    if (body.responses.length !== stageSlots.length) {
      return NextResponse.json(
        { error: `Expected ${stageSlots.length} responses for stage ${body.stage}` },
        { status: 400 },
      );
    }

    const newRows: V2ResponseRecord[] = [];

    for (const r of body.responses) {
      const slot = stageSlots.find((s) => s.slotId === r.slotId)!;
      const { data: qRow, error: qe } = await supabase
        .from("mock_questions")
        .select("*")
        .eq("id", slot.questionId)
        .maybeSingle();
      if (qe || !qRow) {
        return NextResponse.json({ error: "Question not found" }, { status: 500 });
      }
      const scored = await scoreSlot(
        sessionId,
        slot.slotId,
        body.stage,
        qRow as unknown as PoolQuestionRow,
        r.answer,
        user.id,
      );
      newRows.push(scored);
    }

    const mergedLog = [...prevLog, ...newRows];

    let nextAssembly: V2AssemblyState & { accumulator?: SavedAccumulator } = {
      ...assembly,
      slots,
    };

    let routingBand = (session.routing_band ?? null) as RoutingBand | null;
    let stage1Raw = (session.stage1_raw_100 ?? null) as number | null;
    let stage1Det = (session.stage1_det_like ?? null) as number | null;

    if (body.stage === 1) {
      const stage1Items = mergedLog.filter((x) => x.engine_stage === 1);
      const anchor = computeStage1Anchor(stage1Items);
      routingBand = routeFromStage1DetLike(anchor.stage1_det_like);
      stage1Raw = anchor.stage1_raw_100;
      stage1Det = anchor.stage1_det_like;

      const acc = emptyAccumulator();
      const a = assembly.accumulator;
      if (a) {
        for (const f of a.usedContentFamilies ?? []) acc.usedContentFamilies.add(f);
        for (const i of a.usedQuestionIds ?? []) acc.usedQuestionIds.add(i);
        for (const k of a.usedAssetKeys ?? []) acc.usedAssetKeys.add(k);
      }
      const lastOrder = Math.max(0, ...slots.map((s) => s.orderIndex));
      const { slots: more, statePatch } = await appendStagesAfterRouting(
        supabase,
        user.id,
        routingBand,
        acc,
        lastOrder,
      );
      nextAssembly = {
        ...assembly,
        ...statePatch,
        slots: [...slots, ...more],
        accumulator: {
          usedContentFamilies: [...acc.usedContentFamilies],
          usedQuestionIds: [...acc.usedQuestionIds],
          usedAssetKeys: [...acc.usedAssetKeys],
        },
      };
    }

    const updatePayload: Record<string, unknown> = {
      v2_response_log: mergedLog,
      assembly: nextAssembly,
      routing_band: routingBand,
      stage1_raw_100: stage1Raw,
      stage1_det_like: stage1Det,
    };

    const allSlotIds = new Set(nextAssembly.slots.map((s) => s.slotId));
    const answered = new Set(mergedLog.map((x) => x.slot_id));
    const complete = [...allSlotIds].every((id) => answered.has(id));

    let placement = null as ReturnType<typeof computeFinalPlacement> | null;

    if (complete && routingBand != null) {
      placement = computeFinalPlacement(routingBand, mergedLog);
      await supabase.from("mock_test_results").delete().eq("session_id", sessionId);
      const { error: insErr } = await supabase.from("mock_test_results").insert({
        session_id: sessionId,
        user_id: user.id,
        overall_score: Math.round(placement.final_score_raw),
        literacy_score: Math.round(placement.reading_subscore * 1.6),
        comprehension_score: Math.round(placement.listening_subscore * 1.6),
        conversation_score: Math.round(placement.speaking_subscore * 1.6),
        production_score: Math.round(placement.writing_subscore * 1.6),
        final_score_raw: placement.final_score_raw,
        final_score_rounded_5: placement.final_score_rounded_5,
        cefr_level: placement.cefr_level,
        routing_band: placement.routing_band,
        stage1_raw_100: placement.stage1_raw_100,
        stage1_det_like: placement.stage1_det_like,
        reading_subscore_v2: placement.reading_subscore,
        listening_subscore_v2: placement.listening_subscore,
        writing_subscore_v2: placement.writing_subscore,
        speaking_subscore_v2: placement.speaking_subscore,
        overall_raw_0_to_100: placement.overall_raw_0_to_100,
        placement_payload: placement,
        ai_feedback: { placement },
        adaptive_log: mergedLog,
        processing_started_at: new Date().toISOString(),
        processing_completed_at: new Date().toISOString(),
      });
      if (insErr) {
        console.error("[submit-stage] insert result", insErr.message);
        return NextResponse.json({ error: "Could not save results" }, { status: 500 });
      }
      updatePayload.status = "completed";
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error: upErr } = await supabase
      .from("mock_test_sessions")
      .update(updatePayload)
      .eq("id", sessionId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      routingBand,
      stage1Raw100: stage1Raw,
      stage1DetLike: stage1Det,
      totalSlots: nextAssembly.slots.length,
      complete,
      placement,
    });
  } catch (e) {
    console.error("[submit-stage]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
