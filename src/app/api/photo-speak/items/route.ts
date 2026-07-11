import { NextResponse } from "next/server";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

export const dynamic = "force-dynamic";

const TASK_TYPES = new Set(["write_about_photo", "speak_about_photo"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const taskType = url.searchParams.get("taskType");
  if (!taskType || !TASK_TYPES.has(taskType)) {
    return NextResponse.json(
      { error: "taskType must be write_about_photo or speak_about_photo" },
      { status: 400 },
    );
  }

  const { supabase, user } = await getRequestAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: items, error } = await supabase
    .from("photo_speak_items")
    .select(
      "id, title_en, title_th, image_url, prompt_en, prompt_th, keywords, context_en, license, license_version, license_url, creator, attribution, landing_url, provider, sort_order",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: progress, error: progressError } = await supabase
    .from("photo_speak_progress")
    .select("item_id, latest_score160, best_score160, latest_attempt_id, attempt_count, updated_at")
    .eq("user_id", user.id)
    .eq("task_type", taskType);

  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 500 });
  }

  const progressByItem = new Map((progress ?? []).map((p) => [p.item_id, p]));
  const enriched = (items ?? []).map((it) => ({
    ...it,
    progress: progressByItem.get(it.id) ?? null,
  }));

  return NextResponse.json({ items: enriched });
}
