import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { mapSampleRow } from "@/lib/speaking-samples";
import {
  SPEAKING_SAMPLES_BUCKET,
  isSampleQuestionType,
  isSampleTargetKind,
} from "@/lib/speaking-samples-types";

const SAMPLE_COLUMNS =
  "id,target_kind,target_ref,question_type,storage_path,mime,duration_ms,subtitle_cues,title,notes,status,created_at";

function safeExt(raw: unknown): string {
  const v = typeof raw === "string" ? raw.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return v && v.length <= 5 ? v : "webm";
}

/** Create a sample metadata row (status=uploading) + a signed upload URL. */
export async function POST(req: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetKind = body.target_kind;
  const targetRef = body.target_ref;
  const questionType = body.question_type;
  const mime = typeof body.mime === "string" && body.mime.trim() ? body.mime.trim() : "video/webm";

  if (!isSampleTargetKind(targetKind)) {
    return NextResponse.json({ error: "Invalid target_kind" }, { status: 400 });
  }
  if (typeof targetRef !== "string" || !targetRef.trim()) {
    return NextResponse.json({ error: "target_ref required" }, { status: 400 });
  }
  if (!isSampleQuestionType(questionType)) {
    return NextResponse.json({ error: "Invalid question_type" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabase();
  const objectId = globalThis.crypto.randomUUID();
  const storagePath = `${targetKind}/${objectId}.${safeExt(body.ext)}`;

  const { data: signed, error: signError } = await supabase.storage
    .from(SPEAKING_SAMPLES_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (signError || !signed) {
    return NextResponse.json(
      { error: `Could not create upload URL: ${signError?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("speaking_samples")
    .insert({
      target_kind: targetKind,
      target_ref: targetRef.trim(),
      question_type: questionType,
      storage_path: storagePath,
      mime,
      status: "uploading",
      created_by: auth.simple ? null : auth.adminUserId,
    })
    .select("id")
    .single();
  if (insertError || !row) {
    return NextResponse.json(
      { error: `Could not save sample: ${insertError?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sampleId: row.id,
    storagePath,
    token: signed.token,
    signedUrl: signed.signedUrl,
  });
}

/** List samples for a target (admin view — includes uploading/failed). */
export async function GET(req: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const targetKind = url.searchParams.get("target_kind");
  const targetRef = url.searchParams.get("target_ref");

  const supabase = createServiceRoleSupabase();
  let query = supabase
    .from("speaking_samples")
    .select(SAMPLE_COLUMNS)
    .order("created_at", { ascending: false });

  if (targetKind && isSampleTargetKind(targetKind)) {
    query = query.eq("target_kind", targetKind);
  }
  if (targetRef) {
    query = query.eq("target_ref", targetRef);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    samples: (data ?? []).map((r) => mapSampleRow(r as Parameters<typeof mapSampleRow>[0])),
  });
}
