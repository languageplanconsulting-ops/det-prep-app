import "server-only";

import {
  buildCoverage,
  COURSE_VIDEO_PLAN,
  productionTotals,
  type CourseVideoPlan,
  type CoverageCell,
  type ProductionStatus,
} from "@/lib/course-production";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type ProductionRow = CourseVideoPlan & {
  /** True when the script body has been edited and saved by the admin. */
  scriptEdited: boolean;
  notes: string | null;
  bunnyVideoGuid: string | null;
  updatedAt: string | null;
};

export type ProductionSnapshot = {
  /** False when migration 041 hasn't been applied — board is read-only. */
  deployed: boolean;
  rows: ProductionRow[];
  coverage: CoverageCell[];
  totals: ReturnType<typeof productionTotals>;
};

type OverrideRow = {
  video_key: string;
  script_md: string | null;
  status: ProductionStatus | null;
  notes: string | null;
  bunny_video_guid: string | null;
  updated_at: string | null;
};

/**
 * PostgREST reports an undeployed table as PGRST205 rather than Postgres' own
 * 42P01, so both have to be matched. Same helper shape as admin-course-data.ts.
 */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /schema cache/i.test(error.message ?? "")
  );
}

export async function getProductionSnapshot(): Promise<ProductionSnapshot> {
  const supabase = createServiceRoleSupabase();

  let overrides = new Map<string, OverrideRow>();
  let deployed = true;

  const { data, error } = await supabase
    .from("course_video_scripts")
    .select("video_key, script_md, status, notes, bunny_video_guid, updated_at");

  if (error) {
    if (!isMissingTable(error)) {
      throw new Error(`[course-production] script lookup failed: ${error.message}`);
    }
    deployed = false;
  } else {
    overrides = new Map((data ?? []).map((r) => [r.video_key, r as OverrideRow]));
  }

  const rows: ProductionRow[] = COURSE_VIDEO_PLAN.map((plan) => {
    const o = overrides.get(plan.key);
    return {
      ...plan,
      script: o?.script_md ?? plan.script,
      status: o?.status ?? plan.status,
      scriptEdited: Boolean(o?.script_md),
      notes: o?.notes ?? null,
      bunnyVideoGuid: o?.bunny_video_guid ?? null,
      updatedAt: o?.updated_at ?? null,
    };
  }).sort((a, b) => a.priority - b.priority);

  return {
    deployed,
    rows,
    coverage: buildCoverage(rows),
    totals: productionTotals(rows),
  };
}

export type SaveScriptInput = {
  videoKey: string;
  scriptMd?: string | null;
  status?: ProductionStatus | null;
  notes?: string | null;
  bunnyVideoGuid?: string | null;
  userId?: string | null;
};

export type SaveScriptResult =
  | { ok: true }
  | { ok: false; reason: "not_deployed" | "unknown_key" | "failed"; message: string };

export async function saveVideoScript(input: SaveScriptInput): Promise<SaveScriptResult> {
  if (!COURSE_VIDEO_PLAN.some((v) => v.key === input.videoKey)) {
    return { ok: false, reason: "unknown_key", message: `Unknown video key: ${input.videoKey}` };
  }

  const supabase = createServiceRoleSupabase();
  const patch: Record<string, unknown> = {
    video_key: input.videoKey,
    updated_at: new Date().toISOString(),
  };
  // Only send fields the caller actually supplied, so a script-only save does
  // not blank out the status and vice versa.
  if (input.scriptMd !== undefined) patch.script_md = input.scriptMd;
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.bunnyVideoGuid !== undefined) patch.bunny_video_guid = input.bunnyVideoGuid;
  if (input.userId) patch.updated_by = input.userId;

  const { error } = await supabase
    .from("course_video_scripts")
    .upsert(patch, { onConflict: "video_key" });

  if (error) {
    if (isMissingTable(error)) {
      return {
        ok: false,
        reason: "not_deployed",
        message: "ยังไม่ได้ deploy migration 041 — รัน supabase/manual_run_course_video_scripts.sql ก่อน",
      };
    }
    return { ok: false, reason: "failed", message: error.message };
  }
  return { ok: true };
}
