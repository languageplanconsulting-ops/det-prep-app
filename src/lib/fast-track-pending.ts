import "server-only";

import { randomInt } from "node:crypto";

import {
  sendFastTrackApprovedToStudent,
  sendFastTrackRequestToAdmin,
} from "@/lib/notifications";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { applyProfileVIPAfterGrant, normalizeEmail } from "@/lib/vip-access";

export type FastTrackPendingRow = {
  id: string;
  email: string;
  full_name: string | null;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  processed_at: string | null;
  grant_expires_at: string | null;
  access_password: string | null;
};

function generateAccessPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) {
    s += chars[randomInt(0, chars.length)]!;
  }
  return s;
}

export async function submitFastTrackRequest(
  emailRaw: string,
  fullNameRaw: string | null,
): Promise<
  { ok: true } | { ok: false; error: string } | { ok: true; alreadyPending: true }
> {
  const norm = normalizeEmail(emailRaw);
  if (!norm.includes("@")) {
    return { ok: false, error: "Invalid email." };
  }
  const fullName = fullNameRaw?.trim() || null;

  const supabase = createServiceRoleSupabase();

  const { data: dup } = await supabase
    .from("fast_track_pending_requests")
    .select("id")
    .eq("email", norm)
    .eq("status", "pending")
    .maybeSingle();

  if (dup) {
    return { ok: true, alreadyPending: true };
  }

  const submittedAt = new Date().toISOString();

  const { error } = await supabase.from("fast_track_pending_requests").insert({
    email: norm,
    full_name: fullName,
    status: "pending",
  });

  if (error) {
    console.error("[fast-track-pending] insert", error.message);
    return { ok: false, error: "Could not save your request. Try again later." };
  }

  await sendFastTrackRequestToAdmin({
    studentEmail: norm,
    studentName: fullName,
    submittedAtIso: submittedAt,
  });

  return { ok: true };
}

export async function listFastTrackPending(): Promise<FastTrackPendingRow[]> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("fast_track_pending_requests")
    .select(
      "id, email, full_name, submitted_at, status, processed_at, grant_expires_at, access_password",
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("[fast-track-pending] list", error.message);
    return [];
  }

  return (data ?? []) as FastTrackPendingRow[];
}

export async function approveFastTrackPending(
  id: string,
  adminId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleSupabase();
  const { data: row, error: fetchErr } = await supabase
    .from("fast_track_pending_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: "Request not found." };
  }
  if ((row.status as string) !== "pending") {
    return { ok: false, error: "This request was already processed." };
  }

  const norm = normalizeEmail(row.email as string);
  const submittedAt = new Date(row.submitted_at as string);
  const grantExpiresAt = new Date(submittedAt);
  grantExpiresAt.setMonth(grantExpiresAt.getMonth() + 6);
  const expiresIso = grantExpiresAt.toISOString();
  const password = generateAccessPassword();
  const fn = row.full_name as string | null;

  const notes = `Duolingo Fast Track (admin verified)${fn?.trim() ? ` — ${fn.trim()}` : ""}`;

  const { error: upsertError } = await supabase.from("vip_course_grants").upsert(
    {
      email: norm,
      granted_by: adminId,
      is_active: true,
      revoked_at: null,
      revoked_by: null,
      granted_at: new Date().toISOString(),
      notes,
      grant_expires_at: expiresIso,
    },
    { onConflict: "email" },
  );

  if (upsertError) {
    console.error("[fast-track-pending] upsert grant", upsertError.message);
    return { ok: false, error: upsertError.message };
  }

  const outcome = await applyProfileVIPAfterGrant(norm, password, {
    tierExpiresAt: expiresIso,
    skipNotificationEmail: true,
  });

  if (typeof outcome === "object" && outcome && "error" in outcome) {
    return { ok: false, error: outcome.error };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("fast_track_pending_requests")
    .update({
      status: "approved",
      processed_at: now,
      processed_by: adminId,
      grant_expires_at: expiresIso,
      access_password: password,
    })
    .eq("id", id);

  if (updErr) {
    console.error("[fast-track-pending] update pending", updErr.message);
    return { ok: false, error: updErr.message };
  }

  await sendFastTrackApprovedToStudent({
    to: norm,
    accessPassword: password,
    accessUntilIso: expiresIso,
  });

  return { ok: true };
}

export async function rejectFastTrackPending(
  id: string,
  adminId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleSupabase();
  const { data: row } = await supabase
    .from("fast_track_pending_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { ok: false, error: "Request not found." };
  if ((row.status as string) !== "pending") {
    return { ok: false, error: "This request was already processed." };
  }

  const { error } = await supabase
    .from("fast_track_pending_requests")
    .update({
      status: "rejected",
      processed_at: new Date().toISOString(),
      processed_by: adminId,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
