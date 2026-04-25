import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function ensureProfileForAuthUser(params: {
  userId: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  tier?: string | null;
  vipGrantedByCourse?: boolean | null;
  role?: string | null;
}) {
  const supabase = createServiceRoleSupabase();
  const normalizedEmail = normalizeEmail(params.email);
  const nextFullName = params.fullName?.trim() || null;
  const nextAvatarUrl = params.avatarUrl?.trim() || null;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const patch: Record<string, unknown> = {
      email: normalizedEmail,
      updated_at: new Date().toISOString(),
    };
    if (nextFullName && !existing.full_name) patch.full_name = nextFullName;
    if (nextAvatarUrl && !existing.avatar_url) patch.avatar_url = nextAvatarUrl;
    if (params.tier) patch.tier = params.tier;
    if (typeof params.vipGrantedByCourse === "boolean") {
      patch.vip_granted_by_course = params.vipGrantedByCourse;
    }
    if (params.role) patch.role = params.role;

    const { error: updateError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", params.userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { ...(existing as Record<string, unknown>), ...patch };
  }

  const insertRow = {
    id: params.userId,
    email: normalizedEmail,
    full_name: nextFullName,
    avatar_url: nextAvatarUrl,
    tier: params.tier ?? "free",
    vip_granted_by_course: params.vipGrantedByCourse ?? false,
    role: params.role ?? "user",
    updated_at: new Date().toISOString(),
  };

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .upsert(insertRow, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return created ?? insertRow;
}
