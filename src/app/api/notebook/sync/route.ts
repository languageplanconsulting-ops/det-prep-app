import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import type { NotebookEntry } from "@/types/writing";

function isNotebookEntryLike(o: unknown): o is NotebookEntry {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.source === "string" &&
    typeof r.titleEn === "string" &&
    typeof r.createdAt === "string"
  );
}

/**
 * Upsert one notebook card to Supabase (signed-in users). Enables admin to view learner notebooks.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      entry?: unknown;
    } | null;
    const entry = body?.entry;
    if (!isNotebookEntryLike(entry)) {
      return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("notebook_sync").upsert(
      {
        user_id: user.id,
        client_entry_id: entry.id,
        payload: entry as unknown as Record<string, unknown>,
        updated_at: now,
      },
      { onConflict: "user_id,client_entry_id" },
    );

    if (error) {
      console.error("[notebook/sync] upsert", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[notebook/sync] POST", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

/**
 * Batch upsert (backfill local notebook to server). Max 200 entries per request.
 */
export async function PUT(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      entries?: unknown;
    } | null;
    const raw = body?.entries;
    if (!Array.isArray(raw) || raw.length > 200) {
      return NextResponse.json(
        { error: "Invalid entries (max 200)" },
        { status: 400 },
      );
    }

    const entries = raw.filter(isNotebookEntryLike);
    if (entries.length === 0) {
      return NextResponse.json({ ok: true, synced: 0 });
    }

    const now = new Date().toISOString();
    const rows = entries.map((entry) => ({
      user_id: user.id,
      client_entry_id: entry.id,
      payload: entry as unknown as Record<string, unknown>,
      updated_at: now,
    }));

    const { error } = await supabase.from("notebook_sync").upsert(rows, {
      onConflict: "user_id,client_entry_id",
    });

    if (error) {
      console.error("[notebook/sync] batch", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, synced: entries.length });
  } catch (e) {
    console.error("[notebook/sync] PUT", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const clientEntryId = url.searchParams.get("clientEntryId")?.trim();
    if (!clientEntryId) {
      return NextResponse.json({ error: "Missing clientEntryId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("notebook_sync")
      .delete()
      .eq("user_id", user.id)
      .eq("client_entry_id", clientEntryId);

    if (error) {
      console.error("[notebook/sync] delete", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[notebook/sync] DELETE", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
