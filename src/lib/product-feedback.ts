import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type ProductFeedbackNote = {
  id: string;
  userId: string | null;
  promptKey: string;
  response: string;
  pagePath: string | null;
  createdAt: string;
};

export async function submitProductFeedback(params: {
  userId: string | null;
  promptKey: string;
  response: string;
  pagePath: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = params.response.trim();
  if (!response) {
    return { ok: false, error: "Response cannot be empty." };
  }
  if (response.length > 500) {
    return { ok: false, error: "Response must be 500 characters or fewer." };
  }

  const supabase = createServiceRoleSupabase();
  const { error } = await supabase.from("product_feedback_notes").insert({
    user_id: params.userId,
    prompt_key: params.promptKey,
    response,
    page_path: params.pagePath,
  });

  if (error) {
    console.error("[product-feedback] submit insert", error.message);
    return { ok: false, error: "Could not save your feedback. Please try again." };
  }

  return { ok: true };
}

export async function listRecentProductFeedback(
  limit = 100,
): Promise<{ deployed: boolean; rows: ProductFeedbackNote[] }> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("product_feedback_notes")
    .select("id, user_id, prompt_key, response, page_path, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    const notDeployed = /Could not find the table|does not exist|relation .* does not exist/i.test(
      error.message,
    );
    if (notDeployed) {
      return { deployed: false, rows: [] };
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    user_id: string | null;
    prompt_key: string;
    response: string;
    page_path: string | null;
    created_at: string;
  }>;

  return {
    deployed: true,
    rows: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      promptKey: row.prompt_key,
      response: row.response,
      pagePath: row.page_path,
      createdAt: row.created_at,
    })),
  };
}
