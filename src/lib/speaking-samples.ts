import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { getUserTier } from "@/lib/subscription";
import {
  SPEAKING_SAMPLES_BUCKET,
  normalizeSubtitleCues,
  type SampleQuestionType,
  type SampleTargetKind,
  type SpeakingSample,
} from "@/lib/speaking-samples-types";

export {
  SPEAKING_SAMPLES_BUCKET,
  isSampleQuestionType,
  isSampleTargetKind,
  normalizeSubtitleCues,
} from "@/lib/speaking-samples-types";
export type {
  SampleQuestionType,
  SampleTarget,
  SampleTargetKind,
  SpeakingSample,
  SubtitleCue,
} from "@/lib/speaking-samples-types";

/** How long a minted signed playback URL stays valid (seconds). */
export const SIGNED_URL_TTL_SEC = 60 * 60 * 2; // 2h

type SampleRow = {
  id: string;
  target_kind: SampleTargetKind;
  target_ref: string;
  question_type: SampleQuestionType;
  storage_path: string;
  mime: string;
  duration_ms: number | null;
  subtitle_cues: unknown;
  title: string | null;
  notes: string | null;
  status: "uploading" | "ready" | "failed";
  created_at: string;
};

export function mapSampleRow(row: SampleRow): SpeakingSample {
  return {
    id: row.id,
    targetKind: row.target_kind,
    targetRef: row.target_ref,
    questionType: row.question_type,
    storagePath: row.storage_path,
    mime: row.mime,
    durationMs: row.duration_ms,
    subtitleCues: normalizeSubtitleCues(row.subtitle_cues),
    title: row.title,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

const SAMPLE_COLUMNS =
  "id,target_kind,target_ref,question_type,storage_path,mime,duration_ms,subtitle_cues,title,notes,status,created_at";

/**
 * For the user-facing screen: return READY samples for a target with signed playback
 * URLs — but ONLY if the caller is an active VIP (incl. Duolingo Fast Track).
 * Non-VIP / signed-out callers get an empty list (the gate, not an error).
 */
export async function listReadySamplesForTargetIfVIP(
  userId: string | null,
  target: { kind: SampleTargetKind; ref: string },
): Promise<SpeakingSample[]> {
  if (!userId) return [];
  const tier = await getUserTier(userId);
  if (tier !== "vip") return [];

  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("speaking_samples")
    .select(SAMPLE_COLUMNS)
    .eq("target_kind", target.kind)
    .eq("target_ref", target.ref)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[speaking-samples] list error", error.message);
    return [];
  }

  const rows = (data ?? []) as SampleRow[];
  const samples: SpeakingSample[] = [];
  for (const row of rows) {
    const sample = mapSampleRow(row);
    const { data: signed } = await supabase.storage
      .from(SPEAKING_SAMPLES_BUCKET)
      .createSignedUrl(sample.storagePath, SIGNED_URL_TTL_SEC);
    if (signed?.signedUrl) {
      sample.videoUrl = signed.signedUrl;
      samples.push(sample);
    }
  }
  return samples;
}

/** True if a READY sample exists for the target (ignores tier — used to gate the VIP teaser). */
export async function hasReadySampleForTarget(target: {
  kind: SampleTargetKind;
  ref: string;
}): Promise<boolean> {
  const supabase = createServiceRoleSupabase();
  const { count, error } = await supabase
    .from("speaking_samples")
    .select("id", { count: "exact", head: true })
    .eq("target_kind", target.kind)
    .eq("target_ref", target.ref)
    .eq("status", "ready");
  if (error) {
    console.error("[speaking-samples] exists error", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}
