import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { normalizeSubtitleCues, SPEAKING_SAMPLES_BUCKET } from "@/lib/speaking-samples-types";

/** Finalize / edit a sample: flip status to ready, persist cues / duration / title / notes. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.status === "ready" || body.status === "failed" || body.status === "uploading") {
    update.status = body.status;
  }
  if ("subtitle_cues" in body) {
    update.subtitle_cues = normalizeSubtitleCues(body.subtitle_cues);
  }
  if ("duration_ms" in body) {
    const d = Number(body.duration_ms);
    update.duration_ms = Number.isFinite(d) ? Math.max(0, Math.round(d)) : null;
  }
  if ("title" in body) {
    update.title = typeof body.title === "string" ? body.title.trim() || null : null;
  }
  if ("notes" in body) {
    update.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabase();
  const { error } = await supabase
    .from("speaking_samples")
    .update(update)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Delete a sample row + its storage object. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const supabase = createServiceRoleSupabase();
  const { data: row } = await supabase
    .from("speaking_samples")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (row?.storage_path) {
    await supabase.storage.from(SPEAKING_SAMPLES_BUCKET).remove([row.storage_path]);
  }

  const { error } = await supabase.from("speaking_samples").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
