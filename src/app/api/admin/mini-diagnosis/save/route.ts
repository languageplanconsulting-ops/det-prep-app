import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { synthesizeEnglishSpeechWithDeepgram } from "@/lib/deepgram-synthesize";
import { synthesizeEnglishSpeechWithGemini } from "@/lib/gemini-synthesize";
import { synthesizeEnglishSpeechWithInworld } from "@/lib/inworld-synthesize";
import { parseMiniDiagnosisUploadJson } from "@/lib/mini-diagnosis/upload";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

async function ensureAdmin() {
  const access = await getAdminAccess();
  if (!access.ok) {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  if (access.simple) {
    return { supabase: createServiceRoleSupabase(), userId: null as string | null };
  }
  return { supabase: await createRouteHandlerSupabase(), userId: access.adminUserId };
}

type SaveBody = {
  internal_name?: string;
  user_title?: string;
  grouped_items?: Record<string, unknown>;
};

async function synthesizeToDataUrl(text: string): Promise<string> {
  const cleaned = text.trim();
  if (!cleaned) return "";
  try {
    const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim() || "";
    if (deepgramKey && cleaned.length <= 2000) {
      const out = await synthesizeEnglishSpeechWithDeepgram({ apiKey: deepgramKey, text: cleaned });
      return `data:${out.mimeType};base64,${out.audioBase64}`;
    }
  } catch {
    /* try next provider */
  }
  try {
    const inworldKey = process.env.INWORLD_API_KEY?.trim() || "";
    if (inworldKey && cleaned.length <= 2000) {
      const out = await synthesizeEnglishSpeechWithInworld({ apiKey: inworldKey, text: cleaned });
      return `data:${out.mimeType};base64,${out.audioBase64}`;
    }
  } catch {
    /* try next provider */
  }
  try {
    const geminiKey = process.env.GEMINI_API_KEY?.trim() || "";
    if (!geminiKey) return "";
    const out = await synthesizeEnglishSpeechWithGemini({ apiKey: geminiKey, text: cleaned });
    return `data:${out.mimeType};base64,${out.audioBase64}`;
  } catch {
    return "";
  }
}

async function enrichMiniDiagnosisAudio(
  rows: Array<{
    step_index: number;
    task_type: string;
    content: Record<string, unknown>;
  }>,
) {
  const cache = new Map<string, string>();
  const resolveAudio = async (text: string): Promise<string> => {
    const key = text.trim();
    if (!key) return "";
    if (cache.has(key)) return cache.get(key) ?? "";
    const url = await synthesizeToDataUrl(key);
    cache.set(key, url);
    return url;
  };

  for (const row of rows) {
    const content = row.content ?? {};
    if (row.task_type === "dictation") {
      const existing = String(content.audio_url ?? "").trim();
      const sentence = String(content.reference_sentence ?? "").trim();
      if (!existing && sentence) {
        const audio = await resolveAudio(sentence);
        if (audio) content.audio_url = audio;
      }
    }

    if (row.task_type === "interactive_listening") {
      const existing = String(content.audio_url ?? "").trim();
      const script = String(
        content.audio_script ?? content.script ?? content.transcript ?? content.narration ?? "",
      ).trim();
      if (!existing && script) {
        const audio = await resolveAudio(script);
        if (audio) content.audio_url = audio;
      }
      if (content.max_plays == null) content.max_plays = 3;
    }

    row.content = content;
  }
}

export async function POST(req: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const body = (await req.json().catch(() => ({}))) as SaveBody;
  const internalName = String(body.internal_name ?? "").trim();
  const userTitle = String(body.user_title ?? "").trim();
  if (!internalName || !userTitle) {
    return NextResponse.json({ error: "internal_name and user_title are required" }, { status: 400 });
  }

  const parsed = parseMiniDiagnosisUploadJson(JSON.stringify({ grouped_items: body.grouped_items ?? {} }));
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await enrichMiniDiagnosisAudio(
    parsed.rows.map((row) => ({
      step_index: row.step_index,
      task_type: row.task_type,
      content: row.content,
    })),
  );

  const { data: setRow, error: setErr } = await supabase
    .from("mini_diagnosis_sets")
    .upsert(
      [
        {
          name: internalName,
          internal_name: internalName,
          user_title: userTitle,
          is_active: false,
          created_by: userId,
        },
      ],
      { onConflict: "internal_name" },
    )
    .select("id")
    .single();
  if (setErr || !setRow) {
    return NextResponse.json({ error: setErr?.message ?? "Failed to create set" }, { status: 500 });
  }

  const { error: deactivateErr } = await supabase
    .from("mini_diagnosis_sets")
    .update({ is_active: false })
    .eq("id", setRow.id);
  if (deactivateErr) return NextResponse.json({ error: deactivateErr.message }, { status: 500 });

  const { error: deleteErr } = await supabase
    .from("mini_diagnosis_set_items")
    .delete()
    .eq("set_id", setRow.id);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  const rows = parsed.rows.map((row) => ({
    set_id: setRow.id,
    step_index: row.step_index,
    task_type: row.task_type,
    time_limit_sec: row.time_limit_sec,
    rest_after_step_sec: row.rest_after_step_sec ?? 0,
    is_ai_graded: row.is_ai_graded ?? false,
    content: row.content,
    correct_answer: row.correct_answer,
  }));
  const { error: insertErr } = await supabase.from("mini_diagnosis_set_items").insert(rows);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const { error: activateErr } = await supabase
    .from("mini_diagnosis_sets")
    .update({ is_active: true, user_title: userTitle, name: internalName, internal_name: internalName })
    .eq("id", setRow.id);
  if (activateErr) return NextResponse.json({ error: activateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, setId: setRow.id, savedRows: rows.length });
}
