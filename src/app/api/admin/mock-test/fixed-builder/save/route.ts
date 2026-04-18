import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { parseFixedMockUploadJson } from "@/lib/mock-test/fixed-upload";
import { synthesizeEnglishSpeechWithDeepgram } from "@/lib/deepgram-synthesize";
import { synthesizeEnglishSpeechWithGemini } from "@/lib/gemini-synthesize";
import { synthesizeEnglishSpeechWithInworld } from "@/lib/inworld-synthesize";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

async function ensureAdmin() {
  const access = await getAdminAccess();
  if (!access.ok) {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  if (access.simple) {
    return { supabase: createServiceRoleSupabase(), userId: null as string | null, simple: true };
  }
  const supabase = await createRouteHandlerSupabase();
  return { supabase, userId: access.adminUserId, simple: false };
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

async function enrichInteractiveConversationTts(
  rows: Array<{
    step_index: number;
    task_type: string;
    content: Record<string, unknown>;
    [k: string]: unknown;
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
    if (!(row.step_index === 13 && row.task_type === "interactive_conversation_mcq")) continue;
    const c = row.content ?? {};

    const scenarioAudioUrl = String(c.scenario_audio_url ?? "").trim();
    if (!scenarioAudioUrl) {
      const scenarioText = String(c.scenario_en ?? c.scenario ?? c.scenario_text ?? c.scenario_description ?? "").trim();
      if (scenarioText) {
        const audio = await resolveAudio(scenarioText);
        if (audio) c.scenario_audio_url = audio;
      }
    }

    const attachTurnAudio = async (raw: unknown): Promise<unknown> => {
      if (!Array.isArray(raw)) return raw;
      const out: unknown[] = [];
      for (const rowTurn of raw) {
        if (!rowTurn || typeof rowTurn !== "object") {
          out.push(rowTurn);
          continue;
        }
        const t = { ...(rowTurn as Record<string, unknown>) };
        const existing = String(t.question_audio_url ?? "").trim();
        if (!existing) {
          const q = String(t.question_en ?? "").trim();
          if (q) {
            const audio = await resolveAudio(q);
            if (audio) t.question_audio_url = audio;
          }
        }
        out.push(t);
      }
      return out;
    };

    c.turns = (await attachTurnAudio(c.turns)) as unknown;
    c.part_a_questions = (await attachTurnAudio(c.part_a_questions)) as unknown;
    c.part_b_questions = (await attachTurnAudio(c.part_b_questions)) as unknown;
    row.content = c;
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

  const parsed = parseFixedMockUploadJson(JSON.stringify({ grouped_items: body.grouped_items ?? {} }));
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await enrichInteractiveConversationTts(
    parsed.rows.map((r) => r as unknown as { step_index: number; task_type: string; content: Record<string, unknown> }),
  );

  const { data: setRow, error: setErr } = await supabase
    .from("mock_fixed_sets")
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
    .from("mock_fixed_sets")
    .update({ is_active: false })
    .eq("id", setRow.id);
  if (deactivateErr) {
    return NextResponse.json({ error: deactivateErr.message }, { status: 500 });
  }

  const { error: deleteErr } = await supabase.from("mock_fixed_set_items").delete().eq("set_id", setRow.id);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  const rows = parsed.rows.map((r) => ({
    set_id: setRow.id,
    step_index: r.step_index,
    task_type: r.task_type,
    time_limit_sec: r.time_limit_sec,
    rest_after_step_sec: r.rest_after_step_sec ?? 0,
    is_ai_graded: r.is_ai_graded ?? false,
    content: r.content,
    correct_answer: r.correct_answer,
  }));
  const { error: insertErr } = await supabase.from("mock_fixed_set_items").insert(rows);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const { error: activateErr } = await supabase
    .from("mock_fixed_sets")
    .update({ is_active: true, user_title: userTitle, name: internalName, internal_name: internalName })
    .eq("id", setRow.id);
  if (activateErr) return NextResponse.json({ error: activateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, setId: setRow.id, savedRows: rows.length });
}
